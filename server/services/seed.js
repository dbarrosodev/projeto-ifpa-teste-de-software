const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get().count;
  if (userCount > 0) {
    console.log('Banco de dados já possui registros. Pulando seed inicial.');
    return;
  }

  console.log('Iniciando seed completo do Stylety com todos os perfis temáticos e comentários enriquecidos...');

  const senhaComum = bcrypt.hashSync('senha123', 10);
  const senhaAdmin = bcrypt.hashSync('admin123', 10);
  const now = new Date().toISOString();

  // 1. Usuários Principais
  const usuarios = [
    {
      id: 'usr-mod-001',
      nome: 'Moderador Geral',
      email: 'moderador@stylety.local',
      senha_hash: senhaAdmin,
      data_nascimento: '1990-05-15',
      bio: 'Equipe oficial de moderação e diretrizes da comunidade Stylety IFPA.',
      foto_perfil_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      tipo_conta: 'pessoal',
      role: 'moderador',
      perfil_privado: 0,
      two_factor_enabled: 1,
      two_factor_secret: '123456',
      topicos_interesse: JSON.stringify(['Videogames', 'Hambúrgueres', 'Natureza', 'Mulheres', 'Vôlei', 'Motos', 'Academia', 'Maconha'])
    },
    // Daniel -> Videogames
    {
      id: 'usr-dan-002',
      nome: 'Daniel Barroso',
      email: 'daniel@stylety.local',
      senha_hash: senhaComum,
      data_nascimento: '1998-03-22',
      bio: 'Gamer inveterado, criador de setups imersivos, fã de pixel art, simuladores e consoles retrô.',
      foto_perfil_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      tipo_conta: 'pessoal',
      role: 'usuario',
      perfil_privado: 0,
      two_factor_enabled: 0,
      two_factor_secret: '',
      topicos_interesse: JSON.stringify(['Videogames', 'Tecnologia', 'Design'])
    },
    // Débora -> Hambúrgueres
    {
      id: 'usr-deb-003',
      nome: 'Débora Vitória',
      email: 'debora@stylety.local',
      senha_hash: senhaComum,
      data_nascimento: '2001-08-14',
      bio: 'Chef hamburgueira artesanal. Criando receitas de smash burgers, queijos especiais e molhos autorais.',
      foto_perfil_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      tipo_conta: 'business',
      role: 'usuario',
      perfil_privado: 0,
      two_factor_enabled: 0,
      two_factor_secret: '',
      topicos_interesse: JSON.stringify(['Hambúrgueres', 'Gastronomia', 'Culinária'])
    },
    // Wagner -> Natureza
    {
      id: 'usr-wag-004',
      nome: 'Wagner Leandro',
      email: 'wagner@stylety.local',
      senha_hash: senhaComum,
      data_nascimento: '1995-11-30',
      bio: 'Explorador da vida ao ar livre, fotógrafo de paisagens selvagens, montanhas, florestas e cachoeiras.',
      foto_perfil_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
      tipo_conta: 'pessoal',
      role: 'usuario',
      perfil_privado: 0,
      two_factor_enabled: 0,
      two_factor_secret: '',
      topicos_interesse: JSON.stringify(['Natureza', 'Viagens', 'Fotografia'])
    },
    // Ruan -> Mulheres
    {
      id: 'usr-ruan-006',
      nome: 'Ruan Samuel',
      email: 'ruan@stylety.local',
      senha_hash: senhaComum,
      data_nascimento: '1999-04-10',
      bio: 'Fotógrafo e curador de moda feminina, retratos em luz natural, estilo contemporâneo e ensaios elegantes.',
      foto_perfil_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      tipo_conta: 'pessoal',
      role: 'usuario',
      perfil_privado: 0,
      two_factor_enabled: 0,
      two_factor_secret: '',
      topicos_interesse: JSON.stringify(['Mulheres', 'Moda', 'Fotografia'])
    },
    // Thiago -> Vôlei
    {
      id: 'usr-thiago-007',
      nome: 'Thiago Willames',
      email: 'thiago@stylety.local',
      senha_hash: senhaComum,
      data_nascimento: '1997-09-25',
      bio: 'Atleta de voleibol de quadra e praia, focado em jogadas aéreas, saques potentes e torneios competitivos.',
      foto_perfil_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
      tipo_conta: 'pessoal',
      role: 'usuario',
      perfil_privado: 0,
      two_factor_enabled: 0,
      two_factor_secret: '',
      topicos_interesse: JSON.stringify(['Vôlei', 'Esportes', 'Saúde'])
    },
    // Emanuel -> Moto
    {
      id: 'usr-emanuel-008',
      nome: 'Emanuel Gomes',
      email: 'emanuel@stylety.local',
      senha_hash: senhaComum,
      data_nascimento: '1996-12-05',
      bio: 'Piloto e entusiasta de Superbikes, customizador de Cafe Racers e apaixonado por viagens sobre duas rodas.',
      foto_perfil_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
      tipo_conta: 'pessoal',
      role: 'usuario',
      perfil_privado: 0,
      two_factor_enabled: 0,
      two_factor_secret: '',
      topicos_interesse: JSON.stringify(['Motos', 'Velocidade', 'Custom'])
    },
    // Pedro -> Academia
    {
      id: 'usr-pedro-009',
      nome: 'Pedro Henrique',
      email: 'pedro@stylety.local',
      senha_hash: senhaComum,
      data_nascimento: '1996-07-18',
      bio: 'Atleta de musculação e calistenia. Foco total em hipertrofia, levantamentos pesados e dieta de alta performance.',
      foto_perfil_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      tipo_conta: 'pessoal',
      role: 'usuario',
      perfil_privado: 0,
      two_factor_enabled: 0,
      two_factor_secret: '',
      topicos_interesse: JSON.stringify(['Academia', 'Fitness', 'Musculação', 'Nutrição'])
    },
    // Kamilla -> Maconha / Cultura Canábica
    {
      id: 'usr-kamilla-010',
      nome: 'Kamilla Santos',
      email: 'kamilla@stylety.local',
      senha_hash: senhaComum,
      data_nascimento: '1998-10-20',
      bio: 'Entusiasta de cultura canábica, botânica, macrofotografia de flores, arte psicodélica e produtos de cânhamo.',
      foto_perfil_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      tipo_conta: 'pessoal',
      role: 'usuario',
      perfil_privado: 0,
      two_factor_enabled: 0,
      two_factor_secret: '',
      topicos_interesse: JSON.stringify(['Maconha', 'Cultura Canábica', 'Botânica', 'Estilo 420'])
    },
    {
      id: 'usr-min-005',
      nome: 'Jovem Criativo (16 anos)',
      email: 'jovem@stylety.local',
      senha_hash: senhaComum,
      data_nascimento: '2010-06-10',
      bio: 'Estudante de artes visuais, design e ilustração.',
      foto_perfil_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      tipo_conta: 'pessoal',
      role: 'usuario',
      perfil_privado: 1,
      two_factor_enabled: 0,
      two_factor_secret: '',
      topicos_interesse: JSON.stringify(['Videogames', 'Natureza', 'Design'])
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO usuarios (
      id, nome, email, senha_hash, data_nascimento, bio, foto_perfil_url,
      tipo_conta, role, perfil_privado, two_factor_enabled, two_factor_secret,
      lgpd_consent, status_conta, topicos_interesse, data_criacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ativa', ?, ?)
  `);

  usuarios.forEach(u => {
    insertUser.run(
      u.id, u.nome, u.email, u.senha_hash, u.data_nascimento, u.bio,
      u.foto_perfil_url, u.tipo_conta, u.role, u.perfil_privado,
      u.two_factor_enabled, u.two_factor_secret, u.topicos_interesse, now
    );
  });

  // 2. Pastas (Boards)
  const pastas = [
    // Daniel -> Videogames
    { id: 'brd-dan-01', usuario_id: 'usr-dan-002', titulo: 'Setups Gamer & Cyberpunk', descricao: 'Setups ultramodernos com iluminação RGB e monitores ultrawide.', categoria: 'Videogames', visibilidade: 'publica' },
    { id: 'brd-dan-02', usuario_id: 'usr-dan-002', titulo: 'Jogos Retrô & Clássicos', descricao: 'Consoles clássicos de 8/16/32 bits, arcades e cartuchos icônicos.', categoria: 'Videogames', visibilidade: 'publica' },
    { id: 'brd-dan-03', usuario_id: 'usr-dan-002', titulo: 'Arte Conceitual de Games', descricao: 'Cenários épicos, RPGs e concept art em Unreal Engine.', categoria: 'Videogames', visibilidade: 'publica' },
    
    // Débora -> Hambúrgueres
    { id: 'brd-deb-01', usuario_id: 'usr-deb-003', titulo: 'Hambúrgueres Artesanais & Smash', descricao: 'Burgers suculentos com crosta perfeita, queijo derretido e pão brioche.', categoria: 'Hambúrgueres', visibilidade: 'publica' },
    { id: 'brd-deb-02', usuario_id: 'usr-deb-003', titulo: 'Burgers Gourmet & Queijos Especiais', descricao: 'Combinações com cheddar inglês, gorgonzola e bacon.', categoria: 'Hambúrgueres', visibilidade: 'publica' },
    { id: 'brd-deb-03', usuario_id: 'usr-deb-003', titulo: 'Acompanhamentos & Molhos Secretos', descricao: 'Batatas rústicas com alecrim e maioneses artesanais.', categoria: 'Hambúrgueres', visibilidade: 'publica' },

    // Wagner -> Natureza
    { id: 'brd-wag-01', usuario_id: 'usr-wag-004', titulo: 'Paisagens Naturais & Montanhas', descricao: 'Picos nevados, mirantes alpinos e horizontes impressionantes.', categoria: 'Natureza', visibilidade: 'publica' },
    { id: 'brd-wag-02', usuario_id: 'usr-wag-004', titulo: 'Florestas & Cachoeiras Selvagens', descricao: 'Mata Atlântica, quedas dágua e trilhas ecológicas.', categoria: 'Natureza', visibilidade: 'publica' },
    { id: 'brd-wag-03', usuario_id: 'usr-wag-004', titulo: 'Praias Selvagens & Amanheceres', descricao: 'Costas preservadas, mar cristalino e luz da manhã.', categoria: 'Natureza', visibilidade: 'publica' },

    // Ruan -> Mulheres
    { id: 'brd-ruan-01', usuario_id: 'usr-ruan-006', titulo: 'Retratos Femininos em Luz Natural', descricao: 'Ensaios sensíveis com foco na expressão, iluminação e naturalidade.', categoria: 'Mulheres', visibilidade: 'publica' },
    { id: 'brd-ruan-02', usuario_id: 'usr-ruan-006', titulo: 'Moda Feminina & Streetwear', descricao: 'Tendências de estilo urbano, sobreposições e elegância casual.', categoria: 'Mulheres', visibilidade: 'publica' },
    { id: 'brd-ruan-03', usuario_id: 'usr-ruan-006', titulo: 'Ensaios de Alta Costura & Beleza', descricao: 'Fotografia editorial, maquiagem artística e estética moderna.', categoria: 'Mulheres', visibilidade: 'publica' },

    // Thiago -> Vôlei
    { id: 'brd-thiago-01', usuario_id: 'usr-thiago-007', titulo: 'Vôlei de Praia & Torneios de Areia', descricao: 'Disputas na praia, saques no sol e defesas na areia.', categoria: 'Vôlei', visibilidade: 'publica' },
    { id: 'brd-thiago-02', usuario_id: 'usr-thiago-007', titulo: 'Vôlei de Quadra & Ralis Épicos', descricao: 'Ataques na rede, levantamentos precisos e bloqueios decisivos.', categoria: 'Vôlei', visibilidade: 'publica' },
    { id: 'brd-thiago-03', usuario_id: 'usr-thiago-007', titulo: 'Treinos Táticos & Preparação Física', descricao: 'Exercícios de impulsão vertical e táticas esportivas.', categoria: 'Vôlei', visibilidade: 'publica' },

    // Emanuel -> Motos
    { id: 'brd-emanuel-01', usuario_id: 'usr-emanuel-008', titulo: 'Superbikes & Velocidade nas Pistas', descricao: 'Ducati, BMW e motos esportivas de alta cilindrada.', categoria: 'Motos', visibilidade: 'publica' },
    { id: 'brd-emanuel-02', usuario_id: 'usr-emanuel-008', titulo: 'Cafe Racers & Motos Vintage Custom', descricao: 'Projetos customizados artesanais e motores clássicos.', categoria: 'Motos', visibilidade: 'publica' },
    { id: 'brd-emanuel-03', usuario_id: 'usr-emanuel-008', titulo: 'Viagens de Moto & Estradas', descricao: 'Aventuras sobre duas rodas pelas rodovias mais belas.', categoria: 'Motos', visibilidade: 'publica' },

    // Pedro -> Academia
    { id: 'brd-pedro-01', usuario_id: 'usr-pedro-009', titulo: 'Treinos Pesados & Hipertrofia', descricao: 'Levantamentos com barras olímpicas, halteres pesados e execução perfeita.', categoria: 'Academia', visibilidade: 'publica' },
    { id: 'brd-pedro-02', usuario_id: 'usr-pedro-009', titulo: 'Calistenia & Treinos Funcionais', descricao: 'Controle corporal absoluto, barras, paralelas e movimentos avançados.', categoria: 'Academia', visibilidade: 'publica' },
    { id: 'brd-pedro-03', usuario_id: 'usr-pedro-009', titulo: 'Dieta & Nutrição Anabólica', descricao: 'Refeições ricas em proteínas, pós-treino nutritivo e foco nos macros.', categoria: 'Academia', visibilidade: 'publica' },

    // Kamilla -> Maconha / Cultura Canábica
    { id: 'brd-kamilla-01', usuario_id: 'usr-kamilla-010', titulo: 'Macrofotografia & Flores Canábicas', descricao: 'Close-ups fascinantes revelando tricomas cristalinos e tons roxos e verdes.', categoria: 'Maconha', visibilidade: 'publica' },
    { id: 'brd-kamilla-02', usuario_id: 'usr-kamilla-010', titulo: 'Acessórios de Vidro Soprado & Bongs', descricao: 'Peças artesanais de vidro borossilicato com detalhes furta-cor e design artístico.', categoria: 'Maconha', visibilidade: 'publica' },
    { id: 'brd-kamilla-03', usuario_id: 'usr-kamilla-010', titulo: 'Moda & Produtos Sustentáveis de Cânhamo', descricao: 'Roupas, tecidos ecológicos e acessórios feitos 100% de fibras de cânhamo.', categoria: 'Maconha', visibilidade: 'publica' }
  ];

  const insertBoard = db.prepare(`
    INSERT INTO pastas (id, usuario_id, titulo, descricao, categoria, visibilidade, data_criacao)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  pastas.forEach(p => insertBoard.run(p.id, p.usuario_id, p.titulo, p.descricao, p.categoria, p.visibilidade, now));

  // 3. Pins Temáticos
  const pins = [
    // === DANIEL: VIDEOGAMES ===
    {
      id: 'pin-dan-game-01',
      usuario_id: 'usr-dan-002',
      titulo: 'Setup Gamer Cyberpunk com Neon e Monitor Curvo Ultrawide',
      descricao: 'Ambiente imersivo com iluminação LED ciano e magenta, teclado mecânico custom e suporte de headset iluminado.',
      midia_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Setup de computador gamer com tela ultrawide curva e iluminação ambiente colorida em neon',
      link_destino: 'https://exemplo.com/gaming-room-cyberpunk',
      categoria: 'Videogames',
      tags: JSON.stringify(['videogames', 'games', 'setup', 'cyberpunk', 'pcgamer', 'rgb', 'tech']),
      cor_dominante: '#391d57',
      pastaId: 'brd-dan-01'
    },
    {
      id: 'pin-dan-game-02',
      usuario_id: 'usr-dan-002',
      titulo: 'Coleção de Joysticks & Consoles Clássicos Retrô',
      descricao: 'O charme nostálgico dos videogames das eras 8 e 16 bits. Controles preservados e fitas clássicas.',
      midia_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Controle de videogame clássico sobre mesa de madeira com cabos e estética retrô',
      link_destino: 'https://exemplo.com/consoles-retro',
      categoria: 'Videogames',
      tags: JSON.stringify(['videogames', 'retro', 'games', 'arcade', 'nostalgia', 'colecionavel']),
      cor_dominante: '#4c6275',
      pastaId: 'brd-dan-02'
    },
    {
      id: 'pin-dan-game-03',
      usuario_id: 'usr-dan-002',
      titulo: 'Simulador de Corrida Profissional com Volante Force Feedback',
      descricao: 'Cockpit de automobilismo virtual com três telas panorâmicas, pedais hidráulicos e assento tipo concha.',
      midia_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Simulador de corrida com volante esportivo e jogo na tela',
      link_destino: 'https://exemplo.com/simulador-esports',
      categoria: 'Videogames',
      tags: JSON.stringify(['videogames', 'simulador', 'corrida', 'esports', 'automobilismo']),
      cor_dominante: '#222831',
      pastaId: 'brd-dan-01'
    },
    {
      id: 'pin-dan-game-04',
      usuario_id: 'usr-dan-002',
      titulo: 'Arte Conceitual Futurista de Cidade Sci-Fi para RPG de Aventura',
      descricao: 'Renderização volumétrica em Unreal Engine 5 explorando arquitetura futurista e naves flutuantes.',
      midia_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Ilustração digital de cidade futurista com luzes holográficas para game',
      link_destino: 'https://exemplo.com/game-art-scifi',
      categoria: 'Videogames',
      tags: JSON.stringify(['videogames', 'gameart', 'scifi', 'unrealengine', 'rpg', 'conceptart']),
      cor_dominante: '#1b2a47',
      pastaId: 'brd-dan-03'
    },
    {
      id: 'pin-dan-game-05',
      usuario_id: 'usr-dan-002',
      titulo: 'Teclado Mecânico Customizado com Keycaps Artesanais e Switch Tátil',
      descricao: 'Montagem artesanal de teclado mecânico 65% com placa de latão, lubrificação Krytox e iluminação RGB quente.',
      midia_url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Teclado mecânico elegante iluminado em tons suaves sobre deskmat texturizado',
      link_destino: 'https://exemplo.com/custom-keyboards',
      categoria: 'Videogames',
      tags: JSON.stringify(['videogames', 'teclado', 'custom', 'hardware', 'setup', 'gamer']),
      cor_dominante: '#2d3436',
      pastaId: 'brd-dan-01'
    },

    // === DÉBORA: HAMBÚRGUERES ===
    {
      id: 'pin-deb-burg-01',
      usuario_id: 'usr-deb-003',
      titulo: 'Hambúrguer Artesanal com Queijo Cheddar Inglês e Bacon Crocante',
      descricao: 'Blend especial de 180g de costela e fraldinha, fatias generosas de queijo cheddar derretido e tiras crocantes de bacon.',
      midia_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Hambúrguer artesanal suculento com queijo derretido escorrendo e pão com gergelim',
      link_destino: 'https://exemplo.com/receita-burger-artesanal',
      categoria: 'Hambúrgueres',
      tags: JSON.stringify(['hamburgueres', 'burger', 'artesanal', 'cheddar', 'bacon', 'gastronomia']),
      cor_dominante: '#994c1c',
      pastaId: 'brd-deb-01'
    },
    {
      id: 'pin-deb-burg-02',
      usuario_id: 'usr-deb-003',
      titulo: 'Smash Burger Duplo com Crosta Caramelizada e Pão Brioche',
      descricao: 'Dois burgers prensados de 90g na chapa bem quente criando aquela crostinha perfeita com queijo prato e molho especial.',
      midia_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Dois smash burgers suculentos empilhados com queijo derretido no pão brioche dourado',
      link_destino: 'https://exemplo.com/smash-burger-perfeito',
      categoria: 'Hambúrgueres',
      tags: JSON.stringify(['hamburgueres', 'smashburger', 'brioche', 'chapa', 'culinaria', 'food']),
      cor_dominante: '#c57d38',
      pastaId: 'brd-deb-01'
    },
    {
      id: 'pin-deb-burg-03',
      usuario_id: 'usr-deb-003',
      titulo: 'Burger Gourmet com Gorgonzola, Rúcula e Geleia de Pimenta Defumada',
      descricao: 'Uma explosão de sabores sofisticados com queijo gorgonzola cremoso, folhas frescas de rúcula e redução picante.',
      midia_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Hambúrguer gourmet montado com rúcula verde, queijo gorgonzola e molho avermelhado',
      link_destino: 'https://exemplo.com/burger-gourmet-gorgonzola',
      categoria: 'Hambúrgueres',
      tags: JSON.stringify(['hamburgueres', 'gourmet', 'gorgonzola', 'rucula', 'delicia', 'receita']),
      cor_dominante: '#5c3a21',
      pastaId: 'brd-deb-02'
    },
    {
      id: 'pin-deb-burg-04',
      usuario_id: 'usr-deb-003',
      titulo: 'Combo Perfeito: Hambúrguer Clássico com Batatas Rústicas e Alecrim',
      descricao: 'Acompanhamento de batatas cortadas à mão com casca, assadas com azeite de oliva, alho e ramos de alecrim fresco.',
      midia_url: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Hambúrguer servido ao lado de porção de batatas fritas rústicas e molho maionese verde',
      link_destino: 'https://exemplo.com/combo-burger-batata',
      categoria: 'Hambúrgueres',
      tags: JSON.stringify(['hamburgueres', 'batatarustica', 'alecrim', 'combo', 'lanche', 'artesanal']),
      cor_dominante: '#e09f3e',
      pastaId: 'brd-deb-03'
    },
    {
      id: 'pin-deb-burg-05',
      usuario_id: 'usr-deb-003',
      titulo: 'Burger de Costela Defumada no Pão Australiano com Cebola Caramelizada',
      descricao: 'Carne desfiada macia temperada com rub de ervas, cebola roxa lentamente caramelizada na cerveja preta.',
      midia_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Hambúrguer com pão australiano escuro, carne de costela e cebola caramelizada brilhante',
      link_destino: 'https://exemplo.com/burger-pao-australiano',
      categoria: 'Hambúrgueres',
      tags: JSON.stringify(['hamburgueres', 'paoaustraliano', 'costela', 'bbq', 'defumado', 'cebolacaramelizada']),
      cor_dominante: '#2b1b17',
      pastaId: 'brd-deb-02'
    },

    // === WAGNER: NATUREZA ===
    {
      id: 'pin-wag-nat-01',
      usuario_id: 'usr-wag-004',
      titulo: 'Floresta Tropical com Raios de Sol entre a Folhagem Densa',
      descricao: 'A magia da luz matinal atravessando as copas das árvores na Mata Atlântica após a chuva da madrugada.',
      midia_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Floresta verdejante com raios de sol dourados filtrados através da névoa e árvores altas',
      link_destino: 'https://exemplo.com/fotografia-natureza-floresta',
      categoria: 'Natureza',
      tags: JSON.stringify(['natureza', 'floresta', 'arvores', 'sol', 'trilha', 'paisagem']),
      cor_dominante: '#2d4a22',
      pastaId: 'brd-wag-02'
    },
    {
      id: 'pin-wag-nat-02',
      usuario_id: 'usr-wag-004',
      titulo: 'Cachoeira de Águas Cristalinas em Cânion Rochoso',
      descricao: 'Queda dágua límpida formando piscina natural de tom esmeralda cercada por paredões de rocha calcária.',
      midia_url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Cachoeira exuberante desaguando em lagoa cristalina com pedras no fundo',
      link_destino: 'https://exemplo.com/cachoeiras-secretas',
      categoria: 'Natureza',
      tags: JSON.stringify(['natureza', 'cachoeira', 'agua', 'ecoturismo', 'aventura', 'paraiso']),
      cor_dominante: '#3a7d75',
      pastaId: 'brd-wag-02'
    },
    {
      id: 'pin-wag-nat-03',
      usuario_id: 'usr-wag-004',
      titulo: 'Pico das Montanhas Alpinas Acima das Nuvens ao Amanhecer',
      descricao: 'A imensidão da cordilheira com o mar de nuvens aos pés e o céu pintado de tons alaranjados e violetas.',
      midia_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Cume de montanha rochosa com vista panorâmica para o mar de nuvens e o sol nascente',
      link_destino: 'https://exemplo.com/montanhismo-alpes',
      categoria: 'Natureza',
      tags: JSON.stringify(['natureza', 'montanha', 'nuvens', 'amanhecer', 'alpes', 'cume']),
      cor_dominante: '#52616b',
      pastaId: 'brd-wag-01'
    },
    {
      id: 'pin-wag-nat-04',
      usuario_id: 'usr-wag-004',
      titulo: 'Lago Glacial Espelhado com Reflexo de Pinheiros e Neve',
      descricao: 'Águas incrivelmente calmas e transparentes como um espelho refletindo o céu azul puro das montanhas.',
      midia_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Lago calmo cercado por montanhas nevadas e floresta de pinheiros com reflexo perfeito',
      link_destino: 'https://exemplo.com/lagos-glaciais',
      categoria: 'Natureza',
      tags: JSON.stringify(['natureza', 'lago', 'reflexo', 'montanhas', 'paisagem', 'serenidade']),
      cor_dominante: '#1c4966',
      pastaId: 'brd-wag-01'
    },
    {
      id: 'pin-wag-nat-05',
      usuario_id: 'usr-wag-004',
      titulo: 'Praia Selvagem e Intocada com Coqueiros ao Entardecer',
      descricao: 'Areia clara, pedras esculpidas pela maré e o som tranquilo das ondas quebrando no fim de tarde.',
      midia_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Praia deserta paradisíaca com coqueiros e ondas suaves sob o céu rosado do pôr do sol',
      link_destino: 'https://exemplo.com/praias-selvagens',
      categoria: 'Natureza',
      tags: JSON.stringify(['natureza', 'praia', 'mar', 'coqueiros', 'sol', 'litoral']),
      cor_dominante: '#489fb5',
      pastaId: 'brd-wag-03'
    },

    // === RUAN: MULHERES ===
    {
      id: 'pin-ruan-mulher-01',
      usuario_id: 'usr-ruan-006',
      titulo: 'Retrato Feminino em Luz Natural Suave ao Entardecer',
      descricao: 'Ensaio fotográfico com iluminação de janela, destacando traços naturais, expressividade e tons quentes.',
      midia_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Close-up de mulher com olhar sereno e marcante sob iluminação suave de fim de tarde',
      link_destino: 'https://exemplo.com/retratos-femininos-luz-natural',
      categoria: 'Mulheres',
      tags: JSON.stringify(['mulheres', 'retrato', 'beleza', 'fotografia', 'estilo', 'moda']),
      cor_dominante: '#e5b89a',
      pastaId: 'brd-ruan-01'
    },
    {
      id: 'pin-ruan-mulher-02',
      usuario_id: 'usr-ruan-006',
      titulo: 'Streetwear Feminino Contemporâneo & Jaqueta Oversized',
      descricao: 'Composição urbana combinando jaqueta estruturada, calça cargo em alfaiataria e tênis retrô.',
      midia_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Modelo feminina com look streetwear fashion em calçada com arquitetura moderna',
      link_destino: 'https://exemplo.com/streetwear-feminino-look',
      categoria: 'Mulheres',
      tags: JSON.stringify(['mulheres', 'streetwear', 'moda', 'look', 'estilo', 'urbano']),
      cor_dominante: '#e8505b',
      pastaId: 'brd-ruan-02'
    },
    {
      id: 'pin-ruan-mulher-03',
      usuario_id: 'usr-ruan-006',
      titulo: 'Look Feminino de Alfaiataria em Tons Neutros de Linho',
      descricao: 'Blazer bege elegante com corte reto, calça pantalona e acessórios minimalistas banhados a ouro.',
      midia_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Mulher vestindo conjunto de alfaiataria bege elegante segurando bolsa de couro',
      link_destino: 'https://exemplo.com/alfaiataria-feminina-chic',
      categoria: 'Mulheres',
      tags: JSON.stringify(['mulheres', 'alfaiataria', 'elegancia', 'lookdodia', 'estilo', 'minimalismo']),
      cor_dominante: '#e2d4c0',
      pastaId: 'brd-ruan-02'
    },
    {
      id: 'pin-ruan-mulher-04',
      usuario_id: 'usr-ruan-006',
      titulo: 'Ensaio Fotográfico Feminino Artístico em Preto e Branco',
      descricao: 'Jogo expressivo de chiaroscuro valorizando silhueta, elegância e intensidade no olhar.',
      midia_url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Retrato artístico em preto e branco de jovem com olhar profundo e iluminação lateral',
      link_destino: 'https://exemplo.com/fotografia-artistica-feminina',
      categoria: 'Mulheres',
      tags: JSON.stringify(['mulheres', 'pretoebranco', 'ensaio', 'arte', 'fotografia', 'expressao']),
      cor_dominante: '#2b2b2b',
      pastaId: 'brd-ruan-03'
    },
    {
      id: 'pin-ruan-mulher-05',
      usuario_id: 'usr-ruan-006',
      titulo: 'Estilo Boho Chic com Vestido Fluido de Verão e Chapéu',
      descricao: 'Leveza e frescor em um vestido floral fluído para dias ensolarados com estética campestre.',
      midia_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Jovem com vestido de verão esvoaçante e chapéu de palha em campo aberto',
      link_destino: 'https://exemplo.com/vestidos-boho-verao',
      categoria: 'Mulheres',
      tags: JSON.stringify(['mulheres', 'vestido', 'verao', 'boho', 'estilo', 'primavera']),
      cor_dominante: '#fbe8a6',
      pastaId: 'brd-ruan-02'
    },

    // === THIAGO: VÔLEI ===
    {
      id: 'pin-thiago-vol-01',
      usuario_id: 'usr-thiago-007',
      titulo: 'Ataque Aéreo Potente em Partida Decisiva de Voleibol',
      descricao: 'Salto espetacular com alcance acima do bloqueio para uma cortada indefensável na diagonal curta.',
      midia_url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Jogador de vôlei no topo do salto acima da rede preparando ataque cortada',
      link_destino: 'https://exemplo.com/jogadas-volei-profissional',
      categoria: 'Vôlei',
      tags: JSON.stringify(['volei', 'voleibol', 'esporte', 'ataque', 'cortada', 'treino']),
      cor_dominante: '#2b580c',
      pastaId: 'brd-thiago-02'
    },
    {
      id: 'pin-thiago-vol-02',
      usuario_id: 'usr-thiago-007',
      titulo: 'Vôlei de Praia ao Pôr do Sol na Areia Dourada',
      descricao: 'Dupla em ação em torneio de areia com a bola pairando contra os reflexos dourados do sol poente.',
      midia_url: 'https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Jogo de vôlei de praia com a bola suspensa no ar e o sol no horizonte da praia',
      link_destino: 'https://exemplo.com/torneio-volei-praia',
      categoria: 'Vôlei',
      tags: JSON.stringify(['volei', 'voleidepraia', 'praia', 'esporte', 'areia', 'torneio']),
      cor_dominante: '#f6a970',
      pastaId: 'brd-thiago-01'
    },
    {
      id: 'pin-thiago-vol-03',
      usuario_id: 'usr-thiago-007',
      titulo: 'Defesa e Recepção Técnica de Manchete no Vôlei de Quadra',
      descricao: 'Posição baixa de equilíbrio e leitura de jogo para salvar um ataque veloz e armar o contra-ataque.',
      midia_url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Atleta de voleibol em posição de manchete na quadra recepcionando bola',
      link_destino: 'https://exemplo.com/fundamentos-defesa-volei',
      categoria: 'Vôlei',
      tags: JSON.stringify(['volei', 'defesa', 'manchete', 'quadra', 'tecnica', 'competicao']),
      cor_dominante: '#1f4068',
      pastaId: 'brd-thiago-02'
    },
    {
      id: 'pin-thiago-vol-04',
      usuario_id: 'usr-thiago-007',
      titulo: 'Bloqueio Duplo Impenetrável na Rede de Vôlei',
      descricao: 'Sincronia perfeita entre o central e o ponteiro para fechar o corredor e marcar ponto de bloqueio.',
      midia_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Dois jogadores subindo juntos na rede para bloquear o ataque adversário no vôlei',
      link_destino: 'https://exemplo.com/taticas-bloqueio-volei',
      categoria: 'Vôlei',
      tags: JSON.stringify(['volei', 'bloqueio', 'rede', 'ponto', 'equipe', 'esporte']),
      cor_dominante: '#10375c',
      pastaId: 'brd-thiago-02'
    },
    {
      id: 'pin-thiago-vol-05',
      usuario_id: 'usr-thiago-007',
      titulo: 'Treino de Impulsão e Levantamento de Alta Precisão',
      descricao: 'Exercícios específicos para ganho de salto vertical e distribuição rápida para os ponteiros.',
      midia_url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Levantador de voleibol com as mãos posicionadas para passe em treino',
      link_destino: 'https://exemplo.com/treino-levantador-volei',
      categoria: 'Vôlei',
      tags: JSON.stringify(['volei', 'levantamento', 'treino', 'impulsao', 'preparacao', 'atleta']),
      cor_dominante: '#0b525b',
      pastaId: 'brd-thiago-03'
    },

    // === EMANUEL: MOTOS ===
    {
      id: 'pin-emanuel-moto-01',
      usuario_id: 'usr-emanuel-008',
      titulo: 'Ducati Panigale V4 Vermelha em Curva Inclinada de Pista',
      descricao: 'Potência brutal de 214 cv com pacote aerodinâmico de asas integradas e chassi de alumínio ultraleve.',
      midia_url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Moto superesportiva vermelha Ducati inclinada ao máximo na curva de autódromo',
      link_destino: 'https://exemplo.com/superbike-ducati-panigale',
      categoria: 'Motos',
      tags: JSON.stringify(['motos', 'ducati', 'superbike', 'velocidade', 'autodromo', 'motociclismo']),
      cor_dominante: '#cc1414',
      pastaId: 'brd-emanuel-01'
    },
    {
      id: 'pin-emanuel-moto-02',
      usuario_id: 'usr-emanuel-008',
      titulo: 'Cafe Racer Customizada com Banco em Couro e Tanque de Alumínio Escovado',
      descricao: 'Projeto artesanal único mantendo a pureza mecânica das motos britânicas clássicas com acabamento nobre.',
      midia_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Moto Cafe Racer preta com assento de couro artesanal e motor cromado',
      link_destino: 'https://exemplo.com/cafe-racer-projetos',
      categoria: 'Motos',
      tags: JSON.stringify(['motos', 'caferacer', 'custom', 'vintage', 'design', 'duasrodas']),
      cor_dominante: '#4a3f35',
      pastaId: 'brd-emanuel-02'
    },
    {
      id: 'pin-emanuel-moto-03',
      usuario_id: 'usr-emanuel-008',
      titulo: 'BMW S1000RR Esportiva em Rodovia ao Amanhecer',
      descricao: 'Tecnologia germânica com controle de tração dinâmico e resposta imediata do motor de quatro cilindros.',
      midia_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Moto esportiva BMW preta parada na rodovia com montanhas iluminadas ao fundo',
      link_destino: 'https://exemplo.com/bmw-s1000rr-viagem',
      categoria: 'Motos',
      tags: JSON.stringify(['motos', 'bmw', 'superbike', 'estrada', 'viagem', 'adrenalina']),
      cor_dominante: '#193441',
      pastaId: 'brd-emanuel-01'
    },
    {
      id: 'pin-emanuel-moto-04',
      usuario_id: 'usr-emanuel-008',
      titulo: 'Harley-Davidson Custom Cruiser em Estrada Panorâmica',
      descricao: 'O autêntico estilo de vida estradeiro: guidão alto, motor V-Twin com torque em baixa rotação e horizonte aberto.',
      midia_url: 'https://images.unsplash.com/photo-1558981420-87aa9dad1c89?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Moto custom clássica com cromados brilhantes em estrada rústica ao entardecer',
      link_destino: 'https://exemplo.com/harley-davidson-estrada',
      categoria: 'Motos',
      tags: JSON.stringify(['motos', 'harley', 'cruiser', 'estrada', 'viagemdemoto', 'estilo']),
      cor_dominante: '#3a3b3c',
      pastaId: 'brd-emanuel-03'
    },
    {
      id: 'pin-emanuel-moto-05',
      usuario_id: 'usr-emanuel-008',
      titulo: 'Piloto com Capacete Fosco Customizado e Jaqueta de Couro Vintage',
      descricao: 'Equipamento clássico de pilotagem unindo segurança moderna com a elegância atemporal do motociclismo.',
      midia_url: 'https://images.unsplash.com/photo-1558980394-4c7c9299fe96?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Motociclista com capacete preto e jaqueta de couro ajustada ao lado da moto',
      link_destino: 'https://exemplo.com/equipamentos-motociclista',
      categoria: 'Motos',
      tags: JSON.stringify(['motos', 'motociclista', 'jaquetadecouro', 'capacete', 'estilo', 'urbano']),
      cor_dominante: '#1b1b1b',
      pastaId: 'brd-emanuel-02'
    },

    // === PEDRO: ACADEMIA ===
    {
      id: 'pin-pedro-gym-01',
      usuario_id: 'usr-pedro-009',
      titulo: 'Levantamento Terra Pesado com Barra Olímpica e Pegada Mista',
      descricao: 'Execução técnica impecável com ativação total da cadeia posterior, dorsal travada e saída explosiva do chão.',
      midia_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Atleta realizando levantamento terra com barra olímpica e anilhas pesadas na academia',
      link_destino: 'https://exemplo.com/tecnica-levantamento-terra',
      categoria: 'Academia',
      tags: JSON.stringify(['academia', 'musculacao', 'levantamentoterra', 'forca', 'treinopesado', 'fitness']),
      cor_dominante: '#2b2b2b',
      pastaId: 'brd-pedro-01'
    },
    {
      id: 'pin-pedro-gym-02',
      usuario_id: 'usr-pedro-009',
      titulo: 'Treino de Calistenia: Muscle-Up e Controle Corporal na Barra Fixa',
      descricao: 'Transição explosiva da puxada para a empurrada acima da barra, exigindo força relativa e estabilização de core.',
      midia_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Homem executando movimento de calistenia na barra ao ar livre',
      link_destino: 'https://exemplo.com/calistenia-progressoes',
      categoria: 'Academia',
      tags: JSON.stringify(['academia', 'calistenia', 'muscleup', 'barrafixa', 'treinofuncional', 'core']),
      cor_dominante: '#3a6073',
      pastaId: 'brd-pedro-02'
    },
    {
      id: 'pin-pedro-gym-03',
      usuario_id: 'usr-pedro-009',
      titulo: 'Supino Inclinado com Halteres Pesados para Peitoral Superior',
      descricao: 'Amplitude máxima com escápulas aduzidas e contração de pico no topo do movimento para hipertrofia máxima.',
      midia_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Praticante fazendo supino com halteres no banco inclinado',
      link_destino: 'https://exemplo.com/supino-com-halteres-dicas',
      categoria: 'Academia',
      tags: JSON.stringify(['academia', 'supino', 'halteres', 'peitoral', 'hipertrofia', 'bodybuilding']),
      cor_dominante: '#1e2022',
      pastaId: 'brd-pedro-01'
    },
    {
      id: 'pin-pedro-gym-04',
      usuario_id: 'usr-pedro-009',
      titulo: 'Refeição Pós-Treino Anabólica com Frango Grelhado, Batata Doce e Ovos',
      descricao: '45g de proteína de alto valor biológico e carboidratos complexos para reposição rápida de glicogênio muscular.',
      midia_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Prato fitness equilibrado com peito de frango grelhado, ovos cozidos e legumes',
      link_destino: 'https://exemplo.com/dieta-hipertrofia-pos-treino',
      categoria: 'Academia',
      tags: JSON.stringify(['academia', 'dieta', 'postreino', 'nutricao', 'proteina', 'saudavel']),
      cor_dominante: '#4e7037',
      pastaId: 'brd-pedro-03'
    },
    {
      id: 'pin-pedro-gym-05',
      usuario_id: 'usr-pedro-009',
      titulo: 'Agachamento Livre Profundo com Barra nas Costas (Squat)',
      descricao: 'O rei dos exercícios de pernas: quebrando a paralela com joelhos alinhados e pressão total nos calcanhares.',
      midia_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Atleta agachando com barra pesada sobre os ombros na gaiola de agachamento',
      link_destino: 'https://exemplo.com/agachamento-livre-guia',
      categoria: 'Academia',
      tags: JSON.stringify(['academia', 'agachamento', 'legday', 'quadriceps', 'treinodepernas', 'forca']),
      cor_dominante: '#212529',
      pastaId: 'brd-pedro-01'
    },

    // === KAMILLA: MACONHA / CULTURA CANÁBICA ===
    {
      id: 'pin-kam-weed-01',
      usuario_id: 'usr-kamilla-010',
      titulo: 'Macrofotografia de Flor Canábica com Tricomas Cristalinos',
      descricao: 'Detalhe impressionante com lente macro 100mm revelando as glândulas resinosas brilhantes e tons roxos e verdes.',
      midia_url: 'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Close-up macro de flor botânica canábica coberta de tricomas brilhantes',
      link_destino: 'https://exemplo.com/macrofotografia-botanica-canabica',
      categoria: 'Maconha',
      tags: JSON.stringify(['maconha', 'cannabis', 'culturacanabica', 'tricomas', 'botanica', 'macro', 'verde']),
      cor_dominante: '#2d5a27',
      pastaId: 'brd-kamilla-01'
    },
    {
      id: 'pin-kam-weed-02',
      usuario_id: 'usr-kamilla-010',
      titulo: 'Bong de Vidro Soprado Artesanal com Efeito Furta-Cor e Percolator',
      descricao: 'Peça colecionável feita à mão por mestre vidreiro com percolator em árvore para filtragem suave e estética cristalina.',
      midia_url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Bong de vidro artesanal com detalhes coloridos e brilho furta-cor sobre mesa de madeira',
      link_destino: 'https://exemplo.com/arte-em-vidro-bongs-artesanais',
      categoria: 'Maconha',
      tags: JSON.stringify(['maconha', 'bong', 'vidroartesanal', 'glassart', 'acessorios', '420']),
      cor_dominante: '#3a7d75',
      pastaId: 'brd-kamilla-02'
    },
    {
      id: 'pin-kam-weed-03',
      usuario_id: 'usr-kamilla-010',
      titulo: 'Folha de Cannabis em Harmonia com Gotas de Orvalho Matinal',
      descricao: 'A geometria natural e simetria perfeita da folha com orvalho sob a luz dourada do amanhecer.',
      midia_url: 'https://images.unsplash.com/photo-1536939459926-301728717817?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Folha verde de cannabis com gotas de água fresca brilhando na luz natural',
      link_destino: 'https://exemplo.com/botanica-natureza-canabis',
      categoria: 'Maconha',
      tags: JSON.stringify(['maconha', 'folhadecanabis', 'natureza', 'orvalho', 'botanica', 'estiloverde']),
      cor_dominante: '#1e4620',
      pastaId: 'brd-kamilla-01'
    },
    {
      id: 'pin-kam-weed-04',
      usuario_id: 'usr-kamilla-010',
      titulo: 'Mochila e Acessórios Ecológicos Feitos 100% em Fibra de Cânhamo',
      descricao: 'Moda sustentável, resistência extrema e durabilidade das fibras naturais de cânhamo para uso diário.',
      midia_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Mochila sustentável confeccionada em tecido rústico de cânhamo natural',
      link_destino: 'https://exemplo.com/produtos-sustentaveis-canhamo',
      categoria: 'Maconha',
      tags: JSON.stringify(['maconha', 'canhamo', 'sustentabilidade', 'modaecologica', 'acessorios', 'estilo']),
      cor_dominante: '#8d7b68',
      pastaId: 'brd-kamilla-03'
    },
    {
      id: 'pin-kam-weed-05',
      usuario_id: 'usr-kamilla-010',
      titulo: 'Arte Psicodélica Neon com Estética Verde e Vibrações 420',
      descricao: 'Ilustração digital vibrante com paleta fluorescente inspirada na expansão criativa e cultura psicodélica.',
      midia_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      tipo_midia: 'imagem',
      texto_alternativo: 'Arte gráfica digital psicodélica em tons de verde neon e roxo brilhante',
      link_destino: 'https://exemplo.com/arte-psicodelica-verde',
      categoria: 'Maconha',
      tags: JSON.stringify(['maconha', 'arte', 'psicodelico', 'neon', 'culturacanabica', '420art']),
      cor_dominante: '#0b3c5d',
      pastaId: 'brd-kamilla-01'
    }
  ];

  const insertPin = db.prepare(`
    INSERT INTO pins (
      id, usuario_id, titulo, descricao, midia_url, tipo_midia,
      texto_alternativo, link_destino, categoria, tags, cor_dominante,
      visual_features, denuncias_count, oculto_preventivo, data_criacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `);

  const insertPastaPin = db.prepare(`
    INSERT INTO pasta_pins (id, pasta_id, pin_id, secao, data_salvo)
    VALUES (?, ?, ?, '', ?)
  `);

  pins.forEach(pin => {
    const visualKeywords = [pin.titulo.toLowerCase(), pin.categoria.toLowerCase(), ...(JSON.parse(pin.tags)).map(t => t.toLowerCase())];
    insertPin.run(
      pin.id, pin.usuario_id, pin.titulo, pin.descricao, pin.midia_url, pin.tipo_midia,
      pin.texto_alternativo, pin.link_destino, pin.categoria, pin.tags, pin.cor_dominante,
      JSON.stringify(visualKeywords), now
    );

    if (pin.pastaId) {
      insertPastaPin.run(uuidv4(), pin.pastaId, pin.id, now);
    }
  });

  // 4. Conexões de Seguir
  const insertFollow = db.prepare('INSERT INTO seguidores (id, seguidor_id, seguido_id, data_criacao) VALUES (?, ?, ?, ?)');
  insertFollow.run(uuidv4(), 'usr-dan-002', 'usr-deb-003', now);
  insertFollow.run(uuidv4(), 'usr-dan-002', 'usr-wag-004', now);
  insertFollow.run(uuidv4(), 'usr-deb-003', 'usr-dan-002', now);
  insertFollow.run(uuidv4(), 'usr-wag-004', 'usr-dan-002', now);
  insertFollow.run(uuidv4(), 'usr-ruan-006', 'usr-thiago-007', now);
  insertFollow.run(uuidv4(), 'usr-ruan-006', 'usr-emanuel-008', now);
  insertFollow.run(uuidv4(), 'usr-thiago-007', 'usr-pedro-009', now);
  insertFollow.run(uuidv4(), 'usr-pedro-009', 'usr-thiago-007', now);
  insertFollow.run(uuidv4(), 'usr-pedro-009', 'usr-deb-003', now);
  insertFollow.run(uuidv4(), 'usr-kamilla-010', 'usr-wag-004', now);
  insertFollow.run(uuidv4(), 'usr-kamilla-010', 'usr-ruan-006', now);
  insertFollow.run(uuidv4(), 'usr-kamilla-010', 'usr-dan-002', now);

  // 5. Curtidas (Likes)
  const insertLike = db.prepare('INSERT INTO curtidas (id, pin_id, usuario_id, data_criacao) VALUES (?, ?, ?, ?)');
  // Games
  insertLike.run(uuidv4(), 'pin-dan-game-01', 'usr-deb-003', now);
  insertLike.run(uuidv4(), 'pin-dan-game-01', 'usr-kamilla-010', now);
  // Hamburgueres
  insertLike.run(uuidv4(), 'pin-deb-burg-01', 'usr-dan-002', now);
  insertLike.run(uuidv4(), 'pin-deb-burg-01', 'usr-pedro-009', now);
  // Natureza
  insertLike.run(uuidv4(), 'pin-wag-nat-01', 'usr-kamilla-010', now);
  // Mulheres
  insertLike.run(uuidv4(), 'pin-ruan-mulher-01', 'usr-deb-003', now);
  // Volei
  insertLike.run(uuidv4(), 'pin-thiago-vol-01', 'usr-pedro-009', now);
  // Motos
  insertLike.run(uuidv4(), 'pin-emanuel-moto-01', 'usr-ruan-006', now);
  // Academia
  insertLike.run(uuidv4(), 'pin-pedro-gym-01', 'usr-thiago-007', now);
  insertLike.run(uuidv4(), 'pin-pedro-gym-01', 'usr-dan-002', now);
  insertLike.run(uuidv4(), 'pin-pedro-gym-04', 'usr-deb-003', now);
  // Maconha
  insertLike.run(uuidv4(), 'pin-kam-weed-01', 'usr-wag-004', now);
  insertLike.run(uuidv4(), 'pin-kam-weed-01', 'usr-ruan-006', now);
  insertLike.run(uuidv4(), 'pin-kam-weed-02', 'usr-dan-002', now);

  // 6. Comentários Principais e Respostas Aninhadas (RF006)
  const insertComment = db.prepare("INSERT INTO comentarios (id, pin_id, usuario_id, parent_id, texto, imagem_url, data_criacao) VALUES (?, ?, ?, ?, ?, '', ?)");
  
  // === Videogames (Daniel) ===
  insertComment.run('cmt-game-01', 'pin-dan-game-01', 'usr-deb-003', null, 'Que setup sensacional! A iluminação roxa e ciano deu uma atmosfera perfeita.', now);
  insertComment.run('cmt-game-01-rep', 'pin-dan-game-01', 'usr-dan-002', 'cmt-game-01', 'Obrigado Débora! Configurei cada fita LED para sincronizar com as cores do jogo em tempo real!', now);

  insertComment.run('cmt-game-02', 'pin-dan-game-01', 'usr-kamilla-010', null, 'Essa iluminação neon verde e roxa é perfeita pra relaxar no fim do dia curtindo um som!', now);
  insertComment.run('cmt-game-02-rep', 'pin-dan-game-01', 'usr-dan-002', 'cmt-game-02', 'Totalmente Kamilla! Deixo os sintetizadores e a playlist lo-fi rolando no fundo.', now);

  // === Hambúrgueres (Débora) ===
  insertComment.run('cmt-burg-01', 'pin-deb-burg-01', 'usr-pedro-009', null, 'Que refeição pós-treino anabólica monstruosa! Quantos gramas de proteína nesse blend de costela?', now);
  insertComment.run('cmt-burg-01-rep', 'pin-deb-burg-01', 'usr-deb-003', 'cmt-burg-01', 'São 180g de pura carne com 40g de proteína de altíssima qualidade pra bater seus macros, Pedro!', now);

  insertComment.run('cmt-burg-02', 'pin-deb-burg-02', 'usr-thiago-007', null, 'Smash duplo é o meu favorito! Essa crostinha caramelizada na chapa é insuperável.', now);
  insertComment.run('cmt-burg-02-rep', 'pin-deb-burg-02', 'usr-deb-003', 'cmt-burg-02', 'O segredo é a chapa estalando de quente e prensar forte nos primeiros segundos para criar a crosta Maillard!', now);

  // === Natureza (Wagner) ===
  insertComment.run('cmt-nat-01', 'pin-wag-nat-01', 'usr-kamilla-010', null, 'A energia das plantas na mata nativa e essa luz filtrada são a maior fonte de paz e inspiração botânica.', now);
  insertComment.run('cmt-nat-01-rep', 'pin-wag-nat-01', 'usr-wag-004', 'cmt-nat-01', 'Com certeza Kamilla! O contato direto com a flora pura recarrega qualquer um.', now);

  // === Mulheres (Ruan) ===
  insertComment.run('cmt-mul-01', 'pin-ruan-mulher-01', 'usr-deb-003', null, 'Que sensibilidade nessa luz natural! O enquadramento e a nitidez ficaram impecáveis.', now);
  insertComment.run('cmt-mul-01-rep', 'pin-ruan-mulher-01', 'usr-ruan-006', 'cmt-mul-01', 'Obrigado Débora! A beleza feminina em luz natural é simplesmente encantadora, não me canso de contemplar cada detalhe dessa perfeição!', now);

  insertComment.run('cmt-mul-02', 'pin-ruan-mulher-02', 'usr-kamilla-010', null, 'A paleta terrosa e o caimento da roupa ficaram super autênticos e estilosos.', now);
  insertComment.run('cmt-mul-02-rep', 'pin-ruan-mulher-02', 'usr-ruan-006', 'cmt-mul-02', 'Simplesmente deslumbrante! Essa estética urbana me deixa completamente fascinado por cada curva do estilo!', now);

  // === Vôlei (Thiago) ===
  insertComment.run('cmt-vol-01', 'pin-thiago-vol-01', 'usr-pedro-009', null, 'Essa impulsão na areia fofa recruta muito os quadríceps e panturrilhas, ótimo condicionamento explosivo!', now);
  insertComment.run('cmt-vol-01-rep', 'pin-thiago-vol-01', 'usr-thiago-007', 'cmt-vol-01', 'Com certeza Pedro! O treino de pernas pesado na academia é o que me dá essa base de salto!', now);

  // === Motos (Emanuel) ===
  insertComment.run('cmt-mot-01', 'pin-emanuel-moto-01', 'usr-ruan-006', null, 'Essa Panigale V4 é uma obra de arte da engenharia italiana! O ronco do motor deve ser surreal.', now);
  insertComment.run('cmt-mot-01-rep', 'pin-emanuel-moto-01', 'usr-emanuel-008', 'cmt-mot-01', 'O som com o escapamento Akrapovic em titânio faz o peito vibrar quando passa dos 10.000 RPM!', now);

  // === Academia (Pedro) ===
  insertComment.run('cmt-gym-01', 'pin-pedro-gym-01', 'usr-thiago-007', null, 'Postura perfeita no terra! Costas retas e barra colada na canela. Qual a carga total aí?', now);
  insertComment.run('cmt-gym-01-rep', 'pin-pedro-gym-01', 'usr-pedro-009', 'cmt-gym-01', 'Valeu Thiago! São 180kg nessa série de 5 repetições, foco 100% na técnica antes do peso!', now);

  insertComment.run('cmt-gym-02', 'pin-pedro-gym-02', 'usr-dan-002', null, 'Fazer muscle-up com essa facilidade na calistenia parece mágica! Haja força no core.', now);
  insertComment.run('cmt-gym-02-rep', 'pin-pedro-gym-02', 'usr-pedro-009', 'cmt-gym-02', 'Foram meses de barra fixa e paralelas até encaixar a transição suave!', now);

  // === Maconha / Cultura Canábica (Kamilla) ===
  insertComment.run('cmt-weed-01', 'pin-kam-weed-01', 'usr-wag-004', null, 'Que foto macro impressionante! A nitidez dos tricomas e as cores naturais ficaram espetaculares.', now);
  insertComment.run('cmt-weed-01-rep', 'pin-kam-weed-01', 'usr-kamilla-010', 'cmt-weed-01', 'Obrigada Wagner! Usei uma lente macro 100mm com iluminação pontual para destacar o brilho das glândulas.', now);

  insertComment.run('cmt-weed-02', 'pin-kam-weed-02', 'usr-dan-002', null, 'Esse vidro soprado artesanal furta-cor é uma verdadeira obra de arte! O trabalho do vidreiro é incrível.', now);
  insertComment.run('cmt-weed-02-rep', 'pin-kam-weed-02', 'usr-kamilla-010', 'cmt-weed-02', 'É puro borossilicato feito à mão por um artesão local, cada peça é única!', now);

  // 7. Notificações Iniciais
  const insertNotif = db.prepare(`
    INSERT INTO notificacoes (id, usuario_id, remetente_id, tipo, mensagem, link_alvo, lida, data_criacao)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `);
  insertNotif.run(uuidv4(), 'usr-deb-003', 'usr-dan-002', 'comentario', 'Daniel Barroso comentou na sua receita de burger.', '/pin/pin-deb-burg-01', now);
  insertNotif.run(uuidv4(), 'usr-pedro-009', 'usr-thiago-007', 'curtida', 'Thiago Willames curtiu seu Pin "Levantamento Terra Pesado"', '/pin/pin-pedro-gym-01', now);
  insertNotif.run(uuidv4(), 'usr-kamilla-010', 'usr-wag-004', 'comentario', 'Wagner Leandro comentou no seu Pin de macrofotografia.', '/pin/pin-kam-weed-01', now);

  console.log('Seed do banco de dados concluído com sucesso com todos os novos perfis e temas!');
}

module.exports = { seedDatabase };
