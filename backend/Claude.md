# Lyrix · Backend: contexto do projeto

Este arquivo é o contexto do backend para as próximas sessões do Claude. Ele registra **só o que já foi decidido** e marca como **"a definir"** o que ainda não foi.

## Visão geral do aplicativo
**Lyrix** é um app mobile (Android e iOS, em React Native) para **estudar inglês com músicas**.

1. O usuário escolhe uma música do **acervo curado**.
2. A música toca no **player do YouTube**, que fica visível dentro do app.
3. A **letra aparece sincronizada** com o áudio.
4. O usuário **toca numa palavra** ou **seleciona uma frase curta** para ver a tradução **só daquele trecho**.

**Problema que o app resolve:** a letra sincronizada do Spotify perde a sincronia depois de algum tempo de reprodução e quando a música muda. O objetivo é uma leitura contínua e confiável.

**Estrutura do repositório:**
- `backend/`: este backend.
- `web/`: a aplicação web de curadoria, que consome as rotas `/admin` (veja `web/CLAUDE.md`).
- `app/`: o aplicativo React Native (veja `app/Claude.md`).
- `design/`: as funcionalidades do MVP e as telas (veja `design/Funcionalidades-MVP.md`).

## Objetivo do backend
- **Guardar e servir o acervo curado** de músicas: dados da música, ID do vídeo no YouTube, letra em LRC e offset.
- **Servir a tradução sob demanda** de palavras e frases curtas. Funções previstas:
  - guardar as chaves das APIs de tradução fora do app;
  - manter um **cache por trecho traduzido**, já que palavras e linhas se repetem entre usuários.
- **Apoiar a curadoria:** é por aqui que o responsável pelo projeto cadastra, revisa e publica as músicas (a ferramenta exata está a definir).

## Decisões já tomadas
1. **Spotify descartado.** A reprodução é feita pelo **player do YouTube visível no app** (IFrame). O backend **não** distribui áudio.
2. **Acervo curado:**
   - O usuário **só escolhe entre as músicas do acervo.** Não há busca livre no YouTube.
   - **O responsável pelo projeto adiciona as músicas** manualmente.
3. **Sincronização via LRC:**
   - Cada música tem um arquivo **LRC** com o tempo de início de cada linha.
   - O LRC precisa estar na **linha do tempo do mesmo vídeo** que o app vai tocar.
   - Cada música tem um campo **`offset_ms`** para diferenças constantes entre o LRC e o vídeo.
   - Definição: `offset_ms` = quanto o vídeo está atrasado em relação ao LRC. Exemplo: um clipe com 5,2 s a mais de introdução tem `offset_ms = 5200`. Se o LRC foi gerado com o áudio do próprio vídeo, o valor é `0`.
   - No app: `tempoDaLetra = tempoDoVídeo − offset_ms − latênciaDoÁudio`.
4. **Sincronização por linha no MVP.** A marcação por palavra fica para depois.
5. **Tradução só sob demanda**, de uma palavra ou de uma frase curta selecionada. **O app nunca traduz nem exibe a letra inteira traduzida.** O cache deve ser por **trecho**, nunca uma "letra traduzida da música X".
6. **Escopo do MVP:**
   - uma música por vez, escolhida do acervo;
   - **sem biblioteca do usuário e sem fila de músicas.**
7. **Ambiente:** por enquanto só **desenvolvimento**. Licenciamento de letras e termos de uso do YouTube ficam **fora desta etapa** e precisam ser revistos antes de qualquer publicação nas lojas (veja "Pendências para o futuro").

## Dados do acervo (proposta mínima discutida, a confirmar ao definir o banco)

**Tabela `songs`**

| Campo | Descrição |
|---|---|
| `id` | Identificador |
| `title`, `artist` | Exibição e busca no acervo |
| `youtube_video_id` | **Só o ID do vídeo**, não a URL inteira |
| `video_kind` | `topic` (canal "Artista – Topic", áudio do álbum), `official_audio` ou `clip` |
| `video_duration_ms` | Duração do vídeo, para validar o LRC |
| `lrc_raw` | Texto completo do LRC. **Fonte de verdade** da sincronização |
| `offset_ms` | Deslocamento entre o LRC e o vídeo |
| `sync_source` | Origem do LRC: `lrclib`, `stable_ts` ou `manual` |
| `synced_on_video_id` | ID do vídeo cujo áudio foi usado para gerar o LRC. Se for diferente de `youtube_video_id`, o offset precisa ser revisado |
| `status` | `draft`, `reviewed`, `published` ou `broken`. **Só `published` aparece no app** |
| `cefr_level` | Nível de inglês da música (opcional) |
| `created_at`, `reviewed_at` | Datas da curadoria |

