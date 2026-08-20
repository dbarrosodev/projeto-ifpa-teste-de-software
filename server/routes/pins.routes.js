const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { upload, processMedia } = require('../middleware/upload');

// RF002 – Criar um novo Pin (com upload de imagem/vídeo ou URL externa)
router.post('/', authenticateToken, upload.single('midia'), async (req, res) => {
  try {
    const { 
      titulo, 
      descricao = '', 
      textoAlternativo = '', 
      linkDestino = '', 
      categoria = 'Geral', 
      tags = '[]',
      pastaId,
      midiaUrl: inputMidiaUrl,
      tipoMidia: inputTipoMidia = 'imagem'
    } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: 'O título do Pin é obrigatório.' });
    }

    let midiaUrl = inputMidiaUrl;
    let tipoMidia = inputTipoMidia;
    let corDominante = '#e60023';

    if (req.file) {
      const processed = await processMedia(req.file);
      if (processed) {
        midiaUrl = processed.url;
        tipoMidia = processed.tipoMidia;
        corDominante = processed.corDominante;
      }
    }

    if (!midiaUrl) {
      return res.status(400).json({ error: 'É necessário fazer upload de uma mídia (imagem/vídeo) ou fornecer uma URL válida.' });
    }

    const pinId = uuidv4();
    const dataCriacao = new Date().toISOString();
    const parsedTags = typeof tags === 'string' ? tags : JSON.stringify(tags);

    // Visual features for Lens search
    const visualKeywords = [
      titulo.toLowerCase(), 
      categoria.toLowerCase(), 
      ...(Array.isArray(tags) ? tags : JSON.parse(parsedTags || '[]')).map(t => t.toLowerCase())
    ];

    db.prepare(`
      INSERT INTO pins (
        id, usuario_id, titulo, descricao, midia_url, tipo_midia, 
        texto_alternativo, link_destino, categoria, tags, cor_dominante, 
        visual_features, denuncias_count, oculto_preventivo, data_criacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `).run(
      pinId,
      req.user.id,
      titulo.trim(),
      descricao.trim(),
      midiaUrl,
      tipoMidia,
      textoAlternativo.trim(),
      linkDestino.trim(),
      categoria,
      parsedTags,
      corDominante,
      JSON.stringify(visualKeywords),
      dataCriacao
    );

    // Se o usuário selecionou uma pasta ao criar o Pin
    if (pastaId) {
      const pasta = db.prepare('SELECT id, usuario_id FROM pastas WHERE id = ?').get(pastaId);
      if (pasta && (pasta.usuario_id === req.user.id || req.user.role === 'moderador')) {
        db.prepare(`
          INSERT OR IGNORE INTO pasta_pins (id, pasta_id, pin_id, secao, data_salvo)
          VALUES (?, ?, ?, '', ?)
        `).run(uuidv4(), pastaId, pinId, dataCriacao);
      }
    }

    // RF007 - Notificar seguidores do autor sobre o novo Pin publicado
    const seguidores = db.prepare('SELECT seguidor_id FROM seguidores WHERE seguido_id = ?').all(req.user.id);
    const insertNotif = db.prepare(`
      INSERT INTO notificacoes (id, usuario_id, remetente_id, tipo, mensagem, link_alvo, lida, data_criacao)
      VALUES (?, ?, ?, 'novo_pin', ?, ?, 0, ?)
    `);

    for (const seg of seguidores) {
      insertNotif.run(
        uuidv4(),
        seg.seguidor_id,
        req.user.id,
        `${req.user.nome} publicou uma nova ideia: "${titulo}"`,
        `/pin/${pinId}`,
        dataCriacao
      );
    }

    const createdPin = db.prepare('SELECT * FROM pins WHERE id = ?').get(pinId);

    return res.status(201).json({
      message: 'Pin criado com sucesso!',
      pin: {
        ...createdPin,
        tags: JSON.parse(createdPin.tags || '[]'),
        visual_features: JSON.parse(createdPin.visual_features || '[]')
      }
    });
  } catch (error) {
    console.error('Erro ao criar Pin:', error);
    return res.status(500).json({ error: 'Erro interno ao criar Pin.' });
  }
});

