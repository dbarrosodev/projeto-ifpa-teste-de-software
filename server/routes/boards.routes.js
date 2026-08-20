const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

// RF003 – Criar uma nova Pasta (Board)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { titulo, descricao = '', categoria = 'Geral', visibilidade = 'publica' } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: 'O título da pasta é obrigatório.' });
    }

    const boardId = uuidv4();
    const dataCriacao = new Date().toISOString();
    const cleanVisibilidade = visibilidade === 'secreta' ? 'secreta' : 'publica';

    db.prepare(`
      INSERT INTO pastas (id, usuario_id, titulo, descricao, categoria, visibilidade, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(boardId, req.user.id, titulo.trim(), descricao.trim(), categoria, cleanVisibilidade, dataCriacao);

    const createdBoard = db.prepare('SELECT * FROM pastas WHERE id = ?').get(boardId);

    return res.status(201).json({
      message: 'Pasta criada com sucesso!',
      pasta: createdBoard
    });
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    return res.status(500).json({ error: 'Erro interno ao criar pasta.' });
  }
});

// RF003 & RNE002 – Listar Pastas públicas ou do usuário
router.get('/', optionalAuthenticateToken, (req, res) => {
  try {
    const { usuarioId, categoria } = req.query;

    let query = `
      SELECT p.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto,
             (SELECT COUNT(*) FROM pasta_pins WHERE pasta_id = p.id) as total_pins,
             (SELECT midia_url FROM pins WHERE id = (SELECT pin_id FROM pasta_pins WHERE pasta_id = p.id LIMIT 1)) as capa_url
      FROM pastas p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (usuarioId) {
      query += ` AND p.usuario_id = ?`;
      params.push(usuarioId);

      // RNE002 - Se não for o próprio dono e não for colaborador/moderador, ocultar pastas secretas
      const isOwner = req.user && req.user.id === usuarioId;
      const isModerator = req.user && req.user.role === 'moderador';

      if (!isOwner && !isModerator) {
        query += ` AND (p.visibilidade = 'publica' OR p.id IN (SELECT pasta_id FROM pasta_colaboradores WHERE usuario_id = ?))`;
        params.push(req.user ? req.user.id : '');
      }
    } else {
      // Listagem geral: NUNCA exibir pastas secretas publicamente (RNE002)
      query += ` AND p.visibilidade = 'publica'`;
    }

    if (categoria && categoria !== 'Todas') {
      query += ` AND p.categoria = ?`;
      params.push(categoria);
    }

    query += ` ORDER BY p.data_criacao DESC`;
    const boards = db.prepare(query).all(...params);

    return res.json({ pastas: boards });
  } catch (error) {
    console.error('Erro ao listar pastas:', error);
    return res.status(500).json({ error: 'Erro ao listar pastas.' });
  }
});