**Tabela `lyric_lines`** (gerada a partir do `lrc_raw` ao salvar)

| Campo | Descrição |
|---|---|
| `song_id`, `line_index` | Identificação da linha |
| `start_ms` | Início da linha |
| `text` | Texto da linha |

- **Não guardar:** o arquivo de áudio nem a URL completa do vídeo.
- **Ideias discutidas para depois (a definir):**
  - tabela de palavras (`lyric_tokens`, com lema e classe gramatical) para o toque em palavra;
  - dicionário próprio (`word_glossary`);
  - pacote JSON versionado por música, publicado em armazenamento com CDN.

## Processo de curadoria (proposto)
1. **Vídeo:** escolher no YouTube, de preferência **"Artista – Topic"**, depois "Official Audio", e o clipe por último. Anotar o ID e a duração, e confirmar que o vídeo pode ser incorporado (`youtube.com/embed/<ID>`).
2. **Áudio:** **só** se for gerar o LRC automaticamente ou no lrc-maker. Baixar com **yt-dlp** (exige ffmpeg) **do mesmo vídeo**. O áudio fica só na pasta local de trabalho.
3. **Letra:** **LRCLIB** (`/api/get` ou `/api/search`, sem chave), que muitas vezes já devolve o `syncedLyrics` pronto. Alternativa: copiar o texto manualmente.
4. **Gerar o LRC:**
   - **A)** LRC pronto da LRCLIB;
   - **B)** automático, com **Demucs** (separa a voz) e **stable-ts** `align` (alinha a letra conhecida);
   - **C)** manual por toque no **lrc-maker** (web).
   - Recomendação: A, e quando faltar, C. B quando o volume crescer.
5. **Revisar:** primeiro ajustar o `offset_ms` global, depois linha a linha. Incluir linhas vazias nos solos, conferir os refrões repetidos e a última linha.
6. **Salvar:** gravar no banco com status `published` depois da revisão.

**A definir:** uma **ferramenta interna de sincronização** ("Estúdio"). Seria uma página web só para administradores, usando o mesmo player do YouTube, com modo tap, revisão e ajuste de offset. Ela dispensaria o download do áudio. Ainda não foi decidido se será feita, nem quando.

## API implementada (estado atual)
**Decidido:** **Python 3.11 + FastAPI**, **SQLAlchemy 2** e um **worker** separado que lê a tabela `jobs`. O worker cuida do processamento pesado: LRCLIB, yt-dlp, Demucs e stable-ts.