// RF002 & RF005 – Listar Pins (com filtros, paginação e ocultação preventiva RNE003)
router.get('/', optionalAuthenticateToken, (req, res) => {
  try {
    const { categoria, autorId, limit = 50, offset = 0, tag } = req.query;

    let query = `
      SELECT p.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto, u.tipo_conta as autor_tipo_conta,
             (SELECT COUNT(*) FROM curtidas WHERE pin_id = p.id) as curtidas_count,
             (SELECT COUNT(*) FROM comentarios WHERE pin_id = p.id) as comentarios_count,
             (SELECT COUNT(*) FROM pasta_pins WHERE pin_id = p.id) as saves_count
      FROM pins p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE u.status_conta = 'ativa'
    `;
    const params = [];

    // Ocultar preventivamente pins com alto número de denúncias (RNE003) a menos que seja moderador
    if (!req.user || req.user.role !== 'moderador') {
      query += ` AND p.oculto_preventivo = 0`;
    }

    if (categoria && categoria !== 'Todas' && categoria !== 'Tudo') {
      query += ` AND p.categoria = ?`;
      params.push(categoria);
    }

    if (autorId) {
      query += ` AND p.usuario_id = ?`;
      params.push(autorId);
    }

    if (tag) {
      query += ` AND p.tags LIKE ?`;
      params.push(`%${tag}%`);
    }

    query += ` ORDER BY p.data_criacao DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const pins = db.prepare(query).all(...params);

    // Se usuário autenticado, verificar se ele curtiu ou salvou cada pin
    const formattedPins = pins.map(pin => {
      let isLiked = false;
      let isSaved = false;

      if (req.user) {
        const liked = db.prepare('SELECT id FROM curtidas WHERE pin_id = ? AND usuario_id = ?').get(pin.id, req.user.id);
        isLiked = !!liked;

        const saved = db.prepare(`
          SELECT pp.id FROM pasta_pins pp 
          JOIN pastas past ON pp.pasta_id = past.id 
          WHERE pp.pin_id = ? AND past.usuario_id = ?
        `).get(pin.id, req.user.id);
        isSaved = !!saved;
      }

      return {
        ...pin,
        tags: JSON.parse(pin.tags || '[]'),
        visual_features: JSON.parse(pin.visual_features || '[]'),
        curtido_pelo_usuario: isLiked,
        salvo_pelo_usuario: isSaved
      };
    });

    return res.json({ pins: formattedPins, total: formattedPins.length });
  } catch (error) {
    console.error('Erro ao listar pins:', error);
    return res.status(500).json({ error: 'Erro ao listar pins.' });
  }
});

// RF002 – Obter detalhes de um Pin por ID
router.get('/:id', optionalAuthenticateToken, (req, res) => {
  try {
    const pin = db.prepare(`
      SELECT p.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto, u.tipo_conta as autor_tipo_conta, u.id as autor_id,
             (SELECT COUNT(*) FROM curtidas WHERE pin_id = p.id) as curtidas_count,
             (SELECT COUNT(*) FROM comentarios WHERE pin_id = p.id) as comentarios_count,
             (SELECT COUNT(*) FROM pasta_pins WHERE pin_id = p.id) as saves_count
      FROM pins p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!pin) {
      return res.status(404).json({ error: 'Pin não encontrado.' });
    }

    if (pin.oculto_preventivo === 1 && (!req.user || (req.user.role !== 'moderador' && req.user.id !== pin.usuario_id))) {
      return res.status(403).json({ error: 'Este Pin está temporariamente oculto para análise de moderação (RNE003).' });
    }

    // Comentários do Pin (RF006) com suporte a respostas aninhadas
    const allComments = db.prepare(`
      SELECT c.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto
      FROM comentarios c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.pin_id = ?
      ORDER BY c.data_criacao ASC
    `).all(pin.id);

    // Estruturar comentários principais e suas respostas
    const commentMap = {};
    const topLevelComments = [];

    allComments.forEach(c => {
      c.respostas = [];
      commentMap[c.id] = c;
    });

    allComments.forEach(c => {
      if (c.parent_id && commentMap[c.parent_id]) {
        commentMap[c.parent_id].respostas.push(c);
      } else {
        topLevelComments.push(c);
      }
    });

    let isLiked = false;
    let isSaved = false;
    let userBoards = [];

    if (req.user) {
      const liked = db.prepare('SELECT id FROM curtidas WHERE pin_id = ? AND usuario_id = ?').get(pin.id, req.user.id);
      isLiked = !!liked;

      const saved = db.prepare(`
        SELECT pp.id FROM pasta_pins pp 
        JOIN pastas past ON pp.pasta_id = past.id 
        WHERE pp.pin_id = ? AND past.usuario_id = ?
      `).get(pin.id, req.user.id);
      isSaved = !!saved;

      // Pastas do usuário atual para salvar
      userBoards = db.prepare('SELECT id, titulo, visibilidade FROM pastas WHERE usuario_id = ? ORDER BY data_criacao DESC').all(req.user.id);
    }

    return res.json({
      pin: {
        ...pin,
        tags: JSON.parse(pin.tags || '[]'),
        visual_features: JSON.parse(pin.visual_features || '[]'),
        curtido_pelo_usuario: isLiked,
        salvo_pelo_usuario: isSaved,
        link_responsabilidade_aviso: 'Os links externos inseridos são de responsabilidade do autor (RNE004).'
      },
      comentarios: topLevelComments,
      userBoards
    });
  } catch (error) {
    console.error('Erro ao buscar pin:', error);
    return res.status(500).json({ error: 'Erro ao buscar detalhes do Pin.' });
  }
});

