const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken, requireModerator } = require('../middleware/auth');

// RF008 & RNE003 – Registrar uma nova Denúncia (qualquer usuário autenticado)
router.post('/report', authenticateToken, (req, res) => {
  try {
    const { tipoAlvo, alvoId, motivo, detalhes = '' } = req.body;

    if (!tipoAlvo || !alvoId || !motivo) {
      return res.status(400).json({ error: 'Tipo de alvo (pin/comentario/perfil), ID do alvo e motivo são obrigatórios.' });
    }

    const reportId = uuidv4();
    const dataCriacao = new Date();
    // Regra RNE003: SLA de 48 horas para revisão da moderação
    const slaLimite = new Date(dataCriacao.getTime() + 48 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO denuncias (id, denunciante_id, tipo_alvo, alvo_id, motivo, detalhes, status, decisao, sla_limite, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, 'pendente', '', ?, ?)
    `).run(reportId, req.user.id, tipoAlvo, alvoId, motivo, detalhes, slaLimite, dataCriacao.toISOString());

    // Regra RNE003 - Ocultação Preventiva: Se o Pin receber 2 ou mais denúncias, ocultar do feed
    let avisoOcultacao = null;
    if (tipoAlvo === 'pin') {
      const pin = db.prepare('SELECT id, denuncias_count FROM pins WHERE id = ?').get(alvoId);
      if (pin) {
        const novoCount = (pin.denuncias_count || 0) + 1;
        const deveOcultar = novoCount >= 2 ? 1 : 0;
        
        db.prepare('UPDATE pins SET denuncias_count = ?, oculto_preventivo = ? WHERE id = ?')
          .run(novoCount, deveOcultar, alvoId);

        if (deveOcultar) {
          avisoOcultacao = 'Devido ao volume de denúncias, o conteúdo foi preventivamente ocultado do Feed até a revisão da moderação (RNE003).';
        }
      }
    }

    return res.status(201).json({
      message: 'Denúncia registrada com sucesso! Nossa equipe analisará em até 48 horas (RNE003).',
      denunciaId: reportId,
      slaLimite,
      avisoOcultacao
    });
  } catch (error) {
    console.error('Erro ao registrar denúncia:', error);
    return res.status(500).json({ error: 'Erro ao registrar denúncia.' });
  }
});

// RF008 & RNE003 – Painel Administrativo: Listar Denúncias (Apenas Moderadores)
router.get('/reports', authenticateToken, requireModerator, (req, res) => {
  try {
    const { status = 'todos' } = req.query;

    let sql = `
      SELECT d.*, u.nome as denunciante_nome, u.email as denunciante_email
      FROM denuncias d
      JOIN usuarios u ON d.denunciante_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status !== 'todos') {
      sql += ` AND d.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY CASE WHEN d.status = 'pendente' THEN 0 ELSE 1 END, d.sla_limite ASC`;
    const reports = db.prepare(sql).all(...params);

    // Enriquecer cada denúncia com dados do alvo (Pin, Comentário ou Perfil)
    const enrichedReports = reports.map(rep => {
      let alvoDetalhes = null;

      if (rep.tipo_alvo === 'pin') {
        alvoDetalhes = db.prepare(`
          SELECT p.id, p.titulo, p.descricao, p.midia_url, p.oculto_preventivo, p.usuario_id as autor_id, u.nome as autor_nome, u.status_conta as autor_status
          FROM pins p
          JOIN usuarios u ON p.usuario_id = u.id
          WHERE p.id = ?
        `).get(rep.alvo_id);
      } else if (rep.tipo_alvo === 'comentario') {
        alvoDetalhes = db.prepare(`
          SELECT c.id, c.texto, c.imagem_url, c.usuario_id as autor_id, u.nome as autor_nome, u.status_conta as autor_status
          FROM comentarios c
          JOIN usuarios u ON c.usuario_id = u.id
          WHERE c.id = ?
        `).get(rep.alvo_id);
      } else if (rep.tipo_alvo === 'perfil') {
        alvoDetalhes = db.prepare(`
          SELECT u.id, u.nome, u.email, u.bio, u.foto_perfil_url, u.status_conta
          FROM usuarios u
          WHERE u.id = ?
        `).get(rep.alvo_id);
      }

      // Calcular tempo restante do SLA (48h RNE003)
      const now = new Date().getTime();
      const slaEnd = new Date(rep.sla_limite).getTime();
      const horasRestantes = ((slaEnd - now) / (1000 * 60 * 60)).toFixed(1);
      const slaVencido = now > slaEnd;

      return {
        ...rep,
        alvoDetalhes,
        horasRestantes,
        slaVencido
      };
    });

    const stats = {
      pendentes: db.prepare("SELECT COUNT(*) as count FROM denuncias WHERE status = 'pendente'").get().count,
      analisadas: db.prepare("SELECT COUNT(*) as count FROM denuncias WHERE status != 'pendente'").get().count,
      total: reports.length
    };

    return res.json({ denuncias: enrichedReports, stats });
  } catch (error) {
    console.error('Erro ao listar denúncias:', error);
    return res.status(500).json({ error: 'Erro ao buscar denúncias de moderação.' });
  }
});

// RF008 & RNE003 – Ação de Moderação (Manter, Remover Conteúdo, Suspender/Banir Conta)
router.post('/reports/:id/action', authenticateToken, requireModerator, (req, res) => {
  try {
    const reportId = req.params.id;
    const { acao, justificativa = '' } = req.body; // 'manter', 'remover_conteudo', 'suspender_usuario', 'banir_usuario'

    const report = db.prepare('SELECT * FROM denuncias WHERE id = ?').get(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Denúncia não encontrada.' });
    }

    const dataAnalise = new Date().toISOString();
    let statusFinal = 'resolvida';
    let mensagemAcao = '';

    if (acao === 'manter') {
      statusFinal = 'rejeitada';
      mensagemAcao = 'Denúncia rejeitada. Conteúdo mantido na plataforma.';
      
      // Se era um pin oculto preventivamente, reativá-lo
      if (report.tipo_alvo === 'pin') {
        db.prepare('UPDATE pins SET oculto_preventivo = 0 WHERE id = ?').run(report.alvo_id);
      }
    } else if (acao === 'remover_conteudo') {
      mensagemAcao = 'Conteúdo removido permanentemente por violação das diretrizes.';
      if (report.tipo_alvo === 'pin') {
        db.prepare('DELETE FROM pins WHERE id = ?').run(report.alvo_id);
      } else if (report.tipo_alvo === 'comentario') {
        db.prepare('DELETE FROM comentarios WHERE id = ?').run(report.alvo_id);
      }
    } else if (acao === 'suspender_usuario') {
      mensagemAcao = 'Conta do usuário suspensa temporariamente pela moderação.';
      let targetUserId = report.alvo_id;
      if (report.tipo_alvo === 'pin') {
        const p = db.prepare('SELECT usuario_id FROM pins WHERE id = ?').get(report.alvo_id);
        if (p) targetUserId = p.usuario_id;
      } else if (report.tipo_alvo === 'comentario') {
        const c = db.prepare('SELECT usuario_id FROM comentarios WHERE id = ?').get(report.alvo_id);
        if (c) targetUserId = c.usuario_id;
      }
      if (targetUserId) {
        db.prepare("UPDATE usuarios SET status_conta = 'suspensa' WHERE id = ?").run(targetUserId);
      }
    } else if (acao === 'banir_usuario') {
      // RNE003: Contas reincidentes podem ser banidas permanentemente
      mensagemAcao = 'Conta do usuário banida permanentemente por violação grave ou reincidente (RNE003).';
      let targetUserId = report.alvo_id;
      if (report.tipo_alvo === 'pin') {
        const p = db.prepare('SELECT usuario_id FROM pins WHERE id = ?').get(report.alvo_id);
        if (p) targetUserId = p.usuario_id;
      } else if (report.tipo_alvo === 'comentario') {
        const c = db.prepare('SELECT usuario_id FROM comentarios WHERE id = ?').get(report.alvo_id);
        if (c) targetUserId = c.usuario_id;
      }
      if (targetUserId) {
        db.prepare("UPDATE usuarios SET status_conta = 'banida' WHERE id = ?").run(targetUserId);
      }
    } else {
      return res.status(400).json({ error: 'Ação inválida.' });
    }

    db.prepare(`
      UPDATE denuncias 
      SET status = ?, decisao = ?, data_analise = ?
      WHERE id = ?
    `).run(statusFinal, `${acao}: ${justificativa || mensagemAcao}`, dataAnalise, reportId);

    // Notificar denunciante sobre a conclusão da análise
    db.prepare(`
      INSERT INTO notificacoes (id, usuario_id, remetente_id, tipo, mensagem, link_alvo, lida, data_criacao)
      VALUES (?, ?, ?, 'sistema', ?, '', 0, ?)
    `).run(
      uuidv4(),
      report.denunciante_id,
      req.user.id,
      `Sua denúncia sobre ${report.tipo_alvo} foi analisada pela equipe: ${mensagemAcao}`,
      dataAnalise
    );

    return res.json({
      message: 'Ação de moderação executada com sucesso!',
      status: statusFinal,
      mensagemAcao
    });
  } catch (error) {
    console.error('Erro ao executar moderação:', error);
    return res.status(500).json({ error: 'Erro ao executar ação de moderação.' });
  }
});

module.exports = router;