// RF003 & RNE002 – Obter detalhes de uma Pasta por ID com seus Pins
router.get('/:id', optionalAuthenticateToken, (req, res) => {
  try {
    const board = db.prepare(`
      SELECT p.*, u.nome as autor_nome, u.foto_perfil_url as autor_foto
      FROM pastas p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Pasta não encontrada.' });
    }

    // Regra RNE002: Pastas secretas só podem ser acessadas pelo criador ou colaboradores convidados
    const isOwner = req.user && req.user.id === board.usuario_id;
    const isModerator = req.user && req.user.role === 'moderador';
    const isCollaborator = req.user ? db.prepare('SELECT id FROM pasta_colaboradores WHERE pasta_id = ? AND usuario_id = ?').get(board.id, req.user.id) : null;

    if (board.visibilidade === 'secreta' && !isOwner && !isModerator && !isCollaborator) {
      return res.status(403).json({ error: 'Esta pasta é secreta e privada (RNE002).' });
    }

    // Obter Pins da pasta (incluindo subpastas/seções)
    const pins = db.prepare(`
      SELECT p.*, pp.secao as subpasta_secao, pp.data_salvo,
             u.nome as autor_nome, u.foto_perfil_url as autor_foto
      FROM pasta_pins pp
      JOIN pins p ON pp.pin_id = p.id
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE pp.pasta_id = ? AND (p.oculto_preventivo = 0 OR ? = 'moderador')
      ORDER BY pp.data_salvo DESC
    `).all(board.id, req.user ? req.user.role : 'visitante');

    // Obter Colaboradores
    const colaboradores = db.prepare(`
      SELECT pc.*, u.nome, u.email, u.foto_perfil_url
      FROM pasta_colaboradores pc
      JOIN usuarios u ON pc.usuario_id = u.id
      WHERE pc.pasta_id = ?
    `).all(board.id);

    // Obter Seções/Subpastas existentes
    const secoes = [...new Set(pins.map(p => p.subpasta_secao).filter(Boolean))];

    return res.json({
      pasta: board,
      pins: pins.map(p => ({ ...p, tags: JSON.parse(p.tags || '[]') })),
      colaboradores,
      secoes,
      isOwner,
      canEdit: isOwner || isModerator || (isCollaborator && isCollaborator.permissao === 'editor')
    });
  } catch (error) {
    console.error('Erro ao buscar pasta:', error);
    return res.status(500).json({ error: 'Erro ao obter pasta.' });
  }
});

// RF003 – Atualizar metadados da Pasta
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const board = db.prepare('SELECT * FROM pastas WHERE id = ?').get(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Pasta não encontrada.' });
    }

    if (board.usuario_id !== req.user.id && req.user.role !== 'moderador') {
      return res.status(403).json({ error: 'Permissão negada. Apenas o criador da pasta pode editá-la.' });
    }

    const { titulo, descricao, categoria, visibilidade } = req.body;
    const cleanVisibilidade = (visibilidade === 'secreta' || visibilidade === 'publica') ? visibilidade : board.visibilidade;

    db.prepare(`
      UPDATE pastas 
      SET titulo = ?, descricao = ?, categoria = ?, visibilidade = ?
      WHERE id = ?
    `).run(
      titulo !== undefined ? titulo.trim() : board.titulo,
      descricao !== undefined ? descricao.trim() : board.descricao,
      categoria !== undefined ? categoria : board.categoria,
      cleanVisibilidade,
      board.id
    );

    const updated = db.prepare('SELECT * FROM pastas WHERE id = ?').get(board.id);
    return res.json({ message: 'Pasta atualizada com sucesso!', pasta: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar pasta.' });
  }
});

// RF003 – Excluir Pasta
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const board = db.prepare('SELECT * FROM pastas WHERE id = ?').get(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Pasta não encontrada.' });
    }

    if (board.usuario_id !== req.user.id && req.user.role !== 'moderador') {
      return res.status(403).json({ error: 'Apenas o criador ou moderadores podem excluir esta pasta.' });
    }

    db.prepare('DELETE FROM pastas WHERE id = ?').run(board.id);
    return res.json({ message: 'Pasta excluída com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir pasta.' });
  }
});

// RF003 & RF006 – Adicionar Pin a uma Pasta (Salvar Pin em pasta ou subpasta/seção)
router.post('/:id/pins', authenticateToken, (req, res) => {
  try {
    const { pinId, secao = '' } = req.body;
    const board = db.prepare('SELECT * FROM pastas WHERE id = ?').get(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Pasta não encontrada.' });
    }

    const isOwner = board.usuario_id === req.user.id;
    const isCollaborator = db.prepare('SELECT id FROM pasta_colaboradores WHERE pasta_id = ? AND usuario_id = ?').get(board.id, req.user.id);

    if (!isOwner && !isCollaborator && req.user.role !== 'moderador') {
      return res.status(403).json({ error: 'Você não tem permissão para adicionar Pins nesta pasta.' });
    }

    const pin = db.prepare('SELECT * FROM pins WHERE id = ?').get(pinId);
    if (!pin) {
      return res.status(404).json({ error: 'Pin não encontrado.' });
    }

    const saveId = uuidv4();
    const dataSalvo = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO pasta_pins (id, pasta_id, pin_id, secao, data_salvo)
      VALUES (?, ?, ?, ?, ?)
    `).run(saveId, board.id, pin.id, secao.trim(), dataSalvo);

    // RF007 - Notificar autor original do Pin se outra pessoa salvou
    if (pin.usuario_id !== req.user.id) {
      db.prepare(`
        INSERT INTO notificacoes (id, usuario_id, remetente_id, tipo, mensagem, link_alvo, lida, data_criacao)
        VALUES (?, ?, ?, 'curtida', ?, ?, 0, ?)
      `).run(
        uuidv4(),
        pin.usuario_id,
        req.user.id,
        `${req.user.nome} salvou sua ideia "${pin.titulo}" na pasta "${board.titulo}"`,
        `/pin/${pin.id}`,
        dataSalvo
      );
    }

    return res.json({ message: 'Pin salvo na pasta com sucesso!', pastaId: board.id, pinId: pin.id });
  } catch (error) {
    console.error('Erro ao salvar pin na pasta:', error);
    return res.status(500).json({ error: 'Erro ao salvar pin na pasta.' });
  }
});

