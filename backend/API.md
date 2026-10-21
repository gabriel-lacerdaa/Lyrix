# API do Lyrix

Documentação das rotas da API (`backend/api/routes/`).

> **Regra:** toda criação ou alteração de rota (caminho, parâmetros, corpo, resposta, códigos de erro ou regras) deve ser refletida neste arquivo **na mesma mudança**. Se a rota for `/admin`, atualize também `web/src/lib/types.ts`. Rota nova ou com corpo alterado: ajuste também `Lyrix.postman_collection.json` (um request por endpoint).

A documentação interativa gerada pelo FastAPI fica em `http://localhost:8000/docs` (Swagger) e `/redoc`. Este arquivo explica as regras de cada rota, que o Swagger não mostra.

## Sumário

| Método | Rota | Uso |
|---|---|---|
| `GET` | [`/health`](#get-health) | Verificação de funcionamento |
| `GET` | [`/songs`](#get-songs) | App: lista as músicas publicadas |
| `GET` | [`/songs/{song_id}`](#get-songssong_id) | App: música publicada com a letra sincronizada |
| `POST` | [`/translate`](#post-translate) | App: tradução de uma palavra ou de uma frase curta |
| `POST` | [`/admin/songs/import`](#post-adminsongsimport) | Curadoria: valida um link do YouTube (não salva) |
| `POST` | [`/admin/songs`](#post-adminsongs) | Curadoria: salva a música e coloca a geração do LRC na fila |
| `GET` | [`/admin/songs`](#get-adminsongs) | Curadoria: lista todas as músicas |
| `GET` | [`/admin/songs/{song_id}`](#get-adminsongssong_id) | Curadoria: detalhe completo, com a última tarefa |
| `PATCH` | [`/admin/songs/{song_id}`](#patch-adminsongssong_id) | Curadoria: edições da revisão (dados, LRC, offset) |
| `POST` | [`/admin/songs/{song_id}/lyrics`](#post-adminsongssong_idlyrics) | Curadoria: envia a letra e coloca o alinhamento na fila |
| `POST` | [`/admin/songs/{song_id}/reprocess`](#post-adminsongssong_idreprocess) | Curadoria: gera o LRC de novo |
| `POST` | [`/admin/songs/{song_id}/publish`](#post-adminsongssong_idpublish) | Curadoria: publica (aparece no app) |
| `POST` | [`/admin/songs/{song_id}/unpublish`](#post-adminsongssong_idunpublish) | Curadoria: tira do ar |
| `DELETE` | [`/admin/songs/{song_id}`](#delete-adminsongssong_id) | Curadoria: exclui a música |
| `GET` | [`/admin/songs/{song_id}/lrc`](#get-adminsongssong_idlrc) | Curadoria: baixa o arquivo `.lrc` |

---

## Convenções

- **Endereço base (desenvolvimento):** `http://localhost:8000`.
- **Formato:** JSON (`Content-Type: application/json`) em todas as rotas, exceto o download do `.lrc`.
- **Datas:** ISO 8601 em UTC (ex.: `"2026-10-20T14:03:12.123456Z"`).
- **Tempos:** sempre em **milissegundos inteiros** (`*_ms`).
- **IDs:** as músicas e as tarefas usam UUIDs em texto. `youtube_video_id` é o ID de 11 caracteres do YouTube.
- **CORS:** liberado para as origens em `CORS_ORIGINS` (padrão: `http://localhost:5173`, a web de curadoria).

### Autenticação das rotas `/admin`
- Se `ADMIN_TOKEN` estiver **vazio** no `.env`, as rotas `/admin` ficam abertas. Isso serve só para uso no localhost.
- Se estiver **preenchido**, toda rota `/admin` exige o cabeçalho `X-Admin-Token: <token>`. Sem ele ou com um valor errado, a resposta é **401** `{"detail": "Token de administrador inválido."}`.
- As rotas `/songs`, `/translate` e `/health` são públicas.

### Formato dos erros
Os erros seguem o padrão do FastAPI, com o campo `detail` em um destes três formatos:

```json
{ "detail": "Música não encontrada." }
```
```json
{ "detail": { "message": "Este vídeo não pode ser usado no app.", "problems": ["O dono do vídeo desativou a reprodução em outros sites (incorporação)."] } }
```
```json
{ "detail": { "message": "Este vídeo já está no acervo.", "song_id": "0b5c…" } }
```

Erros de validação do corpo (campo faltando, tipo errado) voltam como **422** com a lista padrão do FastAPI: `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}`.

Erros comuns a várias rotas:

| Código | Quando |
|---|---|
| 401 | `X-Admin-Token` ausente ou inválido (só quando `ADMIN_TOKEN` está configurado) |
| 404 | `song_id` não existe |
| 409 | A música tem uma tarefa na fila ou em execução: `"Esta música ainda está sendo processada."` |
| 422 | Corpo inválido |

---

## Valores fixos (enums)

| Campo | Valores |
|---|---|
| `status` (música) | `draft` (rascunho), `processing` (tarefa na fila ou em execução), `waiting_lyrics` (a LRCLIB não tem a letra), `ready_for_review` (LRC gerado, aguardando revisão), `failed` (a tarefa falhou), `published` (aparece no app), `broken` (vídeo indisponível; reservado para a verificação periódica, ainda não implementada) |
| `video_kind` | `topic` (canal "Artista – Topic", áudio do álbum), `official_audio`, `clip` |
| `sync_source` | `lrclib` (LRC pronto), `stable_ts` (alinhamento automático), `manual` (editado na revisão) |
| `method` (tarefa) | `auto` (LRC da LRCLIB se a duração bater ±2 s; senão alinhamento), `lrclib` (só o LRC da LRCLIB), `align` (alinhamento no áudio do vídeo) |
| `status` (tarefa) | `queued`, `running`, `done`, `failed` |
| `step` (tarefa) | `fetching_lyrics`, `downloading_audio`, `separating_vocals`, `aligning`, `validating`, `ready_for_review`, `waiting_lyrics`, `failed` |
| `cefr_level` | `A1`, `A2`, `B1`, `B2`, `C1`, `C2` ou `null` |

### Offset
`offset_ms` = **quanto o vídeo está atrasado em relação ao LRC**. O app calcula `tempoDaLetra = tempoDoVídeo − offset_ms` (menos a latência do áudio, no aparelho). Exemplo: um clipe com 5,2 s a mais de introdução tem `offset_ms = 5200`. Um LRC gerado com o áudio do próprio vídeo tem `0`.

---

## Objetos

### `LyricLine`
| Campo | Tipo | Descrição |
|---|---|---|
| `line_index` | int | Posição da linha (0, 1, 2…), em ordem de tempo |
| `start_ms` | int | Início da linha na linha do tempo do LRC |
| `text` | string | Texto. **Vazio = trecho instrumental** (o app apaga o destaque) |

### `SyncWarning`
| Campo | Tipo | Descrição |
|---|---|---|
| `code` | string | Ex.: `few_lines`, `same_time`, `after_end`, `long_gap`, `late_start`, `empty`, `duration_mismatch`, `clip_offset`, `offset_tag_ignored`, `lrclib_offset_estimate` |
| `message` | string | Texto em português para a curadoria |
| `line_index` | int \| null | Linha relacionada, quando houver |

### `Job` (tarefa de processamento)
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | UUID |
| `method` | enum | `auto`, `lrclib` ou `align` |
| `status` | enum | `queued`, `running`, `done` ou `failed` |
| `step` | string \| null | Etapa atual ou final |
| `log` | string | Linhas `[HH:MM:SS] mensagem` |
| `error` | string \| null | Mensagem de erro, quando `failed` |
| `created_at`, `started_at`, `finished_at` | datetime \| null | Datas |

### `AdminSong` (detalhe da curadoria)
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | UUID |
| `youtube_video_id` | string | ID do vídeo (11 caracteres) |
| `title`, `artist` | string | Dados da música (confirmados na importação) |
| `video_title`, `channel_title` | string | Dados do vídeo, vindos da YouTube Data API |
| `video_kind` | enum | Tipo do vídeo |
| `video_duration_ms` | int | Duração do vídeo |
| `thumbnail_url` | string \| null | Miniatura do YouTube |
| `lyrics_plain` | string \| null | Letra em texto puro, usada no alinhamento |
| `lrc_raw` | string \| null | LRC atual: **fonte de verdade** da sincronia |
| `offset_ms` | int | Veja [Offset](#offset) |
| `sync_source` | enum \| null | Origem do LRC atual |
| `synced_on_video_id` | string \| null | Vídeo cujo áudio foi usado para medir o LRC (`null` quando veio pronto da LRCLIB) |
| `sync_warnings` | `SyncWarning[]` | Avisos da validação da versão salva |
| `lrc_candidates` | object | Versões para comparar: `lrclib` (LRC), `aligned` (LRC), `lrclib_estimated_offset_ms` (int). Todas opcionais |
| `status` | enum | Status da música |
| `cefr_level` | string \| null | Nível de inglês |
| `created_at`, `updated_at`, `reviewed_at`, `published_at` | datetime \| null | Datas |
| `lines` | `LyricLine[]` | Linhas geradas a partir de `lrc_raw` |
| `latest_job` | `Job` \| null | Última tarefa (para acompanhar o progresso) |

### `AdminSongSummary` (item da lista da curadoria)
`id`, `youtube_video_id`, `title`, `artist`, `video_kind`, `status`, `warnings_count` (int), `updated_at`.

---

## Sistema

### `GET /health`
Verifica se a API está no ar.

**Resposta 200**
```json
{ "status": "ok" }
```

---

## Rotas do app (públicas)

Só retornam músicas com `status = published`.

### `GET /songs`
Lista o acervo publicado, ordenado por título e artista (o app exibe em ordem A–Z por título).

**Resposta 200**: lista de `SongSummary`:
```json
[
  {
    "id": "0b5c2f4e-…",
    "title": "Never Gonna Give You Up",
    "artist": "Rick Astley",
    "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "video_duration_ms": 213000,
    "cefr_level": "A2"
  }
]
```

### `GET /songs/{song_id}`
Retorna o que o app precisa para tocar a música e sincronizar a letra.

**Resposta 200**: `SongDetail` (os campos de `SongSummary`, mais):
```json
{
  "id": "0b5c2f4e-…",
  "title": "Never Gonna Give You Up",
  "artist": "Rick Astley",
  "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  "video_duration_ms": 213000,
  "cefr_level": "A2",
  "youtube_video_id": "dQw4w9WgXcQ",
  "offset_ms": 0,
  "lines": [
    { "line_index": 0, "start_ms": 19670, "text": "We're no strangers to love" },
    { "line_index": 1, "start_ms": 23560, "text": "You know the rules and so do I (do I)" }
  ]
}
```

**Erros:** 404 `"Música não encontrada."`, também quando ela existe mas não está publicada.

### `POST /translate`
Traduz **só o trecho pedido**, do inglês para o português: uma palavra tocada ou uma frase curta selecionada. A letra inteira nunca é traduzida. Usa o Azure Translator e guarda cada trecho em cache (tabela `translation_cache`), compartilhado entre usuários.

**Corpo**
```json
{ "text": "drifting", "kind": "word" }
```
| Campo | Regras |
|---|---|
| `text` | Obrigatório. Espaços nas pontas são removidos. Palavra: um único termo (sem espaços), até 100 caracteres. Frase: até 300 caracteres |
| `kind` | `word` (palavra) ou `phrase` (frase) |

**Resposta 200**
```json
{ "text": "drifting", "kind": "word", "translation": "flutuando, à deriva", "cached": false }
```
- **`word`:** usa o Dictionary Lookup da Azure e junta até 3 significados distintos, do mais provável ao menos provável, separados por vírgula. Se o dicionário não conhecer o termo (contrações como "we're", nomes, gírias), usa a tradução normal.
- **`phrase`:** usa a tradução normal (Translate).
- **Cache:** a chave é o tipo + o texto normalizado (minúsculas, apóstrofo `’` virando `'`, espaços repetidos virando um só). Um trecho já traduzido volta com `cached: true`, sem consultar a Azure. "Running out of TIME" e "running out of time" são o mesmo trecho.
- O idioma de destino é `TRANSLATION_TARGET_LANG` (padrão `pt`, o português do Brasil na Azure).

**Erros**

| Código | `detail` |
|---|---|
| 422 | Corpo inválido: texto vazio, longo demais, ou palavra com espaço (`"Uma palavra precisa ser um único termo de até 100 caracteres."`) |
| 502 | Falha ao acessar o Azure Translator, inclusive chave inválida (401), cota esgotada (403) ou excesso de requisições (429). A mensagem traz o motivo |
| 503 | `"Tradução indisponível: AZURE_TRANSLATOR_KEY não configurada."` |

---

## Rotas da curadoria (`/admin/songs`)

Fluxo normal: `import` → `POST /admin/songs` → o worker processa → `GET` (acompanhar) → `PATCH` (revisar) → `publish`.

### `POST /admin/songs/import`
**Passo 1 da importação.** Valida o link e o vídeo e devolve os dados sugeridos para confirmação. **Não salva nada.** Consome 1 unidade da cota da YouTube Data API.

**Corpo**
```json
{ "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
```
Formatos aceitos: `youtube.com/watch?v=`, `youtu.be/`, `music.youtube.com/watch?v=`, `/embed/`, `/shorts/`, `/live/`, `/v/` ou só o ID.

**Validações, nesta ordem**
1. O link precisa ter um ID de vídeo válido.
2. O vídeo não pode estar no acervo.
3. `YOUTUBE_API_KEY` precisa estar configurada.
4. O vídeo precisa existir no YouTube.
5. O vídeo precisa poder tocar no app: público ou não listado, com incorporação permitida, sem bloqueio na região `REGION_CODE` (padrão `BR`), sem restrição de idade e com duração maior que zero (transmissões ao vivo são recusadas).

**Resposta 200**: `ImportPreview`:
```json
{
  "youtube_video_id": "dQw4w9WgXcQ",
  "video_title": "Rick Astley - Never Gonna Give You Up (Official Video)",
  "channel_title": "Rick Astley",
  "video_duration_ms": 213000,
  "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "video_kind": "clip",
  "suggested_artist": "Rick Astley",
  "suggested_title": "Never Gonna Give You Up",
  "similar_songs": []
}
```
- `video_kind`, `suggested_artist` e `suggested_title` são deduzidos.
- Em vídeos "Artista – Topic" (ou com a descrição "Provided to YouTube by"), o resultado é confiável.
- Nos demais, o título é separado em "Artista – Música" e marcas como "(Official Video)" são removidas. **Confirme antes de criar.**
- `similar_songs`: músicas do acervo com o mesmo artista e título (sem diferenciar maiúsculas), ou seja, a mesma música em outro vídeo. Cada item tem `id`, `title`, `artist` e `status`.

**Erros**

| Código | `detail` |
|---|---|
| 409 | `{"message": "Este vídeo já está no acervo.", "song_id": "…"}` |
| 422 | `"Link do YouTube inválido."` |
| 422 | `"Vídeo não encontrado no YouTube."` |
| 422 | `{"message": "Este vídeo não pode ser usado no app.", "problems": [...]}` |
| 502 | Falha ao acessar a YouTube Data API (mensagem com o motivo) |
| 503 | `"YOUTUBE_API_KEY não configurada no .env."` |

### `POST /admin/songs`
**Passo 2 da importação.** Valida o vídeo de novo, salva a música e coloca na fila uma tarefa `auto` para gerar o LRC. O worker (`python -m api.worker`) precisa estar rodando para a tarefa andar.

**Corpo**
```json
{
  "youtube_video_id": "dQw4w9WgXcQ",
  "artist": "Rick Astley",
  "title": "Never Gonna Give You Up",
  "video_kind": "clip"
}
```
| Campo | Regras |
|---|---|
| `youtube_video_id` | Obrigatório, exatamente 11 caracteres |
| `artist`, `title` | Obrigatórios, de 1 a 300 caracteres. Espaços nas pontas são removidos. **Usados para buscar a letra na LRCLIB** |
| `video_kind` | Opcional. Se omitido, usa o tipo deduzido |

**Resposta 201**: `AdminSong` com `status = "processing"` e `latest_job.status = "queued"`.

**Erros:** os mesmos do `import` (409, 422, 502 e 503), exceto o de link inválido.

**O que a tarefa `auto` faz** (no worker)
1. Busca a letra na LRCLIB pelo artista e o título, escolhendo o resultado com a duração mais próxima do vídeo e com LRC sincronizado.
2. Se não achar a letra: a música fica em `waiting_lyrics`. Envie a letra com [`/lyrics`](#post-adminsongssong_idlyrics).
3. Se houver LRC e a duração bater (±2 s): usa o LRC da LRCLIB, com `offset_ms = 0` e `sync_source = lrclib`.
4. Senão: alinha a letra no áudio do vídeo (yt-dlp + Demucs + stable-ts), com `sync_source = stable_ts`.
5. Valida o LRC (avisos em `sync_warnings`) e deixa a música em `ready_for_review`.
6. Qualquer erro: a música fica em `failed` e a tarefa guarda o motivo em `error`.

### `GET /admin/songs`
Lista todas as músicas, da atualizada mais recentemente para a mais antiga.

**Parâmetros de consulta**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `status` | enum (opcional) | Filtra pelo status da música. Ex.: `/admin/songs?status=ready_for_review` |

**Resposta 200**: lista de `AdminSongSummary`.

**Erros:** 422 se `status` não for um valor válido.

### `GET /admin/songs/{song_id}`
Detalhe completo da música, incluindo a letra, os avisos, as versões candidatas e a última tarefa. Enquanto `latest_job.status` for `queued` ou `running`, consulte de novo a cada ~2 s para acompanhar o progresso (`step` e `log`).

**Resposta 200**: `AdminSong`.

**Erros:** 404.

### `PATCH /admin/songs/{song_id}`
Salva as edições da revisão. **Só os campos enviados são alterados.**

**Corpo** (todos os campos opcionais)
```json
{
  "artist": "Rick Astley",
  "title": "Never Gonna Give You Up",
  "video_kind": "clip",
  "lyrics_plain": "texto da letra…",
  "lrc_raw": "[ti:…]\n[00:19.67]We're no strangers to love\n…",
  "offset_ms": 1200,
  "cefr_level": "A2"
}
```
| Campo | Regras |
|---|---|
| `artist`, `title` | De 1 a 300 caracteres |
| `video_kind` | `topic`, `official_audio` ou `clip` |
| `lyrics_plain` | Texto livre. Usado num próximo alinhamento |
| `lrc_raw` | Precisa ter pelo menos uma linha com tempo `[mm:ss.xx]` |
| `offset_ms` | Inteiro entre −600000 e 600000 |
| `cefr_level` | `A1`–`C2`, ou `null` para limpar |

**Efeitos**
- **Com `lrc_raw`:**
  - recria as linhas (`lines`, ordenadas por tempo);
  - recalcula `sync_warnings`;
  - define `sync_source = manual` e `synced_on_video_id = youtube_video_id`, porque a edição foi feita sobre o próprio vídeo;
  - se a música estava em `draft`, `failed` ou `waiting_lyrics`, ela passa para `ready_for_review`.
  - A tag `[offset:]` dentro do LRC é **ignorada**: use `offset_ms`.
- **Só com `offset_ms`, sem `lrc_raw`:** recalcula os avisos de validação.
- **Publicada:** a música pode ser editada e as mudanças aparecem no app imediatamente.

**Resposta 200**: `AdminSong` atualizado.

**Erros:** 404; 409 (tarefa em andamento); 422 `"O LRC enviado não tem nenhuma linha com tempo."` ou corpo inválido.

### `POST /admin/songs/{song_id}/lyrics`
Envia a letra (normalmente quando a música está em `waiting_lyrics`) e coloca na fila uma tarefa `align`, que alinha essa letra no áudio do vídeo.

**Corpo**
```json
{ "text": "[Chorus]\nNever gonna give you up (x2)\nNever gonna let you down" }
```
- `text`: obrigatório, não vazio. Uma linha cantada por linha.
- Antes de alinhar, o worker remove cabeçalhos como `[Chorus]` e marcas como `(x2)`. Por isso, repita os refrões por extenso.

**Resposta 202**: `AdminSong` com `status = "processing"` e `latest_job.method = "align"`.

**Erros:** 404; 409 (tarefa em andamento); 409 `"Tire a música do ar antes de reprocessar."` (se publicada); 422.

O alinhamento exige que o worker tenha as dependências de `requirements-processing.txt` e o ffmpeg. Sem elas, a tarefa falha com uma mensagem dizendo o que instalar.

### `POST /admin/songs/{song_id}/reprocess`
Gera o LRC de novo e **substitui o atual, inclusive os ajustes manuais.** O `offset_ms` volta para 0.

**Corpo**
```json
{ "method": "auto" }
```
| `method` | Comportamento |
|---|---|
| `auto` (padrão) | Igual à importação: LRC da LRCLIB se a duração bater, senão alinhamento |
| `lrclib` | Usa só o LRC da LRCLIB, mesmo com a duração diferente (gera o aviso `duration_mismatch`). Falha se a LRCLIB não tiver LRC |
| `align` | Alinha `lyrics_plain` no áudio do vídeo. Se existir um LRC da LRCLIB, calcula `lrc_candidates.lrclib_estimated_offset_ms` e o aviso `lrclib_offset_estimate` |

**Resposta 202**: `AdminSong` com `status = "processing"`.

**Erros:** 404; 409 (tarefa em andamento); 409 `"Tire a música do ar antes de reprocessar."`; 422 (`method` inválido).

### `POST /admin/songs/{song_id}/publish`
Publica a música: ela passa a aparecer em `GET /songs`. Preenche `reviewed_at` e `published_at`.

**Corpo:** nenhum.

**Resposta 200**: `AdminSong` com `status = "published"`.

**Erros:** 404; 409 (tarefa em andamento); 409 `"A música ainda não tem letra sincronizada."` (nenhuma linha com texto).

### `POST /admin/songs/{song_id}/unpublish`
Tira a música do app. Ela volta para `ready_for_review`.

**Corpo:** nenhum.

**Resposta 200**: `AdminSong` com `status = "ready_for_review"`.

**Erros:** 404; 409 `"A música não está publicada."`.

### `DELETE /admin/songs/{song_id}`
Exclui a música, com as linhas e as tarefas dela.

**Resposta 204**: sem corpo.

**Erros:** 404; 409 (tarefa em andamento); 409 `"Tire a música do ar antes de excluir."` (se publicada).

### `GET /admin/songs/{song_id}/lrc`
Baixa o LRC atual (`lrc_raw`) como arquivo.

**Resposta 200**: `text/plain; charset=utf-8`, com `Content-Disposition: attachment; filename="Artista - Título.lrc"`. O nome do arquivo é convertido para ASCII.
```
[ti:Never Gonna Give You Up]
[ar:Rick Astley]
[length:03:33]
[00:19.67]We're no strangers to love
[00:23.56]You know the rules and so do I (do I)
```

**Erros:** 404 `"Música não encontrada."` ou `"A música ainda não tem LRC."`.

---

## Histórico de alterações
| Data | Mudança |
|---|---|
| 2026-10-20 | Documentação inicial: `/health`, `/songs`, `/songs/{id}` e todas as rotas `/admin/songs` |
| 2026-10-20 | `GET /songs`: a ordenação passou de artista e título para **título e artista**, como no design do acervo (A–Z) |
| 2026-10-20 | Nova rota `POST /translate` (Azure Translator: Dictionary Lookup para palavras, Translate para frases), com cache por trecho na tabela `translation_cache` |
