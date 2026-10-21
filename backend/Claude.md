# Lyrix · Backend: contexto do projeto

Contexto do backend para as próximas sessões do Claude. Ele registra o que já foi decidido e marca como **"a definir"** o que ainda não foi. A visão geral do produto e das pastas está no `README.md` da raiz. Como rodar e as variáveis de ambiente estão em `backend/README.md`. As rotas estão em `backend/API.md`.

## Papel do backend
- **Servir o acervo publicado ao app** (`/songs`): o ID do vídeo, as linhas da letra com o tempo de início e o `offset_ms`.
- **Traduzir sob demanda** (`/translate`): palavra ou frase curta, pela Azure, com cache por trecho.
- **Curadoria** (`/admin`, usada pela `web/`): importar o vídeo, gerar o LRC no worker, revisar e publicar.

## Decisões já tomadas
1. **Spotify descartado.** O app usa o **player do YouTube visível** (IFrame). O backend **não** distribui áudio.
2. **Acervo curado:** o usuário só escolhe entre as músicas publicadas. Não há busca livre no YouTube.
3. **Sincronização via LRC, por linha:**
   - o LRC precisa estar na **linha do tempo do mesmo vídeo** que o app toca;
   - `offset_ms` = quanto o vídeo está atrasado em relação ao LRC (ex.: um clipe com 5,2 s a mais de introdução → `5200`);
   - no app: `tempoDaLetra = tempoDoVídeo − offset_ms − latênciaDoÁudio`;
   - a tag `[offset:]` do LRC é ignorada;
   - marcação por palavra: depois do MVP.
4. **Tradução só sob demanda.** Nunca traduzir nem guardar a letra inteira traduzida. O cache é por **trecho**.
5. **Escopo do MVP:** uma música por vez, sem biblioteca do usuário e sem fila.
6. **Só desenvolvimento.** Licenças e termos de uso ficam para depois (veja "Pendências para o futuro").
7. **Stack:** Python 3.11 + FastAPI, SQLAlchemy 2, PostgreSQL, e um **worker** separado que lê a tabela `jobs`.

## Estrutura
```
backend/
├── api/
│   ├── main.py          # app FastAPI (CORS, rotas; ao iniciar, confere se as tabelas existem)
│   ├── config.py        # configurações do .env
│   ├── database.py      # engine, sessão, check_tables()
│   ├── worker.py        # python -m api.worker [--once]
│   ├── schemas/         # modelos Pydantic (entrada/saída das rotas): songs.py e translate.py (app), admin.py (curadoria)
│   ├── models/          # mapeamento SQLAlchemy das tabelas: song, lyric_line, job, translation_cache, enums
│   ├── routes/          # songs.py e translate.py (app), admin_songs.py (curadoria)
│   └── services/        # youtube, metadata, lrclib, lrc, alignment, pipeline, songs, translation
├── README.md                      # visão geral, como rodar, variáveis de ambiente e resumo das rotas
├── API.md                         # documentação de cada rota (manter sempre atualizada)
├── Lyrix.postman_collection.json  # coleção do Postman (um request por endpoint)
├── schemas.sql                    # CREATE TABLE das tabelas (fonte de verdade do banco)
├── requirements.txt               # API
├── requirements-processing.txt    # worker com alinhamento (PyTorch; exige ffmpeg no PATH)
├── docker-compose.yml             # PostgreSQL; roda schemas.sql na primeira inicialização
└── .env.example
```

## Banco
- **Conexão:** variáveis `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD`. O `config.py` monta a URL com `URL.create`.
- **Tabelas:** criadas **manualmente** com `schemas.sql`. A API não cria tabelas; `check_tables()` falha com o comando `psql` se faltar alguma.
- **Ao mudar uma tabela, atualize juntos o `schemas.sql` e o modelo em `api/models/`.** Os `CHECK` do SQL usam os mesmos valores dos enums de `api/models/enums.py`.
- **Migrações: a definir.** Até lá, uma tabela nova num banco existente é criada rodando só o `CREATE TABLE` dela. Foi assim com a `translation_cache` no banco de desenvolvimento.
- **Resumo das tabelas:**
  - `songs`: a música; `lrc_raw` é a fonte de verdade da sincronia.
    - status: `draft`, `processing`, `waiting_lyrics`, `ready_for_review`, `failed`, `published`, `broken`;
    - `lyrics_plain` é usado no realinhamento;
    - `lrc_candidates` guarda as versões `lrclib` e `aligned` e o `lrclib_estimated_offset_ms`.
  - `lyric_lines`: gerada a partir do `lrc_raw`. Texto vazio = trecho instrumental.
  - `jobs`: a fila do worker.
    - `method`: `auto`, `lrclib` ou `align`;
    - `status`: `queued`, `running`, `done` ou `failed`;
    - também guarda `step`, `log` e `error`.
  - `translation_cache`: uma linha por **trecho** traduzido. `key_hash` = SHA-256 de `kind|en|pt|texto normalizado`.

