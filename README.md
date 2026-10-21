# Lyrix

App mobile (Android e iOS) para **estudar inglês com músicas**.

1. O usuário escolhe uma música do acervo.
2. A música toca no player do YouTube, com a **letra sincronizada** linha a linha, sem perder a sincronia do começo ao fim.
3. O usuário toca numa **palavra** ou seleciona uma **frase curta** para ver a tradução só daquele trecho.

O acervo é **curado**: cada música é cadastrada e revisada numa aplicação web interna antes de aparecer no app.

> Status: **em desenvolvimento**. Licenciamento das letras e termos de uso do YouTube ainda precisam ser resolvidos antes de qualquer publicação nas lojas.

## Estrutura do repositório

| Pasta | O que é | Tecnologias | Documentação |
|---|---|---|---|
| [`app/`](app/) | Aplicativo mobile | React Native, Expo, TypeScript, expo-router | [`app/CLAUDE.md`](app/CLAUDE.md) |
| [`backend/`](backend/) | API e worker de processamento | Python 3.11, FastAPI, SQLAlchemy, PostgreSQL | [`backend/README.md`](backend/README.md) · [`backend/API.md`](backend/API.md) |
| [`web/`](web/) | Web de curadoria do acervo (uso interno) | React, Vite, TypeScript | [`web/CLAUDE.md`](web/CLAUDE.md) |
| [`design/`](design/) | Funcionalidades do MVP, design das telas e identidade visual | Markdown e protótipos HTML | [`design/Funcionalidades-MVP.md`](design/Funcionalidades-MVP.md) |

```
Lyrix/
├── app/       # app mobile (consome /songs e /translate)
├── backend/   # API + worker (gera o LRC: LRCLIB, yt-dlp, Demucs, stable-ts)
├── web/       # curadoria (consome /admin)
└── design/    # documentação de produto e telas
```

## Como as partes se conectam

```
[web de curadoria] --/admin--> ┐
                               ├──> [API FastAPI] <──> [PostgreSQL]
[app mobile] --/songs, /translate┘        │                 ▲
                                    cria tarefas             │ lê e grava
                                          ▼                  │
                                       [worker] ─────────────┘
                              LRCLIB · yt-dlp · Demucs · stable-ts
```

- **Curadoria:**
  1. Você cola um link do YouTube na web.
  2. A API valida o vídeo.
  3. O worker gera a letra sincronizada (LRC).
  4. Você revisa, ajusta e publica.
- **App:** lista as músicas publicadas, toca o vídeo com a letra sincronizada e traduz trechos sob demanda (Azure Translator, com cache).

## Como rodar (desenvolvimento)

Siga nesta ordem. Os detalhes de cada parte estão no README ou no CLAUDE.md da pasta.

1. **Banco e API** ([`backend/README.md`](backend/README.md)):
   ```
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env          # preencha as variáveis
   docker compose up -d            # ou crie as tabelas com: psql ... -f schemas.sql
   uvicorn api.main:app --reload   # http://localhost:8000/docs
   ```
2. **Worker**, em outro terminal, dentro de `backend/` com o `venv` ativado:
   ```
   python -m api.worker
   ```
3. **Web de curadoria** ([`web/CLAUDE.md`](web/CLAUDE.md)):
   ```
   cd web
   npm install
   npm run dev                     # http://localhost:5173
   ```
4. **App** ([`app/CLAUDE.md`](app/CLAUDE.md)):
   ```
   cd app
   npm install
   copy .env.example .env.local    # ajuste EXPO_PUBLIC_API_URL para o IP da sua máquina
   npx expo start                  # abra no Expo Go
   ```

## Configuração e segredos

Cada parte tem um `.env.example` que mostra as variáveis necessárias. Copie para `.env` (backend) ou `.env.local` (web e app) e preencha. **Os arquivos `.env` não vão para o repositório** (veja o [`.gitignore`](.gitignore)). As chaves externas (YouTube Data API e Azure Translator) e como obtê-las estão em [`backend/README.md`](backend/README.md#3-variáveis-de-ambiente).

## Testar a API

Importe [`backend/Lyrix.postman_collection.json`](backend/Lyrix.postman_collection.json) no Postman. A coleção tem um request por rota, e a documentação completa está em [`backend/API.md`](backend/API.md).
