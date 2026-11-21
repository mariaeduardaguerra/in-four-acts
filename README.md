# In Four Acts ✦

Uma coleção de histórias contadas em quatro atos.

Aplicação full stack para criar playlists e organizar músicas em uma narrativa: abertura, conflito, catarse e encerramento.

**Acesse:** https://in-four-acts.onrender.com

## A proposta

Cada playlist é dividida em quatro atos:

| Ato | Nome | Papel na história |
| --- | --- | --- |
| I | The Beginning | A primeira nota, o encontro, a abertura |
| II | The Conflict | A tensão e as mudanças de direção |
| III | The Catharsis | O ponto de intensidade e transformação |
| IV | The Afterglow | O que permanece depois da última música |

O projeto organiza informações sobre músicas. Não reproduz áudio e não possui integração com serviços de streaming.

## Funcionalidades

- Cadastro e login com e-mail e senha.
- Coleção individual para cada usuário.
- Criação de playlists com nome, descrição e atmosfera.
- Cadastro de músicas com título, artista e álbum.
- Organização das músicas em quatro atos.
- Exclusão de músicas e playlists.
- Exportação da playlist em CSV.
- Persistência dos dados no PostgreSQL.
- Interface responsiva em tons escuros e bordô.

## Tecnologias

- React e Vite.
- JavaScript.
- HTML e CSS.
- Node.js e Express.
- PostgreSQL e node-postgres.
- Supabase Auth.
- Render.

## Organização do projeto

- `frontend/`: interface em React.
- `backend/`: API Express e conexão com o banco.
- `backend/supabase-ca.crt`: certificado usado para verificar a conexão SSL com o banco.

As tabelas ficam no schema `in_four_acts`:

- `playlists`: informações da playlist e identificação do proprietário.
- `faixas`: músicas, atos e posições dentro de cada playlist.

## Autenticação e acesso

O frontend envia o token da sessão nas requisições à API.

O backend valida esse token com o Supabase Auth e utiliza a identidade verificada para consultar, cadastrar e excluir os registros do usuário.

As consultas SQL usam parâmetros. As credenciais do banco ficam em variáveis de ambiente e não são enviadas ao frontend.

## Executar localmente

### Pré-requisitos

- Node.js compatível com a versão do Vite utilizada.
- npm.
- Projeto Supabase com autenticação por e-mail habilitada.
- Banco com o schema e as tabelas do In Four Acts.

O banco precisa estar preparado antes de iniciar a aplicação. A aplicação não cria as tabelas automaticamente.

### 1. Clonar o repositório

```bash
git clone https://github.com/mariaeduardaguerra/in-four-acts.git
cd in-four-acts
```

### 2. Instalar as dependências

```bash
npm ci --prefix backend
npm ci --prefix frontend
```

### 3. Configurar o backend

Crie `backend/.env`:

```env
PORT=3001

PGHOST=host_do_session_pooler
PGPORT=5432
PGDATABASE=postgres
PGUSER=postgres.identificador_do_projeto
PGPASSWORD="senha_do_banco"

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
```

Baixe o certificado do seu banco nas configurações do Supabase e salve como `backend/supabase-ca.crt`.

### 4. Configurar o frontend

Crie `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
```

Use a chave publishable no frontend. Nunca coloque a senha do banco ou uma chave secreta em variáveis com prefixo `VITE_`.

### 5. Iniciar a API

Em um terminal:

```bash
cd backend
npm run dev
```

### 6. Iniciar o frontend

Em outro terminal, a partir da pasta principal:

```bash
cd frontend
npm run dev
```

Abra o endereço informado pelo Vite. Mantenha os dois terminais em execução.

## Publicação

O frontend e a API são publicados em um único Web Service no Render.

**Build Command:**

```bash
npm ci --prefix backend && npm ci --prefix frontend --include=dev && npm run build --prefix frontend
```

**Start Command:**

```bash
node backend/server.js
```

As variáveis do backend e do frontend devem ser configuradas no Render. A variável `PORT` é fornecida pela plataforma.

O Express serve os arquivos gerados em `frontend/dist`.

## Limitações atuais

- As músicas são cadastradas manualmente.
- Não há reprodução de áudio.
- Não há integração com spotify ou outros serviços de streaming.
- A interface ainda não permite editar músicas ou reorganizar sua ordem.
- A exportação gera um arquivo CSV; não cria playlists automaticamente em outras plataformas.