// RF003 – Remover Pin de uma Pasta
router.delete('/:id/pins/:pinId', authenticateToken, (req, res) => {
  try {
    const board = db.prepare('SELECT * FROM pastas WHERE id = ?').get(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Pasta não encontrada.' });
    }

    const isOwner = board.usuario_id === req.user.id;
    const isCollaborator = db.prepare('SELECT id FROM pasta_colaboradores WHERE pasta_id = ? AND usuario_id = ?').get(board.id, req.user.id);

    if (!isOwner && !isCollaborator && req.user.role !== 'moderador') {
      return res.status(403).json({ error: 'Sem permissão para remover Pins desta pasta.' });
    }

    db.prepare('DELETE FROM pasta_pins WHERE pasta_id = ? AND pin_id = ?').run(board.id, req.params.pinId);
    return res.json({ message: 'Pin removido da pasta com sucesso.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover pin da pasta.' });
  }
});

// RF003 – Convidar Colaborador para a Pasta
router.post('/:id/collaborators', authenticateToken, (req, res) => {
  try {
    const { emailOuNome, permissao = 'editor' } = req.body;
    const board = db.prepare('SELECT * FROM pastas WHERE id = ?').get(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Pasta não encontrada.' });
    }

    if (board.usuario_id !== req.user.id && req.user.role !== 'moderador') {
      return res.status(403).json({ error: 'Apenas o proprietário pode convidar colaboradores.' });
    }

    const targetUser = db.prepare("SELECT id, nome, email FROM usuarios WHERE (email = ? OR nome = ?) AND status_conta = 'ativa'").get(emailOuNome, emailOuNome);
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado na plataforma.' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'Você já é o proprietário desta pasta.' });
    }

    const collabId = uuidv4();
    const dataCriacao = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO pasta_colaboradores (id, pasta_id, usuario_id, permissao, data_criacao)
      VALUES (?, ?, ?, ?, ?)
    `).run(collabId, board.id, targetUser.id, permissao, dataCriacao);

    // RF007 - Notificação
    db.prepare(`
      INSERT INTO notificacoes (id, usuario_id, remetente_id, tipo, mensagem, link_alvo, lida, data_criacao)
      VALUES (?, ?, ?, 'sistema', ?, ?, 0, ?)
    `).run(
      uuidv4(),
      targetUser.id,
      req.user.id,
      `${req.user.nome} convidou você para colaborar na pasta "${board.titulo}"`,
      `/pasta/${board.id}`,
      dataCriacao
    );

    return res.status(201).json({
      message: `Colaborador ${targetUser.nome} adicionado com sucesso!`,
      colaborador: { id: targetUser.id, nome: targetUser.nome, email: targetUser.email, permissao }
    });
  } catch (error) {
    console.error('Erro ao adicionar colaborador:', error);
    return res.status(500).json({ error: 'Erro ao convidar colaborador.' });
  }
});

module.exports = router;
