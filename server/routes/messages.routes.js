const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// RF006 – Enviar Mensagem Direta Interna (com texto e/ou Pin anexado)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { destinatarioId, texto = '', pinId = null } = req.body;

    if (!destinatarioId) {
      return res.status(400).json({ error: 'Destinatário é obrigatório.' });
    }

    if (!texto && !pinId) {
      return res.status(400).json({ error: 'A mensagem deve conter texto ou um Pin anexado.' });
    }

    const destinatario = db.prepare('SELECT id, nome, status_conta FROM usuarios WHERE id = ?').get(destinatarioId);
    if (!destinatario || destinatario.status_conta !== 'ativa') {
      return res.status(404).json({ error: 'Destinatário não encontrado ou inativo.' });
    }

    const messageId = uuidv4();
    const dataCriacao = new Date().toISOString();

    db.prepare(`
      INSERT INTO mensagens_diretas (id, remetente_id, destinatario_id, texto, pin_id, lida, data_criacao)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(messageId, req.user.id, destinatarioId, texto.trim(), pinId || null, dataCriacao);

    // Notificação
    db.prepare(`
      INSERT INTO notificacoes (id, usuario_id, remetente_id, tipo, mensagem, link_alvo, lida, data_criacao)
      VALUES (?, ?, ?, 'sistema', ?, '/mensagens', 0, ?)
    `).run(
      uuidv4(),
      destinatarioId,
      req.user.id,
      `${req.user.nome} enviou uma nova mensagem direta para você.`,
      dataCriacao
    );

    const createdMsg = db.prepare(`
      SELECT m.*, 
             p.titulo as pin_titulo, p.midia_url as pin_midia_url, p.tipo_midia as pin_tipo_midia,
             u1.nome as remetente_nome, u1.foto_perfil_url as remetente_foto
      FROM mensagens_diretas m
      LEFT JOIN pins p ON m.pin_id = p.id
      JOIN usuarios u1 ON m.remetente_id = u1.id
      WHERE m.id = ?
    `).get(messageId);

    return res.status(201).json({
      message: 'Mensagem enviada com sucesso!',
      mensagem: createdMsg
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return res.status(500).json({ error: 'Erro ao enviar mensagem direta.' });
  }
});

// RF006 – Obter lista de Conversas do usuário
router.get('/conversations', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar todos os usuários com quem houve troca de mensagens
    const users = db.prepare(`
      SELECT DISTINCT u.id, u.nome, u.foto_perfil_url, u.bio
      FROM usuarios u
      WHERE u.id IN (
        SELECT destinatario_id FROM mensagens_diretas WHERE remetente_id = ?
        UNION
        SELECT remetente_id FROM mensagens_diretas WHERE destinatario_id = ?
      ) AND u.status_conta = 'ativa'
    `).all(userId, userId);

    const conversations = users.map(u => {
      // Última mensagem
      const lastMsg = db.prepare(`
        SELECT texto, pin_id, data_criacao, remetente_id, lida
        FROM mensagens_diretas
        WHERE (remetente_id = ? AND destinatario_id = ?) OR (remetente_id = ? AND destinatario_id = ?)
        ORDER BY data_criacao DESC LIMIT 1
      `).get(userId, u.id, u.id, userId);

      const unreadCount = db.prepare(`
        SELECT COUNT(*) as count FROM mensagens_diretas
        WHERE remetente_id = ? AND destinatario_id = ? AND lida = 0
      `).get(u.id, userId).count;

      return {
        usuario: u,
        ultimaMensagem: lastMsg,
        unreadCount
      };
    });

    return res.json({ conversations });
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    return res.status(500).json({ error: 'Erro ao listar conversas.' });
  }
});

// RF006 – Obter histórico de mensagens com um usuário específico
router.get('/user/:userId', authenticateToken, (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.id;

    const messages = db.prepare(`
      SELECT m.*,
             p.titulo as pin_titulo, p.midia_url as pin_midia_url, p.tipo_midia as pin_tipo_midia,
             u.nome as remetente_nome, u.foto_perfil_url as remetente_foto
      FROM mensagens_diretas m
      LEFT JOIN pins p ON m.pin_id = p.id
      JOIN usuarios u ON m.remetente_id = u.id
      WHERE (m.remetente_id = ? AND m.destinatario_id = ?)
         OR (m.remetente_id = ? AND m.destinatario_id = ?)
      ORDER BY m.data_criacao ASC
    `).all(currentUserId, targetUserId, targetUserId, currentUserId);

    // Marcar como lidas
    db.prepare(`
      UPDATE mensagens_diretas 
      SET lida = 1 
      WHERE remetente_id = ? AND destinatario_id = ? AND lida = 0
    `).run(targetUserId, currentUserId);

    const targetUser = db.prepare('SELECT id, nome, foto_perfil_url, bio FROM usuarios WHERE id = ?').get(targetUserId);

    return res.json({ messages, targetUser });
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
    return res.status(500).json({ error: 'Erro ao obter histórico de mensagens.' });
  }
});

module.exports = router;
