# 📌 Stylety – Plataforma de Descoberta Visual (IFPA)

> Um clone completo, moderno e responsivo do **Pinterest**, batizado de **Stylety**, desenvolvido estritamente com base no Documento de Requisitos da disciplina de Teste de Software do IFPA.

---

## 📖 Sobre o Projeto

O **Stylety** é uma aplicação web completa de descoberta visual no estilo *masonry*, permitindo que usuários explorem, salvem, criem e compartilhem ideias em fotos e vídeos através de murais (pastas públicas e secretas).

O projeto implementa **100% dos Requisitos Funcionais (RF001 a RF008)**, **Regras de Negócio Específicas (RNE001 a RNE004)** e **Requisitos Não Funcionais (RNF001 a RNF006)** com conformidade LGPD e acessibilidade WCAG 2.1 AA.

---

## 🚀 Guia Passo a Passo para Leigos (Como Rodar no seu Computador)

Siga os passos simples abaixo para instalar e rodar o projeto na sua máquina:

### 1️⃣ Pré-requisitos
Antes de começar, você precisa ter instalado no seu computador:
- **Node.js** (versão 18 ou superior): [Baixar Node.js Oficial](https://nodejs.org/)
- **Git** (opcional, para clonar o repositório): [Baixar Git Oficial](https://git-scm.com/)

---

### 2️⃣ Clonar ou Baixar o Projeto
Abra o terminal (Prompt de Comando, PowerShell ou Terminal do VS Code) e execute:

```bash
# Clone o repositório
git clone https://github.com/dbarrosodev/projeto-ifpa-teste-de-software.git

# Acesse a pasta do projeto
cd projeto-ifpa-teste-de-software
```

---

### 3️⃣ Instalar as Dependências
Com o terminal aberto dentro da pasta do projeto, digite o seguinte comando e aperte **Enter**:

```bash
npm install
```
> *Esse comando baixa todas as bibliotecas necessárias para o sistema funcionar.*

---

### 4️⃣ Iniciar a Aplicação (Localhost)
Para ligar o servidor do Stylety, execute:

```bash
npm start
```

Você verá no terminal uma mensagem como esta:
```text
====================================================
🚀 Stylety (Plataforma de Descoberta Visual) ON!
📡 Servidor rodando em: http://localhost:3000
🔒 Modo de segurança: LGPD & WCAG 2.1 AA Ativados
====================================================
```

---

### 5️⃣ Abrir no Navegador
Agora, abra o seu navegador de internet (Google Chrome, Firefox, Edge, etc.) e acesse:

👉 **[http://localhost:3000](http://localhost:3000)**

Pronto! A aplicação estará aberta e pronta para uso! 🎉

---

## 🐞 Painel de Debug & Teste Manual (1 Clique)

Para facilitar a execução dos testes manuais de cada requisito sem precisar cadastrar usuários ou preencher formulários repetidamente, o sistema conta com um **Botão Flutuante de Inseto (Debug)** no canto inferior esquerdo da tela:

Basta clicar no ícone de inseto para alternar instantaneamente entre os perfis e testar as regras de negócio:

| Criador | E-mail de Teste | Tema / Foco de Conteúdo |
| :--- | :--- | :--- |
| **🎮 Daniel Barroso** | `daniel@stylety.local` | Setups Gamer, Consoles Retrô e RPG |
| **🍔 Débora Vitória** | `debora@stylety.local` | Hambúrgueres Artesanais, Smash e Molhos |
| **🌿 Wagner Leandro** | `wagner@stylety.local` | Natureza, Montanhas, Cachoeiras e Trilhas |
| **👩 Ruan Samuel** | `ruan@stylety.local` | Moda Feminina, Retratos e Alta Costura |
| **🏐 Thiago Willames** | `thiago@stylety.local` | Vôlei de Praia e Vôlei de Quadra |
| **🏍️ Emanuel Gomes** | `emanuel@stylety.local` | Superbikes, Cafe Racers e Custom |
| **🏋️ Pedro Henrique** | `pedro@stylety.local` | Academia, Musculação e Calistenia |
| **🌿 Kamilla Santos** | `kamilla@stylety.local` | Maconha, Cultura Canábica e Macro |
| **🛡️ Moderador Geral** | `moderador@stylety.local` | Painel de Moderação e SLA 48h |
| **👤 Modo Visitante** | *(Desconectado)* | Navegação pública com curadoria |

> *Senha padrão de todos os usuários de teste:* `senha123` (ou `admin123` para o Moderador).

---

## 📋 Guia de Roteiro para Testes Manuais (Requisitos do Documento)

### RF001 & RNE001 – Gestão de Acesso e Idade Mínima
- **Teste 1 (Menores de 13 anos):** Tente cadastrar um usuário com data de nascimento de menos de 13 anos. O sistema bloqueia com mensagem de erro explicativa.
- **Teste 2 (Adolescentes 13-17 anos):** Cadastre uma data com idade entre 13 e 17 anos. A conta é criada com perfil privado ativado por padrão.
- **Teste 3 (Login Social Simulado):** Na tela de login, clique em Google, Facebook ou Apple para autenticar instantaneamente.

### RF002 & RNE002 – Criação e Exclusão Definitiva de Pins
- **Teste 4 (Criar Ideia):** Clique no menu **"Criar" > "Criar Pin"**, anexe uma imagem/vídeo, digite título, descrição, texto alternativo e categoria.
- **Teste 5 (Excluir Pin):** Abra um Pin de sua autoria e clique no botão vermelho **"Excluir"**. O item é removido definitivamente do banco de dados.

### RF003 & RNE002 – Pastas e Pastas Secretas
- **Teste 6 (Criar Pasta Secreta):** Crie uma nova pasta marcando a opção **"Manter esta pasta secreta"**.
- **Teste 7 (Privacidade):** Faça logout ou entre em outra conta; a pasta secreta não aparecerá no perfil público.

### RF004 – Pesquisa Textual e Pinterest Lens
- **Teste 8 (Busca Textual):** Digite qualquer termo na barra de busca (ex: `Hambúrguer`, `Vôlei`, `Motos`) e veja os resultados filtrados.
- **Teste 9 (Pinterest Lens):** Clique no ícone de câmera na barra de busca, envie uma foto ou use a webcam para buscar ideias visualmente semelhantes.

### RF005 – Feed Personalizado e Tópicos
- **Teste 10 (Pílulas de Tópicos):** Clique nas categorias do topo (*Videogames, Hambúrgueres, Natureza, Mulheres, Vôlei, Motos, Academia, Maconha*) para filtrar o feed instantaneamente.

### RF006 & RF007 – Curtidas, Comentários e Respostas (Threads)
- **Teste 11 (Curtir):** Clique no coração de qualquer Pin no feed ou no modal de detalhes.
- **Teste 12 (Comentar e Responder):** Abra um Pin, envie um comentário ou clique em **"Responder"** em um comentário existente para criar uma resposta encadeada.

### RF008 & RNE003 – Moderação Preventiva e SLA 48h
- **Teste 13 (Denunciar Pin):** Abra um Pin e clique na bandeira de denúncia.
- **Teste 14 (Ocultação Preventiva):** Denuncie o mesmo Pin 2 vezes com usuários diferentes; o Pin será ocultado preventivamente do feed público.
- **Teste 15 (Painel do Moderador):** Entre como *Moderador Geral* pelo painel de debug, clique em seu perfil e acesse **"Painel de Moderação"** para visualizar denúncias e o SLA de 48h.

### RNF003, RNE004 & RNF006 – LGPD e Acessibilidade
- **Teste 16 (Exportar Dados LGPD):** No menu do perfil, clique em **"Exportar Dados (LGPD)"** para baixar um arquivo JSON com todas as suas informações.
- **Teste 17 (Excluir Conta 30 Dias):** Solicite a exclusão da conta para verificar o agendamento de 30 dias de carência.
- **Teste 18 (Alto Contraste):** Clique no botão de acessibilidade no rodapé/menu para ativar o modo de Alto Contraste (WCAG 2.1 AA).

---

## 📂 Estrutura de Pastas do Projeto

```text
projeto-ifpa-teste-de-software/
├── public/                     # Frontend da aplicação
│   ├── css/
│   │   └── styles.css          # Estilos Pinterest (Design System oficial)
│   ├── js/
│   │   ├── api.js              # Cliente HTTP para comunicação com backend
│   │   ├── app.js              # Lógica de interface e interações do usuário
│   │   └── lucide.min.js       # Biblioteca de ícones vetoriais Lucide (sem emojis)
│   ├── img/                    # Logotipos oficiais Stylety e ícones PWA
│   ├── uploads/                # Diretório de uploads de fotos e vídeos
│   ├── index.html              # Estrutura HTML semântica principal
│   ├── manifest.json           # Manifesto PWA
│   └── sw.js                   # Service Worker para cache e modo offline
├── server/                     # Backend Node.js / Express
│   ├── config/
│   │   └── database.js         # Configuração e tabelas SQLite
│   ├── middleware/
│   │   ├── auth.js             # Autenticação JWT e controle de idade
│   │   └── upload.js           # Processamento e validação de mídias (Sharp)
│   ├── routes/                 # Rotas da API REST
│   │   ├── auth.routes.js      # Cadastro, Login e Autenticação Social
│   │   ├── feed.routes.js      # Feed Personalizado e Categorias (RF005)
│   │   ├── pins.routes.js      # Criação, Edição e Detalhes de Pins (RF002)
│   │   ├── boards.routes.js    # Gestão de Pastas e Pastas Secretas (RF003)
│   │   ├── search.routes.js    # Busca Textual e Pinterest Lens (RF004)
│   │   ├── interactions.routes.js # Likes, Comentários e Mensagens (RF006)
│   │   ├── moderation.routes.js   # Denúncias e Moderação 48h (RF008)
│   │   └── lgpd.routes.js      # Exportação de Dados e Exclusão 30d (RNF003)
│   ├── services/
│   │   └── seed.js             # População inicial com criadores e pins
│   └── app.js                  # Inicialização do Express
├── package.json                # Dependências e scripts do projeto
├── server.js                   # Ponto de entrada do servidor
└── README.md                   # Documentação do projeto
```

---

## 🛠️ Tecnologias Utilizadas

- **Runtime & Servidor:** Node.js, Express.js
- **Banco de Dados:** SQLite (via `better-sqlite3`)
- **Frontend:** HTML5 Semântico, CSS3 Moderno (CSS Variables, Flexbox, Masonry Grid), JavaScript ES6+
- **Ícones:** Lucide Icons (SVG Vetoriais Nativos)
- **Processamento de Imagem:** Sharp
- **Autenticação:** JSON Web Tokens (JWT) e Bcrypt.js
- **PWA & Offline:** Service Worker e Web App Manifest

---

## 📜 Licença

Projeto desenvolvido para fins acadêmicos no curso de Teste de Software do **Instituto Federal do Pará (IFPA)**.
