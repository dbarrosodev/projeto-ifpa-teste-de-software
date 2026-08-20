const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'stylety.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      data_nascimento TEXT NOT NULL,
      bio TEXT DEFAULT '',
      foto_perfil_url TEXT DEFAULT '',
      tipo_conta TEXT DEFAULT 'pessoal', -- 'pessoal' | 'business'
      role TEXT DEFAULT 'usuario', -- 'visitante' | 'usuario' | 'moderador'
      perfil_privado INTEGER DEFAULT 0,
      two_factor_enabled INTEGER DEFAULT 0,
      two_factor_secret TEXT DEFAULT '',
      lgpd_consent INTEGER DEFAULT 1,
      status_conta TEXT DEFAULT 'ativa', -- 'ativa' | 'suspensa' | 'banida' | 'exclusao_pendente'
      exclusao_agendada_para TEXT NULL,
      topicos_interesse TEXT DEFAULT '["Design", "Fotografia", "Tecnologia", "Viagens"]',
      data_criacao TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pastas (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      categoria TEXT DEFAULT 'Geral',
      visibilidade TEXT DEFAULT 'publica', -- 'publica' | 'secreta'
      data_criacao TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pasta_colaboradores (
      id TEXT PRIMARY KEY,
      pasta_id TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      permissao TEXT DEFAULT 'editor',
      data_criacao TEXT NOT NULL,
      FOREIGN KEY (pasta_id) REFERENCES pastas(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      UNIQUE(pasta_id, usuario_id)
    );

    CREATE TABLE IF NOT EXISTS pins (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      midia_url TEXT NOT NULL,
      tipo_midia TEXT DEFAULT 'imagem', -- 'imagem' | 'video'
      texto_alternativo TEXT DEFAULT '',
      link_destino TEXT DEFAULT '',
      categoria TEXT DEFAULT 'Geral',
      tags TEXT DEFAULT '[]',
      cor_dominante TEXT DEFAULT '#e60023',
      visual_features TEXT DEFAULT '[]',
      denuncias_count INTEGER DEFAULT 0,
      oculto_preventivo INTEGER DEFAULT 0,
      data_criacao TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pasta_pins (
      id TEXT PRIMARY KEY,
      pasta_id TEXT NOT NULL,
      pin_id TEXT NOT NULL,
      secao TEXT DEFAULT '',
      data_salvo TEXT NOT NULL,
      FOREIGN KEY (pasta_id) REFERENCES pastas(id) ON DELETE CASCADE,
      FOREIGN KEY (pin_id) REFERENCES pins(id) ON DELETE CASCADE,
      UNIQUE(pasta_id, pin_id)
    );

    CREATE TABLE IF NOT EXISTS curtidas (
      id TEXT PRIMARY KEY,
      pin_id TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      data_criacao TEXT NOT NULL,
      FOREIGN KEY (pin_id) REFERENCES pins(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      UNIQUE(pin_id, usuario_id)
    );

    CREATE TABLE IF NOT EXISTS comentarios (
      id TEXT PRIMARY KEY,
      pin_id TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      parent_id TEXT DEFAULT NULL,
      texto TEXT NOT NULL,
      imagem_url TEXT DEFAULT '',
      data_criacao TEXT NOT NULL,
      FOREIGN KEY (pin_id) REFERENCES pins(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comentarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seguidores (
      id TEXT PRIMARY KEY,
      seguidor_id TEXT NOT NULL,
      seguido_id TEXT NOT NULL,
      data_criacao TEXT NOT NULL,
      FOREIGN KEY (seguidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (seguido_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      UNIQUE(seguidor_id, seguido_id)
    );

    CREATE TABLE IF NOT EXISTS notificacoes (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      remetente_id TEXT NULL,
      tipo TEXT NOT NULL, -- 'novo_seguidor' | 'curtida' | 'comentario' | 'novo_pin' | 'sistema'
      mensagem TEXT NOT NULL,
      link_alvo TEXT DEFAULT '',
      lida INTEGER DEFAULT 0,
      data_criacao TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS denuncias (
      id TEXT PRIMARY KEY,
      denunciante_id TEXT NOT NULL,
      tipo_alvo TEXT NOT NULL, -- 'pin' | 'comentario' | 'perfil'
      alvo_id TEXT NOT NULL,
      motivo TEXT NOT NULL,
      detalhes TEXT DEFAULT '',
      status TEXT DEFAULT 'pendente', -- 'pendente' | 'analisada' | 'resolvida' | 'rejeitada'
      decisao TEXT DEFAULT '',
      sla_limite TEXT NOT NULL,
      data_criacao TEXT NOT NULL,
      data_analise TEXT NULL,
      FOREIGN KEY (denunciante_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mensagens_diretas (
      id TEXT PRIMARY KEY,
      remetente_id TEXT NOT NULL,
      destinatario_id TEXT NOT NULL,
      texto TEXT DEFAULT '',
      pin_id TEXT NULL,
      lida INTEGER DEFAULT 0,
      data_criacao TEXT NOT NULL,
      FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (pin_id) REFERENCES pins(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS historico_buscas (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      termo TEXT NOT NULL,
      data_busca TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS backups_registro (
      id TEXT PRIMARY KEY,
      arquivo TEXT NOT NULL,
      tamanho_bytes INTEGER NOT NULL,
      data_backup TEXT NOT NULL
    );
  `);
}

initializeDatabase();

module.exports = {
  db,
  initializeDatabase,
  dbPath
};