**Estrutura**
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
├── README.md                     # visão geral, como rodar, variáveis de ambiente e resumo das rotas
├── API.md                        # documentação de cada rota (manter sempre atualizada)
├── Lyrix.postman_collection.json  # coleção do Postman (um request por endpoint)
├── schemas.sql                   # CREATE TABLE das tabelas (fonte de verdade do banco)
├── requirements.txt              # API
├── requirements-processing.txt   # worker com alinhamento (PyTorch; exige ffmpeg no PATH)
├── docker-compose.yml            # PostgreSQL; roda schemas.sql na primeira inicialização
└── .env.example
```

**Banco**
- **PostgreSQL.** A conexão vem de `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD` no `.env`. O `config.py` monta a URL com `URL.create`, que escapa caracteres especiais da senha. O `docker-compose.yml` lê as mesmas variáveis.
- As tabelas são criadas **manualmente** com `schemas.sql`: `psql -h localhost -p 5432 -U lyrix -d lyrix -f schemas.sql`.
- O `docker-compose.yml` executa o `schemas.sql` sozinho quando o volume está vazio.
- A API **não cria tabelas**. Ao iniciar (API e worker), `check_tables()` falha com uma mensagem clara se faltar alguma.
- **Ao mudar uma tabela, atualize juntos o `schemas.sql` e o modelo em `api/models/`.** Os valores permitidos nos `CHECK` do SQL são os enums de `api/models/enums.py`.
- Migrações (Alembic ou scripts SQL numerados): **a definir**. Até lá, uma tabela nova num banco que já existe é criada à mão, rodando só o `CREATE TABLE` dela (o `schemas.sql` inteiro falha porque as outras já existem). Ex.: a `translation_cache` foi criada assim no banco de desenvolvimento.

**Tabelas** (`schemas.sql`, mapeadas em `api/models/`)
- `songs`: os campos da seção anterior, mais:
  - `video_title`, `channel_title`, `thumbnail_url`;
  - `lyrics_plain` (texto puro, usado para realinhar);
  - `sync_warnings` (avisos da validação);
  - `lrc_candidates` (versões `lrclib` e `aligned`, e `lrclib_estimated_offset_ms`).
- Status de `songs`: `draft`, `processing`, `waiting_lyrics`, `ready_for_review`, `failed`, `published`, `broken`.
- `lyric_lines`: gerada a partir do `lrc_raw`. Texto vazio = trecho instrumental.
- `jobs`: `method` (`auto`, `lrclib`, `align`), `status` (`queued`, `running`, `done`, `failed`), `step`, `log`, `error` e as datas.
- `translation_cache`: uma linha por **trecho** traduzido (palavra ou frase), nunca por música. Chave `key_hash` = SHA-256 de `kind|en|pt|texto normalizado`; guarda `kind` (`word`, `phrase`), idiomas, texto normalizado, tradução e provedor.

**Rotas**

A documentação completa de cada rota está em **[`API.md`](API.md)**: corpo, resposta, códigos de erro, regras e exemplos.

> **Regra obrigatória:** ao **criar ou alterar qualquer rota** (caminho, parâmetros, corpo, resposta, erros ou regras), atualize o `API.md` **na mesma mudança**, incluindo uma linha no "Histórico de alterações" e a tabela abaixo. Se a rota for `/admin`, atualize também `web/src/lib/types.ts`. Rota nova ou com corpo alterado: ajuste também `Lyrix.postman_collection.json` (um request por endpoint).

| Rota | Uso |
|---|---|
| `GET /songs`, `GET /songs/{id}` | App: só músicas `published`, em ordem de título e artista. O detalhe traz `youtube_video_id`, `offset_ms` e `lines` |
| `POST /translate` `{text, kind}` | App: traduz uma palavra (`word`) ou uma frase curta (`phrase`) para o português, com cache por trecho. 503 sem `AZURE_TRANSLATOR_KEY`, 502 se a Azure falhar |
| `POST /admin/songs/import` `{url}` | Valida o link, a duplicidade (409) e o vídeo (422: não incorporável, privado, bloqueado no BR, com restrição de idade). Devolve o artista e o título sugeridos. Não salva nada |
| `POST /admin/songs` `{youtube_video_id, artist, title, video_kind?}` | Cria a música e coloca o LRC na fila (`auto`) |
| `GET /admin/songs?status=` | Lista da curadoria |
| `GET /admin/songs/{id}` | Detalhe completo, com `latest_job` (para acompanhar o progresso) |
| `PATCH /admin/songs/{id}` | Edições da revisão. Um `lrc_raw` enviado vira `manual` e recria as linhas. `offset_ms` recalcula os avisos |
| `POST /admin/songs/{id}/lyrics` `{text}` | Envia a letra quando a LRCLIB não tem. Coloca o alinhamento na fila |
| `POST /admin/songs/{id}/reprocess` `{method}` | Refaz o LRC (`auto`, `lrclib` ou `align`) |
| `POST /admin/songs/{id}/publish`, `/unpublish` | Publica ou tira do ar |
| `DELETE /admin/songs/{id}` | Exclui (não pode estar publicada nem em processamento) |
| `GET /admin/songs/{id}/lrc` | Baixa o arquivo `.lrc` |
| `GET /health` | Verificação de funcionamento |

**Como o LRC é gerado** (`services/pipeline.py`)
1. Busca na LRCLIB (`/api/search`), escolhendo o resultado com a duração mais próxima (±2 s) e com LRC sincronizado.
2. **auto:** se houver LRC e a duração bater, usa o LRC da LRCLIB com offset 0. Senão, faz o **alinhamento**: baixa o áudio do próprio vídeo (yt-dlp), separa a voz (Demucs) e alinha a letra (stable-ts, `original_split=True`). Linhas vazias são inseridas nas pausas de 5 s ou mais.
3. Se houver os dois resultados, estima o offset que a LRCLIB precisaria (`estimate_offset`).
4. Valida (`validate_lines`) e deixa a música em `ready_for_review`. Se não achar a letra, fica em `waiting_lyrics`. Qualquer erro deixa a música em `failed`, com a mensagem no job.

**Como a tradução funciona** (`services/translation.py`)
- **Provedor (decidido): Azure Translator.** Palavra: **Dictionary Lookup**, juntando até 3 significados distintos por ordem de `confidence` (ex.: "flutuando, à deriva"). Se o dicionário não conhecer o termo, usa o **Translate**. Frase: **Translate**.
- Idioma de destino `pt` (português do Brasil na Azure; `pt-pt` é o de Portugal), configurável em `TRANSLATION_TARGET_LANG`.
- Antes de chamar a Azure, consulta a `translation_cache`. A normalização (minúsculas, `’` → `'`, espaços únicos) é a mesma de `normalizarConsulta` no app.
- Configuração: `AZURE_TRANSLATOR_KEY` e `AZURE_TRANSLATOR_REGION` (região do recurso Translator; vazia se ele for "global").

