const app = require('./server/app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Stylety (Plataforma de Descoberta Visual) ON!`);
  console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🔒 Modo de segurança: LGPD & WCAG 2.1 AA Ativados`);
  console.log(`====================================================`);
});

module.exports = server;
