const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { upload, processMedia } = require('../middleware/upload');

// Helper to calculate age from birth date
function calculateAge(birthDateString) {
  const birthDate = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// RF001 & RNE001 – Cadastro de usuário com validação de idade mínima
router.post('/register', (req, res) => {
  try {
    const { nome, email, senha, dataNascimento, tipoConta = 'pessoal', role = 'usuario', topicosInteresse } = req.body;

    if (!nome || !email || !senha || !dataNascimento) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos: nome, email, senha e data de nascimento.' });
    }

    // Regra RNE001 - Idade mínima de 13 anos
    const age = calculateAge(dataNascimento);
    if (isNaN(age) || age < 13) {
      return res.status(400).json({
        error: 'Idade mínima não atingida. O Stylety exige no mínimo 13 anos de idade para criação de conta (Regra RNE001).'
      });
    }

    // Regra RNE001 - Contas entre 13 e 18 anos com perfil privado por padrão
    const isMinor = age < 18;
    const perfilPrivado = isMinor ? 1 : 0;

    // Verificar se email já existe
    const existing = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado na plataforma.' });
    }

    // RNF003 - Criptografia de senha com salt e hash
    const senhaHash = bcrypt.hashSync(senha, 10);
    const userId = uuidv4();
    const dataCriacao = new Date().toISOString();
    const topicos = topicosInteresse ? JSON.stringify(topicosInteresse) : JSON.stringify(["Design", "Fotografia", "Tecnologia", "Viagens"]);

    db.prepare(`
      INSERT INTO usuarios (
        id, nome, email, senha_hash, data_nascimento, bio, foto_perfil_url, 
        tipo_conta, role, perfil_privado, two_factor_enabled, lgpd_consent, 
        status_conta, topicos_interesse, data_criacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 'ativa', ?, ?)
    `).run(
      userId,
      nome.trim(),
      email.toLowerCase().trim(),
      senhaHash,
      dataNascimento,
      '',
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nome)}`,
      tipoConta,
      role,
      perfilPrivado,
      topicos,
      dataCriacao
    );

    // Criar pasta padrão pública para o usuário
    const defaultBoardId = uuidv4();
    db.prepare(`
      INSERT INTO pastas (id, usuario_id, titulo, descricao, categoria, visibilidade, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(defaultBoardId, userId, 'Favoritos', 'Minha pasta de ideias salvas', 'Geral', 'publica', dataCriacao);

    // Gerar JWT Token
    const token = jwt.sign({ id: userId, email: email.toLowerCase().trim(), role }, JWT_SECRET, { expiresIn: '7d' });

    const newUser = db.prepare('SELECT id, nome, email, data_nascimento, bio, foto_perfil_url, tipo_conta, role, perfil_privado, two_factor_enabled, status_conta, topicos_interesse, data_criacao FROM usuarios WHERE id = ?').get(userId);

    return res.status(201).json({
      message: 'Cadastro realizado com sucesso!',
      user: { ...newUser, topicos_interesse: JSON.parse(newUser.topicos_interesse || '[]') },
      token,
      isMinorNotice: isMinor ? 'Por ter menos de 18 anos, seu perfil foi configurado como privado por padrão para sua proteção (RNE001).' : null
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro interno ao realizar cadastro.' });
  }
});

// RF001 – Autenticação (Login) com suporte a 2FA
router.post('/login', (req, res) => {
  try {
    const { email, senha, twoFactorCode } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (user.status_conta === 'banida') {
      return res.status(403).json({ error: 'Sua conta foi banida permanentemente pela equipe de moderação.' });
    }

    if (user.status_conta === 'suspensa') {
      return res.status(403).json({ error: 'Sua conta está suspensa temporariamente por moderação.' });
    }

    const validPassword = bcrypt.compareSync(senha, user.senha_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // 2FA Check (RNF003)
    if (user.two_factor_enabled) {
      if (!twoFactorCode) {
        return res.status(200).json({
          requires2FA: true,
          message: 'Autenticação de dois fatores (2FA) necessária.',
          userId: user.id
        });
      }
      // Demo code or matching secret
      if (twoFactorCode !== user.two_factor_secret && twoFactorCode !== '123456') {
        return res.status(400).json({ error: 'Código 2FA incorreto ou expirado.' });
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const safeUser = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      data_nascimento: user.data_nascimento,
      bio: user.bio,
      foto_perfil_url: user.foto_perfil_url,
      tipo_conta: user.tipo_conta,
      role: user.role,
      perfil_privado: user.perfil_privado,
      two_factor_enabled: user.two_factor_enabled,
      status_conta: user.status_conta,
      topicos_interesse: JSON.parse(user.topicos_interesse || '[]'),
      data_criacao: user.data_criacao
    };

    return res.json({
      message: 'Login realizado com sucesso!',
      user: safeUser,
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno no servidor ao fazer login.' });
  }
});

// RF001 & Casos de Uso – Login com Provedores Externos (Google, Facebook, Apple)
router.post('/social-login', (req, res) => {
  try {
    const { provider, email, nome, dataNascimento = '2000-01-01' } = req.body;

    if (!provider || !email || !nome) {
      return res.status(400).json({ error: 'Provedor, e-mail e nome são obrigatórios.' });
    }

    let user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email.toLowerCase().trim());

    if (!user) {
      const age = calculateAge(dataNascimento);
      if (age < 13) {
        return res.status(400).json({ error: 'Idade mínima não atingida (RNE001).' });
      }
      const userId = uuidv4();
      const senhaHash = bcrypt.hashSync(uuidv4(), 10);
      const dataCriacao = new Date().toISOString();
      const isMinor = age < 18;

      db.prepare(`
        INSERT INTO usuarios (
          id, nome, email, senha_hash, data_nascimento, bio, foto_perfil_url,
          tipo_conta, role, perfil_privado, two_factor_enabled, lgpd_consent,
          status_conta, topicos_interesse, data_criacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pessoal', 'usuario', ?, 0, 1, 'ativa', ?, ?)
      `).run(
        userId,
        nome,
        email.toLowerCase().trim(),
        senhaHash,
        dataNascimento,
        `Conta conectada via ${provider}`,
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nome)}`,
        isMinor ? 1 : 0,
        JSON.stringify(["Design", "Fotografia", "Tecnologia", "Viagens"]),
        dataCriacao
      );

      // Pasta padrão
      db.prepare(`
        INSERT INTO pastas (id, usuario_id, titulo, descricao, categoria, visibilidade, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, 'Favoritos', 'Minha pasta de ideias salvas', 'Geral', 'publica', dataCriacao);

      user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(userId);
    }

    if (user.status_conta === 'banida' || user.status_conta === 'suspensa') {
      return res.status(403).json({ error: 'Esta conta está suspensa ou banida.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: `Login realizado com sucesso via ${provider}!`,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        data_nascimento: user.data_nascimento,
        bio: user.bio,
        foto_perfil_url: user.foto_perfil_url,
        tipo_conta: user.tipo_conta,
        role: user.role,
        perfil_privado: user.perfil_privado,
        two_factor_enabled: user.two_factor_enabled,
        status_conta: user.status_conta,
        topicos_interesse: JSON.parse(user.topicos_interesse || '[]'),
        data_criacao: user.data_criacao
      },
      token
    });
  } catch (error) {
    console.error('Erro no social login:', error);
    return res.status(500).json({ error: 'Erro ao autenticar com provedor externo.' });
  }
});

// RF001 – Obter dados do usuário autenticado
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, nome, email, data_nascimento, bio, foto_perfil_url, tipo_conta, role, perfil_privado, two_factor_enabled, status_conta, topicos_interesse, data_criacao FROM usuarios WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }
  return res.json({
    user: { ...user, topicos_interesse: JSON.parse(user.topicos_interesse || '[]') }
  });
});

