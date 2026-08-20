const express = require('express');
const cors = require('cors');
const path = require('path');
const { seedDatabase } = require('./services/seed');

const app = express();

// Seed inicial se necessário
seedDatabase();

// Middlewares globais
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos da pasta public e uploads
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Rotas da API RESTful
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/pins', require('./routes/pins.routes'));
app.use('/api/boards', require('./routes/boards.routes'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/feed', require('./routes/feed.routes'));
app.use('/api/interactions', require('./routes/interactions.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/messages', require('./routes/messages.routes'));
app.use('/api/moderation', require('./routes/moderation.routes'));
app.use('/api/lgpd', require('./routes/lgpd.routes'));
app.use('/api/backup', require('./routes/backup.routes'));

// RNF002 - Health check para monitoramento de disponibilidade (99,5% SLA)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    plataforma: 'Stylety IFPA Software Engine',
    versao: '1.0.0'
  });
});

// Fallback para SPA (Single Page Application)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint da API não encontrado.' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Middleware de tratamento global de erros
app.use((err, req, res, next) => {
  console.error('Erro na aplicação:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Ocorreu um erro interno no servidor.'
  });
});

module.exports = app;
