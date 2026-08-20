import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server/app.js';
import { db } from '../server/config/database.js';

describe('Suite de Testes de Software - Stylety IFPA', () => {
  let userToken = '';
  let userId = '';
  let moderatorToken = '';
  let testPinId = '';
  let testBoardId = '';

  beforeAll(async () => {
    // Resetar status de Daniel para ativa caso tenha sido alterado em testes anteriores
    db.prepare("UPDATE usuarios SET status_conta = 'ativa', exclusao_agendada_para = NULL WHERE email = 'daniel@stylety.local'").run();

    // Obter tokens de usuários pré-semeados
    const loginDan = await request(app)
      .post('/api/auth/login')
      .send({ email: 'daniel@stylety.local', senha: 'senha123' });
    userToken = loginDan.body.token;
    userId = loginDan.body.user.id;

    const loginMod = await request(app)
      .post('/api/auth/login')
      .send({ email: 'moderador@stylety.local', senha: 'admin123', twoFactorCode: '123456' });
    moderatorToken = loginMod.body.token;
  });

  // ==========================================
  // RF001 & RNE001 – Autenticação e Validação de Idade
  // ==========================================
  describe('RF001 & RNE001 – Gestão de Acesso e Idade Mínima', () => {
    it('Deve impedir cadastro de menores de 13 anos (Regra RNE001)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'Criança Teste',
          email: 'crianca@teste.com',
          senha: 'senha123456',
          dataNascimento: '2018-01-01' // 8 anos
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('RNE001');
    });

    it('Deve permitir cadastro de adolescente (13-17 anos) e definir perfil_privado = 1 (RNE001)', async () => {
      const email = `adolescente_${Date.now()}@teste.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'Adolescente Teste',
          email,
          senha: 'senha123456',
          dataNascimento: '2010-01-01' // 16 anos
        });

      expect(res.status).toBe(201);
      expect(res.body.user.perfil_privado).toBe(1);
      expect(res.body.isMinorNotice).toBeDefined();
    });

    it('Deve autenticar usuário cadastrado e retornar token JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'daniel@stylety.local',
          senha: 'senha123'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('daniel@stylety.local');
    });

    it('Deve autenticar via login social simulado (Google/Facebook/Apple)', async () => {
      const res = await request(app)
        .post('/api/auth/social-login')
        .send({
          provider: 'Google',
          email: `google_${Date.now()}@teste.local`,
          nome: 'Google Test User'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });
  });

  // ==========================================
  // RF002 & RNE002 – Criação e Gestão de Pins
  // ==========================================
  describe('RF002 & RNE002 – Criação e Exclusão Definitiva de Pins', () => {
    it('Deve criar um novo Pin com sucesso', async () => {
      const res = await request(app)
        .post('/api/pins')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          titulo: 'Pin de Teste Automatizado',
          descricao: 'Descrição do Pin criado pelo teste unitário',
          textoAlternativo: 'Imagem de teste com formas geométricas',
          linkDestino: 'https://ifpa.edu.br',
          categoria: 'Design',
          tags: ['teste', 'qualidade', 'software'],
          midiaUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800'
        });

      expect(res.status).toBe(201);
      expect(res.body.pin.titulo).toBe('Pin de Teste Automatizado');
      testPinId = res.body.pin.id;
    });

    it('Deve obter detalhes do Pin criado por ID', async () => {
      const res = await request(app).get(`/api/pins/${testPinId}`);
      expect(res.status).toBe(200);
      expect(res.body.pin.id).toBe(testPinId);
      expect(res.body.pin.link_responsabilidade_aviso).toBeDefined();
    });

    it('Deve permitir edição de metadados pelo autor do Pin', async () => {
      const res = await request(app)
        .put(`/api/pins/${testPinId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          titulo: 'Pin de Teste Atualizado',
          descricao: 'Nova descrição'
        });

      expect(res.status).toBe(200);
      expect(res.body.pin.titulo).toBe('Pin de Teste Atualizado');
    });

    it('Deve impedir que outro usuário não-autorizado exclua o Pin (RNE002)', async () => {
      const loginWag = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wagner@stylety.local', senha: 'senha123' });

      const res = await request(app)
        .delete(`/api/pins/${testPinId}`)
        .set('Authorization', `Bearer ${loginWag.body.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('RNE002');
    });
  });

  // ==========================================
  // RF003 & RNE002 – Gestão de Pastas (Boards)
  // ==========================================
  describe('RF003 & RNE002 – Gestão de Pastas e Pastas Secretas', () => {
    it('Deve criar uma pasta secreta com sucesso', async () => {
      const res = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          titulo: 'Pasta Secreta de Teste',
          descricao: 'Apenas para meus olhos',
          categoria: 'Design',
          visibilidade: 'secreta'
        });

      expect(res.status).toBe(201);
      expect(res.body.pasta.visibilidade).toBe('secreta');
      testBoardId = res.body.pasta.id;
    });

    it('Não deve exibir pasta secreta em listagens públicas gerais (RNE002)', async () => {
      const res = await request(app).get('/api/boards');
      expect(res.status).toBe(200);
      const secretFound = res.body.pastas.some(b => b.id === testBoardId);
      expect(secretFound).toBe(false);
    });

    it('Deve salvar um Pin dentro de uma pasta', async () => {
      const res = await request(app)
        .post(`/api/boards/${testBoardId}/pins`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ pinId: testPinId });

      expect(res.status).toBe(200);
      expect(res.body.pastaId).toBe(testBoardId);
    });

    it('Deve convidar outro usuário para colaborar na pasta', async () => {
      const res = await request(app)
        .post(`/api/boards/${testBoardId}/collaborators`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ emailOuNome: 'debora@stylety.local', permissao: 'editor' });

      expect(res.status).toBe(201);
      expect(res.body.colaborador.nome).toBe('Débora Vitória');
    });
  });

  // ==========================================
  // RF004 – Pesquisa Textual e Pinterest Lens
  // ==========================================
  describe('RF004 – Pesquisa Textual e Pinterest Lens', () => {
    it('Deve retornar sugestões automáticas na busca', async () => {
      const res = await request(app).get('/api/search/suggestions?q=Design');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.sugestoes)).toBe(true);
    });

    it('Deve buscar Pins por palavra-chave', async () => {
      const res = await request(app).get('/api/search?q=Design&tipo=pins');
      expect(res.status).toBe(200);
      expect(res.body.pins.length).toBeGreaterThan(0);
    });

    it('Deve executar busca visual (Pinterest Lens) e retornar similares ordenados por relevância', async () => {
      const res = await request(app)
        .post('/api/search/lens')
        .send({
          targetTag: 'arquitetura',
          categoria: 'Arquitetura'
        });

      expect(res.status).toBe(200);
      expect(res.body.pins.length).toBeGreaterThan(0);
      expect(res.body.pins[0].similarityScore).toBeDefined();
    });
  });

  // ==========================================
  // RF005 – Feed de Recomendações
  // ==========================================
  describe('RF005 – Feed Personalizado', () => {
    it('Deve gerar feed personalizado para usuário autenticado', async () => {
      const res = await request(app)
        .get('/api/feed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('personalizado');
      expect(res.body.feed.length).toBeGreaterThan(0);
    });

    it('Deve fornecer feed de curadoria para visitantes não autenticados', async () => {
      const res = await request(app).get('/api/feed');
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('visitante');
      expect(res.body.feed.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // RF006 & RF007 – Interações Sociais e Mensagens
  // ==========================================
  describe('RF006 & RF007 – Curtidas, Comentários, Seguir e Mensagens Diretas', () => {
    it('Deve curtir um Pin e registrar notificação para o autor', async () => {
      const res = await request(app)
        .post(`/api/interactions/pins/${testPinId}/like`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
    });

    it('Deve publicar um comentário em um Pin', async () => {
      const res = await request(app)
        .post(`/api/interactions/pins/${testPinId}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ texto: 'Comentário de teste unitário' });

      expect(res.status).toBe(201);
      expect(res.body.comentario.texto).toBe('Comentário de teste unitário');
    });

    it('Deve enviar mensagem direta com Pin anexado (RF006)', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          destinatarioId: 'usr-deb-003',
          texto: 'Confira este Pin de teste que criei!',
          pinId: testPinId
        });

      expect(res.status).toBe(201);
      expect(res.body.mensagem.destinatario_id).toBe('usr-deb-003');
    });

    it('Deve listar notificações do usuário', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.notificacoes)).toBe(true);
    });
  });

  // ==========================================
  // RF008 & RNE003 – Denúncia e Moderação
  // ==========================================
  describe('RF008 & RNE003 – Moderação, Ocultação Preventiva e SLA 48h', () => {
    let reportId = '';

    it('Deve registrar uma denúncia com SLA de 48 horas (RNE003)', async () => {
      const res = await request(app)
        .post('/api/moderation/report')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          tipoAlvo: 'pin',
          alvoId: testPinId,
          motivo: 'Spam ou Fraude',
          detalhes: 'Conteúdo repetitivo'
        });

      expect(res.status).toBe(201);
      expect(res.body.slaLimite).toBeDefined();
      reportId = res.body.denunciaId;
    });

    it('Deve ocultar preventivamente o Pin se receber 2 ou mais denúncias (RNE003)', async () => {
      const loginDeb = await request(app)
        .post('/api/auth/login')
        .send({ email: 'debora@stylety.local', senha: 'senha123' });

      const res = await request(app)
        .post('/api/moderation/report')
        .set('Authorization', `Bearer ${loginDeb.body.token}`)
        .send({
          tipoAlvo: 'pin',
          alvoId: testPinId,
          motivo: 'Violação de Termos',
          detalhes: 'Segunda denúncia'
        });

      expect(res.status).toBe(201);
      expect(res.body.avisoOcultacao).toContain('RNE003');

      // Verificar no banco se oculto_preventivo = 1
      const pin = db.prepare('SELECT oculto_preventivo FROM pins WHERE id = ?').get(testPinId);
      expect(pin.oculto_preventivo).toBe(1);
    });

    it('Moderador deve listar denúncias no painel administrativo', async () => {
      const res = await request(app)
        .get('/api/moderation/reports')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.denuncias.length).toBeGreaterThan(0);
      expect(res.body.stats.pendentes).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // RNF003, RNE004 & RNF006 – LGPD, Exclusão e Backup
  // ==========================================
  describe('RNF003, RNE004 & RNF006 – LGPD, Portabilidade e Backup', () => {
    it('Deve exportar dados pessoais completos em JSON (LGPD / GDPR)', async () => {
      const res = await request(app)
        .get('/api/lgpd/export')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.plataforma).toContain('Stylety');
      expect(res.body.lei_aplicavel).toContain('LGPD');
      expect(res.body.dados_criados).toBeDefined();
    });

    it('Deve agendar exclusão de conta em 30 dias conforme RNE004', async () => {
      const res = await request(app)
        .post('/api/lgpd/request-deletion')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.diasRestantes).toBe(30);
    });

    it('Deve criar backup automático do banco de dados (RNF006)', async () => {
      const res = await request(app)
        .post('/api/backup/create')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.backup.arquivo).toContain('backup_pinterest_');
    });
  });
});
