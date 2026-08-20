const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// RNF003 & RNE004 – Exportar Dados Pessoais (Direito de Acesso e Portabilidade LGPD/GDPR)
router.get('/export', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    const user = db.prepare('SELECT id, nome, email, data_nascimento, bio, foto_perfil_url, tipo_conta, role, perfil_privado, two_factor_enabled, lgpd_consent, status_conta, topicos_interesse, data_criacao FROM usuarios WHERE id = ?').get(userId);
    
    const pins = db.prepare('SELECT id, titulo, descricao, midia_url, tipo_midia, texto_alternativo, link_destino, categoria, tags, data_criacao FROM pins WHERE usuario_id = ?').all(userId);
    
    const pastas = db.prepare('SELECT id, titulo, descricao, categoria, visibilidade, data_criacao FROM pastas WHERE usuario_id = ?').all(userId);
    
    const comentarios = db.prepare('SELECT id, pin_id, texto, imagem_url, data_criacao FROM comentarios WHERE usuario_id = ?').all(userId);
    
    const curtidas = db.prepare('SELECT pin_id, data_criacao FROM curtidas WHERE usuario_id = ?').all(userId);
    
    const historicoBuscas = db.prepare('SELECT termo, data_busca FROM historico_buscas WHERE usuario_id = ?').all(userId);

    const mensagens = db.prepare('SELECT id, remetente_id, destinatario_id, texto, pin_id, data_criacao FROM mensagens_diretas WHERE remetente_id = ? OR destinatario_id = ?').all(userId, userId);

    const exportData = {
      plataforma: 'Stylety (IFPA Software Engineering)',
      data_exportacao: new Date().toISOString(),
      lei_aplicavel: 'LGPD (Lei nº 13.709/2018) & GDPR',
      usuario: {
        ...user,
        topicos_interesse: JSON.parse(user.topicos_interesse || '[]')
      },
      dados_criados: {
        pins,
        pastas,
        comentarios,
        curtidas,
        historico_buscas: historicoBuscas,
        mensagens_diretas: mensagens
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="stylety_dados_${user.nome.toLowerCase().replace(/\s+/g, '_')}.json"`);
    return res.json(exportData);
  } catch (error) {
    console.error('Erro ao exportar dados LGPD:', error);
    return res.status(500).json({ error: 'Erro ao exportar dados pessoais.' });
  }
});

// RNF003 – Atualizar Consentimento de Termos e Privacidade LGPD
router.post('/consent', authenticateToken, (req, res) => {
  try {
    const { consent = true } = req.body;
    db.prepare('UPDATE usuarios SET lgpd_consent = ? WHERE id = ?').run(consent ? 1 : 0, req.user.id);
    return res.json({ message: 'Preferências de consentimento LGPD atualizadas com sucesso.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar consentimento.' });
  }
});

// RNE004 – Solicitar Exclusão da Conta (Retenção e Anonimização em até 30 dias)
router.post('/request-deletion', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    // RNE004: Dados pessoais são removidos em até 30 dias após a solicitação
    const dataExclusao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE usuarios 
      SET status_conta = 'exclusao_pendente', exclusao_agendada_para = ?
      WHERE id = ?
    `).run(dataExclusao, userId);

    return res.json({
      message: 'Solicitação de exclusão recebida com sucesso. Conforme a LGPD (RNE004), seus dados serão anonimizados e excluídos definitivamente em até 30 dias.',
      exclusaoAgendadaPara: dataExclusao,
      diasRestantes: 30
    });
  } catch (error) {
    console.error('Erro ao agendar exclusão:', error);
    return res.status(500).json({ error: 'Erro ao solicitar exclusão de conta.' });
  }
});

// RNE004 – Anonimização / Exclusão Imediata de Dados
router.post('/anonymize-now', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    // Anonimizar dados pessoais
    db.prepare(`
      UPDATE usuarios 
      SET nome = 'Usuário Anonimizado', 
          email = 'anonimo_' || id || '@excluido.local',
          bio = '', 
          foto_perfil_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=anonymous',
          status_conta = 'banida'
      WHERE id = ?
    `).run(userId);

    // Limpar histórico de buscas
    db.prepare('DELETE FROM historico_buscas WHERE usuario_id = ?').run(userId);

    return res.json({
      message: 'Dados pessoais anonimizados em conformidade com a LGPD (RNE004).'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao anonimizar dados.' });
  }
});

module.exports = router;