**Acesso:** com `ADMIN_TOKEN` vazio, as rotas `/admin` ficam abertas (uso só no localhost). Preenchido, elas exigem o cabeçalho `X-Admin-Token`.

**Como rodar** (dentro de `backend/`)
```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt            # API
pip install -r requirements-processing.txt # só se for usar o alinhamento
copy .env.example .env                     # e preencha YOUTUBE_API_KEY
psql -h localhost -p 5432 -U lyrix -d lyrix -f schemas.sql   # cria as tabelas (ou docker compose up -d)
uvicorn api.main:app --reload              # API em http://localhost:8000 (documentação em /docs)
python -m api.worker                       # em outro terminal: processa a fila
```

**Verificado:** o `schemas.sql` foi executado num PostgreSQL real (pgserver), e os CHECK recusam valores inválidos. Um teste de fumaça com YouTube, LRCLIB e alinhamento simulados passou por todos os fluxos (importar, duplicado, LRCLIB, publicar, alinhar, edição manual, aguardando letra, falha, excluir). A LRCLIB real foi consultada com sucesso.
A rota `POST /translate` foi testada com o `TestClient` e a Azure simulada: 503 sem chave, 422 nas entradas inválidas, junção dos significados, fallback para o Translate, cache (inclusive com texto normalizado) e 502 em falha da Azure.
**Não verificado:** a Azure real (falta uma chave), a YouTube Data API real (falta uma chave) e o alinhamento real com yt-dlp, Demucs e stable-ts (não instalados; o ffmpeg também não está nesta máquina). O README do stable-ts diz que o desenvolvimento está pausado.

## Pontos em aberto (a definir)
- **Migrações do banco** (Alembic ou scripts SQL numerados): **a definir**.
- **Hospedagem:** **a definir**. Sugestões discutidas e não decididas: Google Cloud Run, Fly.io ou Railway.
- **Testes automatizados no repositório:** **a definir**.
- **Autenticação:** **a definir**, inclusive se o usuário precisa de login no MVP.
- **Tradução no futuro** (o provedor atual é a Azure): dicionário próprio a partir do Wiktionary, Google ML Kit para uso offline, LLM para explicações contextuais. **A definir.**
- **Lematização** para o toque em palavra: **a definir**. A divisão das palavras já é feita no app.
- **Verificação periódica dos vídeos** (removidos, bloqueados por país, incorporação desativada) para marcar a música como `broken`: **a definir**.

## Pendências para o futuro (fora do escopo atual)
- **Licença das letras** (Musixmatch ou LyricFind) antes de publicar. A LRCLIB não tem licença das editoras.
- **Termos do YouTube:**
  - não baixar áudio ou vídeo (o yt-dlp é usado só em desenvolvimento);
  - não tocar em segundo plano;
  - não cobrar nem condicionar o acesso ao vídeo, ou seja, **nada de "músicas exclusivas do Premium"**;
  - atualizar os metadados da API a cada 30 dias.
- **Monetização** (anúncios e depois assinatura): fora do MVP, modelo a definir.
- **Limitar o uso de `POST /translate`** (rate limit por IP ou por usuário) antes de publicar: a rota é pública, e sem limite qualquer pessoa pode consumir a cota da Azure.