## Rotas
Cada rota está documentada em **[`API.md`](API.md)**: corpo, resposta, erros, regras e exemplos.

> **Regra obrigatória:** ao **criar ou alterar qualquer rota** (caminho, parâmetros, corpo, resposta, erros ou regras), atualize o `API.md` **na mesma mudança**, incluindo o sumário e uma linha no "Histórico de alterações", e o resumo das rotas no `README.md`. Se a rota for `/admin`, atualize também `web/src/lib/types.ts`. Rota nova ou com corpo alterado: ajuste também `Lyrix.postman_collection.json` (um request por endpoint).

**Acesso:** com `ADMIN_TOKEN` vazio, as rotas `/admin` ficam abertas (uso só no localhost). Preenchido, elas exigem o cabeçalho `X-Admin-Token`.

## Como o LRC é gerado (`services/pipeline.py`)
1. Busca na LRCLIB (`/api/search`), escolhendo o resultado com a duração mais próxima (±2 s) e com LRC sincronizado.
2. **auto:** se houver LRC e a duração bater, usa o LRC da LRCLIB com offset 0. Senão, **alinha**: baixa o áudio do próprio vídeo (yt-dlp), separa a voz (Demucs) e alinha a letra (stable-ts, `original_split=True`). Linhas vazias são inseridas nas pausas de 5 s ou mais.
3. Se houver os dois resultados, estima o offset que a LRCLIB precisaria (`estimate_offset`).
4. Valida (`validate_lines`) e deixa a música em `ready_for_review`. Se não achar a letra, fica em `waiting_lyrics`. Qualquer erro deixa a música em `failed`, com a mensagem no job.

## Como a tradução funciona (`services/translation.py`)
- **Azure Translator:**
  - palavra: **Dictionary Lookup**, com até 3 significados por ordem de `confidence`; se o dicionário não conhecer o termo, usa o **Translate**;
  - frase: **Translate**.
- **Idioma de destino:** `pt`, que é o português do Brasil na Azure. Configurável em `TRANSLATION_TARGET_LANG`.
- **Cache:** antes de chamar a Azure, consulta a `translation_cache`. A normalização (minúsculas, `’` → `'`, espaços únicos) é a mesma de `normalizarConsulta` no app.

## Estado dos testes
- **Testado com YouTube, LRCLIB, alinhamento e Azure simulados:** todos os fluxos de `/admin` e `/translate`, e o `schemas.sql` num PostgreSQL real.
- **Não verificado:**
  - a Azure e a YouTube Data API reais, porque faltam as chaves;
  - o alinhamento real com yt-dlp, Demucs e stable-ts, que não estão instalados (o ffmpeg também não). O desenvolvimento do stable-ts está pausado.

## Pontos em aberto (a definir)
- Migrações do banco (Alembic ou scripts SQL numerados).
- Hospedagem. Sugestões discutidas: Google Cloud Run, Fly.io ou Railway.
- Testes automatizados no repositório.
- Autenticação, inclusive se o usuário precisa de login no MVP.
- Tradução no futuro: dicionário próprio a partir do Wiktionary, Google ML Kit para uso offline, LLM para explicações contextuais.
- Lematização para o toque em palavra. A divisão das palavras já é feita no app.
- Verificação periódica dos vídeos (removidos, bloqueados por país, incorporação desativada) para marcar a música como `broken`.

## Pendências para o futuro (fora do escopo atual)
- **Licença das letras** (Musixmatch ou LyricFind) antes de publicar. A LRCLIB não tem licença das editoras.
- **Termos do YouTube:**
  - não baixar áudio ou vídeo (o yt-dlp é usado só em desenvolvimento);
  - não tocar em segundo plano;
  - não cobrar nem condicionar o acesso ao vídeo, ou seja, **nada de "músicas exclusivas do Premium"**;
  - atualizar os metadados da API a cada 30 dias.
- **Monetização** (anúncios e depois assinatura): fora do MVP.
- **Limitar o uso de `POST /translate`** (rate limit) antes de publicar: a rota é pública e pode esgotar a cota da Azure.
