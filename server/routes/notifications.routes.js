const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// RF007 – Obter lista de Notificações do usuário autenticado
router.get('/', authenticateToken, (req, res) => {
  try {
    const notifs = db.prepare(`
      SELECT n.*, u.nome as remetente_nome, u.foto_perfil_url as remetente_foto
      FROM notificacoes n
      LEFT JOIN usuarios u ON n.remetente_id = u.id
      WHERE n.usuario_id = ?
      ORDER BY n.data_criacao DESC LIMIT 50
    `).all(req.user.id);

    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notificacoes WHERE usuario_id = ? AND lida = 0').get(req.user.id).count;

    return res.json({ notificacoes: notifs, unreadCount });
  } catch (error) {
    console.error('Erro ao obter notificações:', error);
    return res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
});

// RF007 – Marcar notificação individual como lida
router.put('/:id/read', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?').run(req.params.id, req.user.id);
    return res.json({ message: 'Notificação marcada como lida.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar notificação.' });
  }
});

// RF007 – Marcar todas as notificações como lidas
router.put('/read-all', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ?').run(req.user.id);
    return res.json({ message: 'Todas as notificações foram marcadas como lidas.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar notificações.' });
  }
});

module.exports = router;
