# Lyrix: API

API do **Lyrix**, um app mobile (Android e iOS) para estudar inglês com músicas: o usuário escolhe uma música do acervo, ouve no player do YouTube com a letra sincronizada e toca numa palavra ou frase para ver a tradução.

## 1. Visão geral

A API tem três funções:

1. **Servir o acervo para o app.** Ela lista as músicas publicadas e entrega, para cada uma, o ID do vídeo no YouTube, a letra linha a linha com o tempo de início (gerada a partir de um arquivo LRC) e o `offset_ms`, que corrige diferenças entre a letra e o vídeo.
2. **Traduzir sob demanda.** Ela traduz só a palavra ou a frase curta que o usuário selecionou, do inglês para o português, pelo Azure Translator. Cada trecho traduzido fica em cache no banco e é reaproveitado entre usuários. A letra inteira nunca é traduzida.
3. **Apoiar a curadoria.** As rotas `/admin`, usadas pela web de curadoria (`web/`), servem para:
   - cadastrar músicas a partir de um link do YouTube;
   - gerar a letra sincronizada (LRC) automaticamente;
   - revisar, ajustar e publicar.

**Como o LRC é gerado:** o processamento pesado roda num **worker** separado, que lê uma fila no próprio banco (tabela `jobs`).
1. O worker busca a letra na **LRCLIB**.
2. Se ela já tiver um LRC com a mesma duração do vídeo, o worker usa esse LRC.
3. Senão, ele baixa o áudio do vídeo (**yt-dlp**), separa a voz (**Demucs**) e alinha a letra (**stable-ts**).

**Tecnologias:** Python 3.11, FastAPI, SQLAlchemy 2 e PostgreSQL. As tabelas são criadas manualmente com `schemas.sql`.

```
backend/
├── api/
│   ├── main.py        # aplicação FastAPI
│   ├── config.py      # variáveis de ambiente
│   ├── database.py    # conexão com o banco
│   ├── worker.py      # processador da fila (geração do LRC)
│   ├── routes/        # rotas: songs (app), translate (app), admin_songs (curadoria)
│   ├── schemas/       # modelos Pydantic (entrada e saída das rotas)
│   ├── models/        # mapeamento SQLAlchemy das tabelas
│   └── services/      # YouTube, LRCLIB, LRC, alinhamento, tradução, pipeline
├── schemas.sql                              # criação das tabelas
├── API.md                                   # documentação detalhada de cada rota
├── Lyrix.postman_collection.json         # coleção para testar no Postman
├── docker-compose.yml                       # PostgreSQL opcional via Docker
├── requirements.txt                         # dependências da API
├── requirements-processing.txt              # dependências do alinhamento automático (worker)
└── .env.example
```

## 2. Como rodar

Os comandos abaixo são para Windows. Rode todos dentro da pasta `backend/`.

**Pré-requisitos**
- Python 3.11.
- PostgreSQL 14 ou mais recente, instalado localmente **ou** via Docker (`docker-compose.yml`).
- Opcional, só para o alinhamento automático: o **ffmpeg** no `PATH`.

**Passo a passo**

1. **Crie o ambiente virtual e instale as dependências**
   ```
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
   Só se for usar o alinhamento automático no worker:
   ```
   pip install -r requirements-processing.txt
   ```
   Esse passo instala o PyTorch (vários GB). Sem ele, a API funciona normalmente; só as tarefas que precisam alinhar o áudio falham, com uma mensagem dizendo o que instalar.

2. **Configure as variáveis de ambiente**
   ```
   copy .env.example .env
   ```
   Depois edite o `.env` (veja a [seção 3](#3-variáveis-de-ambiente)).

3. **Suba o PostgreSQL e crie as tabelas.** Escolha uma das opções:
   - **Com Docker:** o container usa as variáveis `POSTGRES_*` do `.env` e executa o `schemas.sql` sozinho na primeira inicialização.
     ```
     docker compose up -d
     ```
   - **Com um PostgreSQL já instalado:** crie o banco e o usuário com os valores do `.env` e rode:
     ```
     psql -h localhost -p 5432 -U lyrix -d lyrix -f schemas.sql
     ```

   A API não cria tabelas. Se faltar alguma, ela não inicia e mostra o comando `psql` que deve ser executado.

4. **Inicie a API**
   ```
   uvicorn api.main:app --reload
   ```
   - A API fica em `http://localhost:8000`.
   - A documentação interativa (Swagger) fica em `http://localhost:8000/docs`.
   - Teste com `http://localhost:8000/health`, que deve responder `{"status": "ok"}`.

5. **Inicie o worker** em outro terminal, também com o `venv` ativado. Ele processa a fila de geração de LRC:
   ```
   python -m api.worker
   ```
   Para processar só o que está na fila e sair, use `python -m api.worker --once`. Sem o worker rodando, as músicas cadastradas ficam paradas com o status "processando".