// RF001 – Edição de Perfil (nome, foto, bio, tipo de conta)
router.put('/profile', authenticateToken, upload.single('fotoPerfil'), async (req, res) => {
  try {
    const { nome, bio, tipoConta, perfilPrivado, topicosInteresse } = req.body;
    let fotoPerfilUrl = req.body.fotoPerfilUrl;

    if (req.file) {
      const processed = await processMedia(req.file);
      if (processed) {
        fotoPerfilUrl = processed.url;
      }
    }

    const current = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.user.id);

    const updatedNome = nome !== undefined ? nome.trim() : current.nome;
    const updatedBio = bio !== undefined ? bio.trim() : current.bio;
    const updatedFoto = fotoPerfilUrl !== undefined ? fotoPerfilUrl : current.foto_perfil_url;
    const updatedTipoConta = (tipoConta === 'business' || tipoConta === 'pessoal') ? tipoConta : current.tipo_conta;
    const updatedPrivado = perfilPrivado !== undefined ? (perfilPrivado ? 1 : 0) : current.perfil_privado;
    let updatedTopicos = current.topicos_interesse;

    if (topicosInteresse) {
      try {
        const parsed = typeof topicosInteresse === 'string' ? JSON.parse(topicosInteresse) : topicosInteresse;
        updatedTopicos = JSON.stringify(parsed);
      } catch (e) {
        // keep old
      }
    }

    db.prepare(`
      UPDATE usuarios 
      SET nome = ?, bio = ?, foto_perfil_url = ?, tipo_conta = ?, perfil_privado = ?, topicos_interesse = ?
      WHERE id = ?
    `).run(updatedNome, updatedBio, updatedFoto, updatedTipoConta, updatedPrivado, updatedTopicos, req.user.id);

    const updatedUser = db.prepare('SELECT id, nome, email, data_nascimento, bio, foto_perfil_url, tipo_conta, role, perfil_privado, two_factor_enabled, status_conta, topicos_interesse, data_criacao FROM usuarios WHERE id = ?').get(req.user.id);

    return res.json({
      message: 'Perfil atualizado com sucesso!',
      user: { ...updatedUser, topicos_interesse: JSON.parse(updatedUser.topicos_interesse || '[]') }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// RNF003 – Ativação/Desativação de 2FA (Two-Factor Authentication)
router.post('/2fa/toggle', authenticateToken, (req, res) => {
  try {
    const { enable } = req.body;
    const current = db.prepare('SELECT two_factor_enabled FROM usuarios WHERE id = ?').get(req.user.id);

    if (enable) {
      // Gerar código fixo de demonstração / secret (ex: 6 dígitos)
      const secret = Math.floor(100000 + Math.random() * 900000).toString();
      db.prepare('UPDATE usuarios SET two_factor_enabled = 1, two_factor_secret = ? WHERE id = ?').run(secret, req.user.id);

      return res.json({
        message: 'Autenticação de Dois Fatores (2FA) ativada com sucesso!',
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        instructions: `Seu código de verificação 2FA é: ${secret} (ou você pode usar 123456 em modo de teste).`
      });
    } else {
      db.prepare("UPDATE usuarios SET two_factor_enabled = 0, two_factor_secret = '' WHERE id = ?").run(req.user.id);
      return res.json({
        message: 'Autenticação de Dois Fatores (2FA) desativada.',
        twoFactorEnabled: false
      });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao alterar configuração de 2FA.' });
  }
});

module.exports = router;
