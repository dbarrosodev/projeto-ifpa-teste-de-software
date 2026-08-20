const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { upload, processMedia } = require('../middleware/upload');

// RF006 – Curtir / Descurtir um Pin (Toggle Like)
router.post('/pins/:id/like', authenticateToken, (req, res) => {
  try {
    const pinId = req.params.id;
    const userId = req.user.id;

    const pin = db.prepare('SELECT id, titulo, usuario_id FROM pins WHERE id = ?').get(pinId);
    if (!pin) {
      return res.status(404).json({ error: 'Pin não encontrado.' });
    }

    const existingLike = db.prepare('SELECT id FROM curtidas WHERE pin_id = ? AND usuario_id = ?').get(pinId, userId);

    if (existingLike) {
      db.prepare('DELETE FROM curtidas WHERE id = ?').run(existingLike.id);
      const totalLikes = db.prepare('SELECT COUNT(*) as count FROM curtidas WHERE pin_id = ?').get(pinId).count;
      return res.json({ liked: false, totalLikes, message: 'Curtida removida.' });
    } else {
      const likeId = uuidv4();
      const dataCriacao = new Date().toISOString();

      db.prepare('INSERT INTO curtidas (id, pin_id, usuario_id, data_criacao) VALUES (?, ?, ?, ?)').run(likeId, pinId, userId, dataCriacao);

      // RF007 - Notificar autor do Pin se não for ele mesmo
      if (pin.usuario_id !== userId) {
        db.prepare(`
          INSERT INTO notificacoes (id, usuario_id, remetente_id, tipo, mensagem, link_alvo, lida, data_criacao)
          VALUES (?, ?, ?, 'curtida', ?, ?, 0, ?)
        `).run(
          uuidv4(),
          pin.usuario_id,
          userId,
          `${req.user.nome} curtiu seu Pin: "${pin.titulo}"`,
          `/pin/${pin.id}`,
          dataCriacao
        );
      }

      const totalLikes = db.prepare('SELECT COUNT(*) as count FROM curtidas WHERE pin_id = ?').get(pinId).count;
      return res.json({ liked: true, totalLikes, message: 'Pin curtido com sucesso!' });
    }
  } catch (error) {
    console.error('Erro ao curtir pin:', error);
    return res.status(500).json({ error: 'Erro ao processar curtida.' });
  }
});

// RF006 – Adicionar Comentário em um Pin (com suporte a texto ou imagem)
router.post('/pins/:id/comments', authenticateToken, upload.single('imagem'), async (req, res) => {
  try {
    const pinId = req.params.id;
    const { texto, parentId, parent_id } = req.body;
    const parentCommentId = parentId || parent_id || null;
    let imagemUrl = '';

    if (!texto && !req.file) {
      return res.status(400).json({ error: 'O comentário deve conter texto ou uma imagem.' });
    }

    const pin = db.prepare('SELECT id, titulo, usuario_id FROM pins WHERE id = ?').get(pinId);
    if (!pin) {
      return res.status(404).json({ error: 'Pin não encontrado.' });
    }

    if (req.file) {
      const processed = await processMedia(req.file);
      if (processed) {
        imagemUrl = processed.url;
      }
    }

    const commentId = uuidv4();
    const dataCriacao = new Date().toISOString();

    db.prepare(`
      INSERT INTO comentarios (id, pin_id, usuario_id, parent_id, texto, imagem_url, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(commentId, pinId, req.user.id, parentCommentId, (texto || '').trim(), imagemUrl, dataCriacao);

    // RF007 - Notificar autor do comentário original ou do Pin
    if (parentCommentId) {
      const parentComment = db.prepare('SELECT usuario_id FROM comentarios WHERE id = ?').get(parentCommentId);
      if (parentComment && parentComment.usuario_id !== req.user.id) {
        db.prepare(`
          INSERT INTO notificacoes (id, usuario_id, remetente_id, tipo, mensagem, link_alvo, lida, data_criacao)
          VALUES (?, ?, ?, 'comentario', ?, ?, 0, ?)
        `).run(
          uuidv4(),
          parentComment.usuario_id,
          req.user.id,
          `${req.user.nome} respondeu ao seu comentário: "${texto ? (texto.length > 40 ? texto.substring(0, 40) + '...' : texto) : 'Enviou uma imagem'}"`,
          `/pin/${pin.id}`,
          dataCriacao
        );
      }
    } else if (pin.usuario_id !== req.user.id) {
      db.prepare(`
        INSERT INTO notificacoes (id, usuario_id, remetente_id, tipo, mensagem, link_alvo, lida, data_criacao)
        VALUES (?, ?, ?, 'comentario', ?, ?, 0, ?)
      `).run(
        uuidv4(),
        pin.usuario_id,
        req.user.id,
        `${req.user.nome} comentou no seu Pin: "${texto ? (texto.length > 40 ? texto.substring(0, 40) + '...' : texto) : 'Enviou uma imagem'}"`,
        `/pin/${pin.id}`,
        dataCriacao
      );
    }

    const createdComment = db.prepare(`
      SELECT c.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto
      FROM comentarios c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.id = ?
    `).get(commentId);

    return res.status(201).json({
      message: 'Comentário publicado com sucesso!',
      comentario: createdComment
    });
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    return res.status(500).json({ error: 'Erro ao publicar comentário.' });
  }
});

// RF006 – Excluir Comentário (Autor do comentário, autor do pin ou Moderador)
router.delete('/comments/:id', authenticateToken, (req, res) => {
  try {
    const comment = db.prepare(`
      SELECT c.*, p.usuario_id as pin_dono_id
      FROM comentarios c
      JOIN pins p ON c.pin_id = p.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Comentário não encontrado.' });
    }

    const canDelete = comment.usuario_id === req.user.id || 
                      comment.pin_dono_id === req.user.id || 
                      req.user.role === 'moderador';

    if (!canDelete) {
      return res.status(403).json({ error: 'Você não tem permissão para excluir este comentário.' });
    }

    db.prepare('DELETE FROM comentarios WHERE id = ?').run(comment.id);
    return res.json({ message: 'Comentário excluído com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir comentário.' });
  }
});