6. **Opcional:** importe o `Lyrix.postman_collection.json` no Postman para testar as rotas, ou rode a web de curadoria (`web/`, `npm run dev`).

## 3. Variáveis de ambiente

As variáveis ficam em `backend/.env`. Todas têm um valor padrão, então só as marcadas como **obrigatórias** precisam ser preenchidas para usar as funcionalidades correspondentes. Variáveis definidas no sistema operacional têm prioridade sobre o `.env`.

### Banco de dados

| Variável | Padrão | Descrição |
|---|---|---|
| `POSTGRES_HOST` | `localhost` | Endereço do servidor PostgreSQL |
| `POSTGRES_PORT` | `5432` | Porta do PostgreSQL |
| `POSTGRES_DB` | `lyrix` | Nome do banco |
| `POSTGRES_USER` | `lyrix` | Usuário do banco |
| `POSTGRES_PASSWORD` | `lyrix` | Senha do usuário. Pode ter caracteres especiais |

O `docker-compose.yml` usa essas mesmas variáveis para criar o banco no container.

### YouTube

| Variável | Padrão | Descrição |
|---|---|---|
| `YOUTUBE_API_KEY` | vazio | **Obrigatória para cadastrar músicas.** É a chave da YouTube Data API v3, usada para validar o vídeo (se existe, se é público, se pode ser incorporado e se toca no Brasil) e ler o título, a duração e a miniatura. Sem ela, `POST /admin/songs/import` e `POST /admin/songs` respondem 503 |
| `REGION_CODE` | `BR` | País usado para verificar se o vídeo está bloqueado na região (código de 2 letras) |

**Como obter a `YOUTUBE_API_KEY`** (gratuita)
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) com uma conta Google.
2. Crie um projeto: no seletor de projetos, no topo, clique em **Novo projeto**.
3. Em **APIs e serviços → Biblioteca**, procure **YouTube Data API v3** e clique em **Ativar**.
4. Em **APIs e serviços → Credenciais**, clique em **Criar credenciais → Chave de API**.
5. Copie a chave para `YOUTUBE_API_KEY` no `.env`.
6. Recomendado: em **Editar chave de API → Restrições de API**, restrinja a chave à **YouTube Data API v3**.

A cota gratuita padrão é de 10.000 unidades por dia, e cada validação de vídeo consome 1 unidade. Confirme a cota atual no console, em **APIs e serviços → YouTube Data API v3 → Cotas**.

### Tradução (Azure Translator)

| Variável | Padrão | Descrição |
|---|---|---|
| `AZURE_TRANSLATOR_KEY` | vazio | **Obrigatória para `POST /translate`.** Chave do recurso Translator da Azure. Sem ela, a rota responde 503 |
| `AZURE_TRANSLATOR_REGION` | vazio | Região do recurso (ex.: `brazilsouth`, `eastus`). **Obrigatória se o recurso for regional**; deixe vazia se ele for **Global** |
| `AZURE_TRANSLATOR_ENDPOINT` | `https://api.cognitive.microsofttranslator.com` | Endereço da API de tradução. Normalmente não precisa mudar |
| `TRANSLATION_TARGET_LANG` | `pt` | Idioma de destino. Na Azure, `pt` é o português do Brasil (`pt-pt` é o de Portugal) |

