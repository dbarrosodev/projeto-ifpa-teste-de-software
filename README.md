# 📌 Stylety – Plataforma de Descoberta Visual (IFPA)

> Um clone completo, moderno e responsivo do **Pinterest**, batizado de **Stylety**, desenvolvido estritamente com base no Documento de Requisitos de Teste de Software do IFPA.

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

Pronto! A aplicação estará pronta para uso! 🎉

---

## 🧪 Como Executar os Testes Automatizados

O projeto conta com uma suíte completa de **27 testes automatizados de ponta a ponta** (utilizando Vitest e Supertest).

Para rodar todos os testes e verificar a integridade do software, abra o terminal e execute:

```bash
npm test
```

Resultado esperado:
```text
✓ tests/system.test.mjs (27 tests)
Test Files  1 passed (1)
Tests       27 passed (27)
```

---

## 🐞 Painel de Debug & Teste Rápido (1 Clique)

Para facilitar a avaliação e teste das funcionalidades sem precisar preencher formulários manualmente, o sistema conta com um **Botão Flutuante de Inseto (Debug)** no canto inferior esquerdo da tela:

Basta clicar no ícone de inseto para alternar instantaneamente entre os perfis:

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

---

## ✨ Principais Funcionalidades do Sistema

### 🎨 1. Interface Idêntica ao Pinterest Original
- **Grade Masonry Fluida:** Layout adaptativo de colunas com proporção natural das fotos.
- **Hover Scrim Dinâmico:** Botão vermelho **"Salvar"**, link do site e botões translúcidos de ação rápida.
- **Barra de Tópicos do Topo:** Pílulas de categorias com rolagem suave (*Videogames, Hambúrgueres, Natureza, Mulheres, Vôlei, Motos, Academia, Maconha, Design, Viagens*).
- **Pinterest Lens (Busca Visual por Câmera):** Envia uma imagem para encontrar instantaneamente ideias similares por inteligência de atributos visuais.

### 💬 2. Comentários com Respostas Encadeadas (Threads)
- Comente em qualquer ideia e responda diretamente a outros usuários com o botão **Responder**.
- Notificações automáticas ao autor do comentário original.

### 📁 3. Gestão de Pastas (Públicas e Secretas - RNE002)
- Crie pastas públicas ou marque como **Secreta** para que apenas você possa visualizar.
- Convide colaboradores para montar pastas em conjunto.

### 🛡️ 4. Moderação Preventiva e SLA de 48 Horas (RF008 & RNE003)
- Sistema de denúncias de conteúdo inadequado.
- **Ocultação Preventiva Automática:** Pins com 2 ou mais denúncias são ocultados preventivamente do feed público até análise.
- Painel Administrativo do Moderador com cálculo do SLA de 48 horas em tempo real.

### 🔒 5. LGPD, Segurança e Idade Mínima (RF001, RNE001, RNF003 & RNE004)
- **Validação de Idade (RNE001):** Bloqueio estrito para menores de 13 anos. Contas de 13 a 17 anos são criadas automaticamente como privadas.
- **Portabilidade LGPD (RNF003):** Exportação completa de todos os dados do usuário em formato JSON legível.
- **Direito ao Esquecimento (RNE004):** Solicitação de exclusão definitiva com carência de 30 dias.
- **Backup Automático (RNF006):** Rotinas de backup do banco de dados SQLite.

### ♿ 6. Acessibilidade (WCAG 2.1 AA - RNF004)
- Suporte a textos alternativos em todas as mídias.
- Botão de alternância de **Alto Contraste** e atalhos rápidos de teclado (`Alt + H` para Início, `Alt + S` para Busca, `Alt + C` para Criar, `Alt + M` para Moderação).

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
├── tests/
│   └── system.test.mjs         # 27 testes automatizados cobrindo todos os requisitos
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
- **Testes Automatizados:** Vitest e Supertest
- **PWA & Offline:** Service Worker e Web App Manifest

---

## 📜 Licença

Projeto desenvolvido para fins acadêmicos no curso de Teste de Software do **Instituto Federal do Pará (IFPA)**.