// RF007 – Seguir / Deixar de Seguir um Usuário (Follow Toggle)
router.post('/users/:id/follow', authenticateToken, (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Você não pode seguir seu próprio perfil.' });
    }

    const targetUser = db.prepare("SELECT id, nome FROM usuarios WHERE id = ? AND status_conta = 'ativa'").get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const existingFollow = db.prepare('SELECT id FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?').get(currentUserId, targetUserId);

    if (existingFollow) {
      db.prepare('DELETE FROM seguidores WHERE id = ?').run(existingFollow.id);
      const totalFollowers = db.prepare('SELECT COUNT(*) as count FROM seguidores WHERE seguido_id = ?').get(targetUserId).count;
      return res.json({ following: false, totalFollowers, message: `Você deixou de seguir ${targetUser.nome}.` });
    } else {
      const followId = uuidv4();
      const dataCriacao = new Date().toISOString();

      db.prepare('INSERT INTO seguidores (id, seguidor_id, seguido_id, data_criacao) VALUES (?, ?, ?, ?)').run(followId, currentUserId, targetUserId, dataCriacao);

      // RF007 - Notificação de novo seguidor
      db.prepare(`
        INSERT INTO notificacoes (id, usuario_id, remetente_id, tipo, mensagem, link_alvo, lida, data_criacao)
        VALUES (?, ?, ?, 'novo_seguidor', ?, ?, 0, ?)
      `).run(
        uuidv4(),
        targetUserId,
        currentUserId,
        `${req.user.nome} começou a seguir você!`,
        `/perfil/${currentUserId}`,
        dataCriacao
      );

      const totalFollowers = db.prepare('SELECT COUNT(*) as count FROM seguidores WHERE seguido_id = ?').get(targetUserId).count;
      return res.json({ following: true, totalFollowers, message: `Você agora está seguindo ${targetUser.nome}!` });
    }
  } catch (error) {
    console.error('Erro ao seguir usuário:', error);
    return res.status(500).json({ error: 'Erro ao processar ação de seguir.' });
  }
});

// RF001 & RF007 – Obter Perfil Público de Usuário
router.get('/users/:id', optionalAuthenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, nome, email, bio, foto_perfil_url, tipo_conta, role, perfil_privado, status_conta, topicos_interesse, data_criacao,
             (SELECT COUNT(*) FROM seguidores WHERE seguido_id = usuarios.id) as seguidores_count,
             (SELECT COUNT(*) FROM seguidores WHERE seguidor_id = usuarios.id) as seguindo_count,
             (SELECT COUNT(*) FROM pins WHERE usuario_id = usuarios.id) as pins_count
      FROM usuarios
      WHERE id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (user.status_conta === 'banida' || user.status_conta === 'suspensa') {
      return res.status(404).json({ error: 'Esta conta está suspensa ou desativada.' });
    }

    const isOwner = req.user && req.user.id === user.id;
    const isFollowing = req.user ? !!db.prepare('SELECT id FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?').get(req.user.id, user.id) : false;

    // Pastas do usuário (apenas públicas se não for o próprio dono)
    let boardsQuery = `
      SELECT p.*,
             (SELECT COUNT(*) FROM pasta_pins WHERE pasta_id = p.id) as total_pins,
             (SELECT midia_url FROM pins WHERE id = (SELECT pin_id FROM pasta_pins WHERE pasta_id = p.id LIMIT 1)) as capa_url
      FROM pastas p
      WHERE p.usuario_id = ?
    `;
    if (!isOwner && (!req.user || req.user.role !== 'moderador')) {
      boardsQuery += ` AND p.visibilidade = 'publica'`;
    }
    boardsQuery += ` ORDER BY p.data_criacao DESC`;
    const pastas = db.prepare(boardsQuery).all(user.id);

    // Pins criados pelo usuário
    let pinsQuery = `
      SELECT p.*,
             (SELECT COUNT(*) FROM curtidas WHERE pin_id = p.id) as curtidas_count,
             (SELECT COUNT(*) FROM comentarios WHERE pin_id = p.id) as comentarios_count
      FROM pins p
      WHERE p.usuario_id = ?
    `;
    if (!isOwner && (!req.user || req.user.role !== 'moderador')) {
      pinsQuery += ` AND p.oculto_preventivo = 0`;
    }
    pinsQuery += ` ORDER BY p.data_criacao DESC`;
    const pins = db.prepare(pinsQuery).all(user.id);

    return res.json({
      perfil: {
        id: user.id,
        nome: user.nome,
        bio: user.bio,
        foto_perfil_url: user.foto_perfil_url,
        tipo_conta: user.tipo_conta,
        perfil_privado: user.perfil_privado,
        seguidores_count: user.seguidores_count,
        seguindo_count: user.seguindo_count,
        pins_count: user.pins_count,
        data_criacao: user.data_criacao,
        isOwner,
        isFollowing
      },
      pastas,
      pins: pins.map(p => ({ ...p, tags: JSON.parse(p.tags || '[]') }))
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados do perfil.' });
  }
});

module.exports = router;