**Como obter a `AZURE_TRANSLATOR_KEY` e a `AZURE_TRANSLATOR_REGION`**
1. Crie uma conta no [portal da Azure](https://portal.azure.com/). A criação pede um cartão de crédito, mesmo para o plano gratuito.
2. No portal, clique em **Criar um recurso**, procure **Translator** e clique em **Criar**.
3. Preencha:
   - **Grupo de recursos:** crie um novo (ex.: `lyrix`);
   - **Região:** escolha uma (ex.: **Brazil South**) ou **Global**;
   - **Nome:** qualquer nome único;
   - **Tipo de preço:** **Free F0**. O plano gratuito permite cerca de 2 milhões de caracteres por mês; confirme o limite atual na página de preços da Azure.
4. Depois de criado, abra o recurso e vá em **Chaves e Ponto de Extremidade**.
5. Copie a **Chave 1** para `AZURE_TRANSLATOR_KEY`.
6. Copie o campo **Local/Região** para `AZURE_TRANSLATOR_REGION`. Se a região do recurso for **Global**, deixe a variável vazia.

### Curadoria e acesso

| Variável | Padrão | Descrição |
|---|---|---|
| `ADMIN_TOKEN` | vazio | Senha das rotas `/admin`. **Vazio = rotas abertas** (aceitável só no localhost). Preenchido = toda rota `/admin` exige o cabeçalho `X-Admin-Token` com esse valor. Para a web de curadoria, coloque o mesmo valor em `VITE_ADMIN_TOKEN` (`web/.env.local`) |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Origens que podem chamar a API pelo navegador, **em formato JSON**. O padrão libera a web de curadoria |

### LRCLIB (letras)

| Variável | Padrão | Descrição |
|---|---|---|
| `LRCLIB_BASE_URL` | `https://lrclib.net/api` | Endereço da LRCLIB. Pública e sem chave |
| `LRCLIB_USER_AGENT` | `Lyrix-curadoria/0.1 (desenvolvimento)` | Identificação enviada à LRCLIB em cada requisição |
| `DURATION_TOLERANCE_MS` | `2000` | Diferença máxima entre a duração da letra na LRCLIB e a do vídeo para usar o LRC pronto |

### Worker e alinhamento automático

| Variável | Padrão | Descrição |
|---|---|---|
| `TEMP_DIR` | `./tmp` | Pasta temporária para o áudio baixado. É apagada ao fim de cada tarefa |
| `WHISPER_MODEL` | `base` | Modelo do Whisper usado pelo stable-ts (`tiny`, `base`, `small`, `medium`…). Maior é mais preciso e mais lento |
| `DEMUCS_MODEL` | `htdemucs` | Modelo do Demucs para separar a voz |
| `WORKER_POLL_SECONDS` | `2.0` | Intervalo, em segundos, entre as verificações da fila quando ela está vazia |

## 4. Rotas

Resumo de cada rota. Os detalhes (corpo, resposta, regras de validação, códigos de erro e exemplos) estão em **[API.md](API.md)**, e a coleção do Postman tem um exemplo pronto de cada uma.

### Sistema

| Rota | Para que serve | Como funciona |
|---|---|---|
| `GET /health` | Verificar se a API está no ar | Responde `{"status": "ok"}` |

### App (públicas)

| Rota | Para que serve | Como funciona |
|---|---|---|
| `GET /songs` | Mostrar o acervo no app | Lista só as músicas **publicadas**, ordenadas por artista e título, com título, artista, miniatura, duração e nível CEFR |
| `GET /songs/{song_id}` | Abrir uma música no app | Devolve o `youtube_video_id` (para o player), o `offset_ms` e as linhas da letra com o tempo de início (`start_ms`). Linhas com texto vazio marcam trechos instrumentais. Responde 404 se a música não existir ou não estiver publicada |
| `POST /translate` | Traduzir o trecho que o usuário tocou | Recebe `{"text", "kind"}`, em que `kind` é `word` (palavra) ou `phrase` (frase curta). Palavras usam o dicionário da Azure, com até 3 significados; frases usam a tradução normal. Consulta primeiro o cache e responde com `cached: true` quando o trecho já foi traduzido |

### Curadoria (`/admin`, usadas pela web de curadoria)

Fluxo normal: **validar link → salvar → o worker gera o LRC → revisar e ajustar → publicar**.

| Rota | Para que serve | Como funciona |
|---|---|---|
| `POST /admin/songs/import` | Validar um link do YouTube antes de cadastrar | Extrai o ID do vídeo e verifica se ele já está no acervo e se pode tocar no app. Sugere o artista, o título e o tipo do vídeo. **Não salva nada** |
| `POST /admin/songs` | Cadastrar a música | Valida o vídeo de novo, salva a música com o artista e o título confirmados e coloca na fila a geração do LRC. A música fica com o status "processando" até o worker terminar |
| `GET /admin/songs` | Ver o acervo da curadoria | Lista todas as músicas, de qualquer status, da atualizada mais recentemente para a mais antiga. Aceita o filtro `?status=` |
| `GET /admin/songs/{song_id}` | Revisar ou acompanhar uma música | Devolve tudo: letra, LRC, offset, avisos de validação, versões candidatas do LRC e a última tarefa (etapa e log). Durante o processamento, consulte de novo a cada ~2 s |
| `PATCH /admin/songs/{song_id}` | Salvar as edições da revisão | Altera só os campos enviados: artista, título, tipo, letra, LRC, offset, CEFR. Um LRC enviado recria as linhas, recalcula os avisos e passa a origem para "manual" |
| `POST /admin/songs/{song_id}/lyrics` | Enviar a letra quando a LRCLIB não tem | Salva o texto e coloca na fila o alinhamento automático no áudio do vídeo |
| `POST /admin/songs/{song_id}/reprocess` | Gerar o LRC de novo | Coloca uma nova tarefa na fila com o método `auto`, `lrclib` ou `align`. Substitui o LRC atual, inclusive os ajustes manuais |
| `POST /admin/songs/{song_id}/publish` | Liberar a música no app | Exige letra sincronizada. A música passa a aparecer em `GET /songs` |
| `POST /admin/songs/{song_id}/unpublish` | Tirar a música do app | A música volta para "pronta para revisão" |
| `DELETE /admin/songs/{song_id}` | Excluir uma música | Remove a música, as linhas e as tarefas. Não é permitido se ela estiver publicada ou em processamento |
| `GET /admin/songs/{song_id}/lrc` | Baixar o arquivo `.lrc` | Devolve o LRC atual como arquivo de texto |

As rotas que alteram uma música respondem **409** enquanto ela tiver uma tarefa na fila ou em execução.