// RF002 – Editar metadados do Pin (Apenas o autor original ou Moderador)
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const pin = db.prepare('SELECT * FROM pins WHERE id = ?').get(req.params.id);
    if (!pin) {
      return res.status(404).json({ error: 'Pin não encontrado.' });
    }

    // Regra de Permissão
    if (pin.usuario_id !== req.user.id && req.user.role !== 'moderador') {
      return res.status(403).json({ error: 'Apenas o autor original do Pin ou a moderação podem editá-lo.' });
    }

    const { titulo, descricao, textoAlternativo, linkDestino, categoria, tags } = req.body;

    const updatedTitulo = titulo !== undefined ? titulo.trim() : pin.titulo;
    const updatedDescricao = descricao !== undefined ? descricao.trim() : pin.descricao;
    const updatedAlt = textoAlternativo !== undefined ? textoAlternativo.trim() : pin.texto_alternativo;
    const updatedLink = linkDestino !== undefined ? linkDestino.trim() : pin.link_destino;
    const updatedCategoria = categoria !== undefined ? categoria : pin.categoria;
    let updatedTags = pin.tags;

    if (tags !== undefined) {
      updatedTags = typeof tags === 'string' ? tags : JSON.stringify(tags);
    }

    db.prepare(`
      UPDATE pins 
      SET titulo = ?, descricao = ?, texto_alternativo = ?, link_destino = ?, categoria = ?, tags = ?
      WHERE id = ?
    `).run(updatedTitulo, updatedDescricao, updatedAlt, updatedLink, updatedCategoria, updatedTags, pin.id);

    const updated = db.prepare('SELECT * FROM pins WHERE id = ?').get(pin.id);

    return res.json({
      message: 'Pin atualizado com sucesso!',
      pin: {
        ...updated,
        tags: JSON.parse(updated.tags || '[]')
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar pin:', error);
    return res.status(500).json({ error: 'Erro ao atualizar Pin.' });
  }
});

// RF002 & RNE002 – Exclusão Definitiva do Pin
// Regra RNE002: Somente o autor original ou a equipe de moderação pode excluí-lo definitivamente.
// Caso o Pin original seja removido, todas as referências salvas em pastas também deixam de ser exibidas.
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const pin = db.prepare('SELECT * FROM pins WHERE id = ?').get(req.params.id);
    if (!pin) {
      return res.status(404).json({ error: 'Pin não encontrado.' });
    }

    // Regra RNE002: Somente o autor original ou moderador
    if (pin.usuario_id !== req.user.id && req.user.role !== 'moderador') {
      return res.status(403).json({ 
        error: 'Permissão negada. Um Pin só pode ser excluído definitivamente pelo autor original ou pela moderação (Regra RNE002).' 
      });
    }

    // Ao deletar o pin da tabela pins, as chaves estrangeiras ON DELETE CASCADE
    // removem automaticamente todas as referências em pasta_pins, curtidas, comentarios e denuncias!
    db.prepare('DELETE FROM pins WHERE id = ?').run(pin.id);

    return res.json({
      message: 'Pin excluído definitivamente com sucesso. Todas as referências em pastas foram removidas (RNE002).'
    });
  } catch (error) {
    console.error('Erro ao excluir pin:', error);
    return res.status(500).json({ error: 'Erro ao excluir Pin.' });
  }
});

module.exports = router;
