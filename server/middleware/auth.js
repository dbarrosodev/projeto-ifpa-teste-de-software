const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'stylety_secret_jwt_key_2026_ifpa';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token de autenticação não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, nome, email, data_nascimento, bio, foto_perfil_url, tipo_conta, role, perfil_privado, two_factor_enabled, status_conta, topicos_interesse, data_criacao FROM usuarios WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado ou token inválido.' });
    }

    if (user.status_conta === 'banida') {
      return res.status(403).json({ error: 'Esta conta foi banida permanentemente por violação das diretrizes da comunidade.' });
    }

    if (user.status_conta === 'suspensa') {
      return res.status(403).json({ error: 'Esta conta está temporariamente suspensa pela moderação.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token expirado ou inválido.' });
  }
}

function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, nome, email, data_nascimento, bio, foto_perfil_url, tipo_conta, role, perfil_privado, two_factor_enabled, status_conta, topicos_interesse, data_criacao FROM usuarios WHERE id = ?').get(decoded.id);
      if (user && user.status_conta !== 'banida' && user.status_conta !== 'suspensa') {
        req.user = user;
      }
    } catch (e) {
      // Ignored for optional auth
    }
  }
  next();
}

function requireModerator(req, res, next) {
  if (!req.user || req.user.role !== 'moderador') {
    return res.status(403).json({ error: 'Acesso restrito. Esta ação requer permissão de Moderador.' });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  optionalAuthenticateToken,
  requireModerator
};
