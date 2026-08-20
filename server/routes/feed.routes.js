const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { optionalAuthenticateToken } = require('../middleware/auth');

// RF005 – Feed de Início Personalizado e Recomendações em Tempo Real
router.get('/', optionalAuthenticateToken, (req, res) => {
  try {
    const { topico, limit = 40, offset = 0 } = req.query;

    const isModerator = req.user && req.user.role === 'moderador';
    const hideFilter = isModerator ? '' : 'AND p.oculto_preventivo = 0';

    // Se o usuário selecionou um tópico de interesse específico no topo do feed
    if (topico && topico !== 'Tudo' && topico !== 'Todos') {
      const pins = db.prepare(`
        SELECT p.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto, u.tipo_conta as autor_tipo_conta,
               (SELECT COUNT(*) FROM curtidas WHERE pin_id = p.id) as curtidas_count,
               (SELECT COUNT(*) FROM comentarios WHERE pin_id = p.id) as comentarios_count,
               (SELECT COUNT(*) FROM pasta_pins WHERE pin_id = p.id) as saves_count
        FROM pins p
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE u.status_conta != 'banida' AND u.status_conta != 'suspensa' ${hideFilter}
          AND (p.categoria = ? OR p.tags LIKE ? OR p.titulo LIKE ?)
        ORDER BY p.data_criacao DESC
        LIMIT ? OFFSET ?
      `).all(topico, `%${topico}%`, `%${topico}%`, Number(limit), Number(offset));

      const formatted = pins.map(p => ({
        ...p,
        tags: JSON.parse(p.tags || '[]'),
        curtido_pelo_usuario: req.user ? !!db.prepare('SELECT id FROM curtidas WHERE pin_id = ? AND usuario_id = ?').get(p.id, req.user.id) : false,
        salvo_pelo_usuario: req.user ? !!db.prepare('SELECT pp.id FROM pasta_pins pp JOIN pastas past ON pp.pasta_id = past.id WHERE pp.pin_id = ? AND past.usuario_id = ?').get(p.id, req.user.id) : false
      }));

      return res.json({ feed: formatted, topicoSelecionado: topico, total: formatted.length });
    }

    // Se usuário NÃO autenticado (Visitante) -> Feed de Descoberta Geral com curadoria
    if (!req.user) {
      const pins = db.prepare(`
        SELECT p.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto, u.tipo_conta as autor_tipo_conta,
               (SELECT COUNT(*) FROM curtidas WHERE pin_id = p.id) as curtidas_count,
               (SELECT COUNT(*) FROM comentarios WHERE pin_id = p.id) as comentarios_count,
               (SELECT COUNT(*) FROM pasta_pins WHERE pin_id = p.id) as saves_count
        FROM pins p
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE u.status_conta != 'banida' AND u.status_conta != 'suspensa' AND p.oculto_preventivo = 0
        ORDER BY p.data_criacao DESC
        LIMIT ? OFFSET ?
      `).all(Number(limit), Number(offset));

      const formatted = pins.map(p => ({
        ...p,
        tags: JSON.parse(p.tags || '[]'),
        curtido_pelo_usuario: false,
        salvo_pelo_usuario: false
      }));

      return res.json({ feed: formatted, modo: 'visitante', total: formatted.length });
    }

    // Usuário Autenticado -> Motor de Recomendação Personalizada (RF005)
    const userId = req.user.id;

    // 1. Obter contas seguidas
    const seguidos = db.prepare('SELECT seguido_id FROM seguidores WHERE seguidor_id = ?').all(userId).map(s => s.seguido_id);

    // 2. Obter categorias e tags dos Pins salvos recentemente pelo usuário
    const savedCategories = db.prepare(`
      SELECT p.categoria, p.tags
      FROM pasta_pins pp
      JOIN pastas past ON pp.pasta_id = past.id
      JOIN pins p ON pp.pin_id = p.id
      WHERE past.usuario_id = ?
      ORDER BY pp.data_salvo DESC LIMIT 20
    `).all(userId);

    const userPreferredCategories = new Set(savedCategories.map(s => s.categoria));
    const userPreferredTags = new Set();
    savedCategories.forEach(s => {
      try {
        const tags = JSON.parse(s.tags || '[]');
        tags.forEach(t => userPreferredTags.add(t.toLowerCase()));
      } catch (e) {}
    });

    // 3. Obter tópicos de interesse do perfil do usuário
    const userTopics = JSON.parse(req.user.topicos_interesse || '[]');
    userTopics.forEach(t => userPreferredCategories.add(t));

    // 4. Obter termos de pesquisa recentes
    const recentSearches = db.prepare('SELECT termo FROM historico_buscas WHERE usuario_id = ? ORDER BY data_busca DESC LIMIT 10').all(userId).map(h => h.termo.toLowerCase());

    // 5. Buscar candidatos a Pins no banco
    const candidatePins = db.prepare(`
      SELECT p.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto, u.tipo_conta as autor_tipo_conta,
             (SELECT COUNT(*) FROM curtidas WHERE pin_id = p.id) as curtidas_count,
             (SELECT COUNT(*) FROM comentarios WHERE pin_id = p.id) as comentarios_count,
             (SELECT COUNT(*) FROM pasta_pins WHERE pin_id = p.id) as saves_count
      FROM pins p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE u.status_conta = 'ativa' ${hideFilter}
      ORDER BY p.data_criacao DESC
      LIMIT 150
    `).all();

    // 6. Calcular score de afinidade para cada Pin
    const scoredPins = candidatePins.map(pin => {
      let score = 10; // score base
      const pinTags = (JSON.parse(pin.tags || '[]')).map(t => t.toLowerCase());

      // Boost: Criado por conta seguida (+50 pts)
      if (seguidos.includes(pin.usuario_id)) {
        score += 50;
      }

      // Boost: Categoria de interesse ou salva (+30 pts)
      if (userPreferredCategories.has(pin.categoria)) {
        score += 30;
      }

      // Boost: Tags salvas anteriormente (+15 pts por tag)
      pinTags.forEach(tag => {
        if (userPreferredTags.has(tag)) score += 15;
      });

      // Boost: Bate com pesquisas recentes (+25 pts)
      recentSearches.forEach(search => {
        if (pin.titulo.toLowerCase().includes(search) || pinTags.includes(search) || pin.categoria.toLowerCase().includes(search)) {
          score += 25;
        }
      });

      // Boost por engajamento geral (curtidas e saves)
      score += Math.min(pin.curtidas_count * 2 + pin.saves_count * 3, 30);

      // Verificação se usuário curtiu ou salvou
      const liked = db.prepare('SELECT id FROM curtidas WHERE pin_id = ? AND usuario_id = ?').get(pin.id, userId);
      const saved = db.prepare(`
        SELECT pp.id FROM pasta_pins pp 
        JOIN pastas past ON pp.pasta_id = past.id 
        WHERE pp.pin_id = ? AND past.usuario_id = ?
      `).get(pin.id, userId);

      return {
        ...pin,
        score,
        tags: JSON.parse(pin.tags || '[]'),
        curtido_pelo_usuario: !!liked,
        salvo_pelo_usuario: !!saved
      };
    });

    // Ordenar pelo score de recomendação personalizado
    scoredPins.sort((a, b) => b.score - a.score);

    const paginated = scoredPins.slice(Number(offset), Number(offset) + Number(limit));

    return res.json({
      feed: paginated,
      modo: 'personalizado',
      userTopics,
      total: scoredPins.length
    });
  } catch (error) {
    console.error('Erro ao gerar feed:', error);
    return res.status(500).json({ error: 'Erro ao carregar o feed de recomendações.' });
  }
});

module.exports = router;
