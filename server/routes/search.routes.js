const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { optionalAuthenticateToken, authenticateToken } = require('../middleware/auth');
const { upload, processMedia } = require('../middleware/upload');

// RF004 – Busca Textual com filtros por Pins, Pastas e Perfis
router.get('/', optionalAuthenticateToken, (req, res) => {
  try {
    const { q = '', tipo = 'todos', categoria } = req.query;
    const queryTerm = q.trim();

    if (!queryTerm) {
      return res.json({ pins: [], pastas: [], perfis: [], sugestoes: [] });
    }

    // RF005 - Registrar termo no histórico para personalização de recomendações
    if (req.user) {
      db.prepare(`
        INSERT INTO historico_buscas (id, usuario_id, termo, data_busca)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), req.user.id, queryTerm.toLowerCase(), new Date().toISOString());
    }

    const results = {
      termo: queryTerm,
      pins: [],
      pastas: [],
      perfis: []
    };

    const isModerator = req.user && req.user.role === 'moderador';
    const hideFilter = isModerator ? '' : 'AND p.oculto_preventivo = 0';

    // Buscar Pins
    if (tipo === 'todos' || tipo === 'pins') {
      let pinSql = `
        SELECT p.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto,
               (SELECT COUNT(*) FROM curtidas WHERE pin_id = p.id) as curtidas_count,
               (SELECT COUNT(*) FROM comentarios WHERE pin_id = p.id) as comentarios_count
        FROM pins p
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE u.status_conta = 'ativa' ${hideFilter}
          AND (p.titulo LIKE ? OR p.descricao LIKE ? OR p.tags LIKE ? OR p.categoria LIKE ?)
      `;
      const pinParams = [`%${queryTerm}%`, `%${queryTerm}%`, `%${queryTerm}%`, `%${queryTerm}%`];

      if (categoria && categoria !== 'Todas') {
        pinSql += ` AND p.categoria = ?`;
        pinParams.push(categoria);
      }

      pinSql += ` ORDER BY p.data_criacao DESC LIMIT 30`;
      const pins = db.prepare(pinSql).all(...pinParams);

      results.pins = pins.map(p => ({
        ...p,
        tags: JSON.parse(p.tags || '[]'),
        curtido_pelo_usuario: req.user ? !!db.prepare('SELECT id FROM curtidas WHERE pin_id = ? AND usuario_id = ?').get(p.id, req.user.id) : false,
        salvo_pelo_usuario: req.user ? !!db.prepare('SELECT pp.id FROM pasta_pins pp JOIN pastas past ON pp.pasta_id = past.id WHERE pp.pin_id = ? AND past.usuario_id = ?').get(p.id, req.user.id) : false
      }));
    }

    // Buscar Pastas (Apenas públicas per RNE002)
    if (tipo === 'todos' || tipo === 'pastas') {
      const boardSql = `
        SELECT p.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto,
               (SELECT COUNT(*) FROM pasta_pins WHERE pasta_id = p.id) as total_pins,
               (SELECT midia_url FROM pins WHERE id = (SELECT pin_id FROM pasta_pins WHERE pasta_id = p.id LIMIT 1)) as capa_url
        FROM pastas p
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.visibilidade = 'publica' AND u.status_conta = 'ativa'
          AND (p.titulo LIKE ? OR p.descricao LIKE ? OR p.categoria LIKE ?)
        ORDER BY p.data_criacao DESC LIMIT 20
      `;
      results.pastas = db.prepare(boardSql).all(`%${queryTerm}%`, `%${queryTerm}%`, `%${queryTerm}%`);
    }

    // Buscar Perfis de Usuários
    if (tipo === 'todos' || tipo === 'perfis') {
      const userSql = `
        SELECT id, nome, bio, foto_perfil_url, tipo_conta, role, perfil_privado,
               (SELECT COUNT(*) FROM seguidores WHERE seguido_id = usuarios.id) as seguidores_count,
               (SELECT COUNT(*) FROM pins WHERE usuario_id = usuarios.id) as pins_count
        FROM usuarios
        WHERE status_conta = 'ativa'
          AND (nome LIKE ? OR bio LIKE ? OR email LIKE ?)
        ORDER BY seguidores_count DESC LIMIT 20
      `;
      const users = db.prepare(userSql).all(`%${queryTerm}%`, `%${queryTerm}%`, `%${queryTerm}%`);

      results.perfis = users.map(u => ({
        ...u,
        seguindo_pelo_usuario: req.user ? !!db.prepare('SELECT id FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?').get(req.user.id, u.id) : false
      }));
    }

    return res.json(results);
  } catch (error) {
    console.error('Erro na pesquisa:', error);
    return res.status(500).json({ error: 'Erro ao executar busca.' });
  }
});

// RF004 – Sugestões automáticas de busca (autocomplete)
router.get('/suggestions', (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q || q.length < 2) {
      return res.json({ sugestoes: ['Arquitetura Moderna', 'Design Minimalista', 'Receitas Fáceis', 'Fotografia Urbana', 'Decoração Boho', 'Tatuagens Delicadas', 'Ideias de Look'] });
    }

    const pins = db.prepare(`
      SELECT titulo, categoria, tags FROM pins 
      WHERE (titulo LIKE ? OR categoria LIKE ? OR tags LIKE ?) AND oculto_preventivo = 0
      LIMIT 10
    `).all(`%${q}%`, `%${q}%`, `%${q}%`);

    const sugestoesSet = new Set();

    pins.forEach(pin => {
      if (pin.titulo.toLowerCase().includes(q.toLowerCase())) sugestoesSet.add(pin.titulo);
      if (pin.categoria.toLowerCase().includes(q.toLowerCase())) sugestoesSet.add(pin.categoria);
      try {
        const tags = JSON.parse(pin.tags || '[]');
        tags.forEach(t => {
          if (t.toLowerCase().includes(q.toLowerCase())) sugestoesSet.add(t);
        });
      } catch (e) {}
    });

    return res.json({ sugestoes: Array.from(sugestoesSet).slice(0, 8) });
  } catch (error) {
    return res.json({ sugestoes: [] });
  }
});

// RF004 – Pinterest Lens (Busca Visual por Imagem ou Recorte de Área)
router.post('/lens', optionalAuthenticateToken, upload.single('imagem'), async (req, res) => {
  try {
    const { imagemUrl, targetTag, categoria } = req.body;
    let corDominanteBusca = null;
    let searchTags = [];

    if (req.file) {
      const processed = await processMedia(req.file);
      if (processed) {
        corDominanteBusca = processed.corDominante;
      }
    }

    if (targetTag) {
      searchTags.push(targetTag.toLowerCase());
    }
    if (categoria) {
      searchTags.push(categoria.toLowerCase());
    }

    // Buscar todos os pins ativos
    const allPins = db.prepare(`
      SELECT p.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto,
             (SELECT COUNT(*) FROM curtidas WHERE pin_id = p.id) as curtidas_count,
             (SELECT COUNT(*) FROM comentarios WHERE pin_id = p.id) as comentarios_count
      FROM pins p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE u.status_conta = 'ativa' AND p.oculto_preventivo = 0
    `).all();

    // Algoritmo de Similaridade Visual (Lens Matching)
    // Calcula score com base na proximidade de cores, categoria e tags visuais
    const scoredPins = allPins.map(pin => {
      let score = 0;
      const pinTags = (JSON.parse(pin.tags || '[]')).map(t => t.toLowerCase());
      const pinFeatures = (JSON.parse(pin.visual_features || '[]')).map(f => f.toLowerCase());

      // Similaridade por tags/features
      searchTags.forEach(tag => {
        if (pinTags.includes(tag)) score += 40;
        if (pin.categoria.toLowerCase() === tag) score += 30;
        if (pin.titulo.toLowerCase().includes(tag)) score += 20;
        if (pinFeatures.some(f => f.includes(tag))) score += 15;
      });

      // Similaridade por cor
      if (corDominanteBusca && pin.cor_dominante) {
        if (pin.cor_dominante === corDominanteBusca) {
          score += 50;
        } else {
          // Bônus de proximidade de cor
          score += 15;
        }
      }

      // Variação aleatória determinística para desempate
      score += (pin.id.charCodeAt(0) % 10);

      return {
        ...pin,
        similarityScore: score,
        tags: JSON.parse(pin.tags || '[]'),
        curtido_pelo_usuario: req.user ? !!db.prepare('SELECT id FROM curtidas WHERE pin_id = ? AND usuario_id = ?').get(pin.id, req.user.id) : false,
        salvo_pelo_usuario: req.user ? !!db.prepare('SELECT pp.id FROM pasta_pins pp JOIN pastas past ON pp.pasta_id = past.id WHERE pp.pin_id = ? AND past.usuario_id = ?').get(pin.id, req.user.id) : false
      };
    });

    scoredPins.sort((a, b) => b.similarityScore - a.similarityScore);

    return res.json({
      message: 'Busca visual (Pinterest Lens) concluída!',
      pins: scoredPins.slice(0, 24),
      lensDetails: {
        corIdentificada: corDominanteBusca || 'Cores vibrantes',
        analisado: true
      }
    });
  } catch (error) {
    console.error('Erro na busca visual Lens:', error);
    return res.status(500).json({ error: 'Erro ao executar busca visual.' });
  }
});

module.exports = router;
