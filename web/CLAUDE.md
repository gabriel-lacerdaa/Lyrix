# Lyrix · Web de curadoria: contexto do projeto

Aplicação web **interna**, usada só pelo responsável do projeto, para **criar e validar o acervo** de músicas do Lyrix. Ela consome as rotas `/admin` da API (veja `backend/API.md`).

**Fluxo:**
1. Colar o link do YouTube.
2. A API valida o vídeo.
3. Confirmar o artista e o título.
4. O worker gera o LRC em segundo plano.
5. Revisar a letra sincronizada tocando junto com o vídeo.
6. Ajustar o offset ou as linhas.
7. Publicar. A música passa a aparecer no app.

Escopo: **só curadoria.** Sem login (uso no localhost) e sem funcionalidades além disso. Licenças e termos de uso estão fora do escopo por enquanto (só desenvolvimento).

## Tecnologias (decididas)
- **React 19 + Vite 6 + TypeScript** (modo estrito).
- **Sem bibliotecas além do React:**
  - roteamento por hash (`#/`, `#/nova`, `#/musicas/:id`) em `src/lib/router.ts`;
  - `fetch` direto para a API;
  - CSS puro em `src/styles.css`, com tema claro e escuro por `prefers-color-scheme`.
- **Player:** a **IFrame Player API oficial do YouTube**, carregada direto (`src/lib/youtube.ts`) e com tipos mínimos em `src/youtube.d.ts`. O player fica visível, sem nada sobreposto, como no app.

## Estrutura
```
web/
├── index.html
├── src/
│   ├── main.tsx, App.tsx         # entrada e roteamento das páginas
│   ├── styles.css
│   ├── youtube.d.ts              # tipos da IFrame API
│   ├── lib/
│   │   ├── api.ts                # cliente das rotas /admin (ApiError com message/problems/songId)
│   │   ├── types.ts              # espelho dos modelos Pydantic de backend/api/schemas/admin.py
│   │   ├── lrc.ts                # parseLrc/buildLrc/formatTimestamp/findActiveLine (mesmas regras do backend)
│   │   ├── sync.ts               # useLyricSync (âncora 500 ms + interpolação por frame) e useStoredNumber
│   │   ├── youtube.ts            # loadYouTubeApi, mensagens de erro do player
│   │   ├── format.ts             # rótulos em português (status, tipo, método, etapas)
│   │   └── router.ts
│   ├── pages/
│   │   ├── SongsListPage.tsx     # #/ — acervo com filtro por status
│   │   ├── NewSongPage.tsx       # #/nova — colar link, validar, confirmar dados, processar
│   │   └── SongPage.tsx          # #/musicas/:id — progresso, letra faltando, falha, revisão, publicar
│   └── components/
│       ├── ReviewEditor.tsx      # player + letra sincronizada + offset + ajustes + modo marcação
│       ├── SongPanels.tsx        # JobPanel, LyricsForm, ReprocessPanel, MetadataForm
│       ├── YouTubePlayer.tsx
│       └── common.tsx            # StatusBadge, ErrorBox
└── .env.example                  # VITE_API_URL, VITE_ADMIN_TOKEN
```

## Telas
- **Acervo (`#/`):**
  - lista de todas as músicas com status, tipo do vídeo e quantidade de avisos;
  - filtro por status;
  - atualiza sozinha enquanto houver música em processamento.
- **Nova música (`#/nova`):**
  - `POST /admin/songs/import` valida o link e mostra a miniatura, o canal, a duração e o tipo;
  - avisa sobre duplicados (409, com link para a música existente) e sobre músicas parecidas;
  - mostra os motivos de bloqueio (422: incorporação desativada, privado, bloqueado no BR, restrição de idade);
  - campos de artista, título e tipo, já preenchidos e editáveis;
  - "Salvar e processar" chama `POST /admin/songs` e abre a página da música.
- **Música (`#/musicas/:id`):**
  - **Processando:** consulta `GET /admin/songs/{id}` a cada 2 s e mostra a etapa e o log da tarefa. Se a tarefa ficar "Na fila", o worker não está rodando.
  - **Aguardando letra:** um campo para colar a letra, que chama `POST .../lyrics` (alinhamento).
  - **Falhou:** mostra o erro e o log, com as opções de reprocessar ou enviar a letra.
  - **Revisão** (`ReviewEditor`), quando há linhas com texto:
    - player do YouTube e letra com a **linha ativa destacada** pela mesma lógica do app (`tempoDaLetra = tempoDoVídeo − offset`);
    - **offset:** ±100 ms, ±1 s ou digitado. Letra adiantada → aumente; letra atrasada → diminua;
    - **por linha:** clicar no tempo toca desde 1 s antes; botões −/+ 50 ms; "agora" usa o tempo atual do vídeo; editar o texto; "+ pausa" insere uma linha vazia (trecho instrumental); "×" remove a linha;
    - **modo marcação:** com o vídeo tocando, `Espaço` marca o início da linha atual, descontando o tempo de reação (padrão 200 ms, salvo no localStorage). `Backspace` volta uma linha, `Esc` sai;
    - **atalhos fora do modo marcação:** `Espaço` toca e pausa; `←`/`→` ajustam a linha selecionada em 50 ms (500 ms com `Shift`). Não funcionam com o foco dentro do iframe do vídeo;
    - **"Prévia do app"** mostra só a letra, como o usuário verá; **"Acompanhar"** rola a lista até a linha ativa;
    - **avisos:** os do servidor (versão salva; clicar leva à linha) e os locais (linhas fora de ordem);
    - **versões geradas:** carrega o LRC da LRCLIB (com o offset estimado) ou o do alinhamento no editor;
    - **Salvar:** `PATCH` com `offset_ms` e, se as linhas mudaram, `lrc_raw` (gerado por `buildLrc`). A API marca a origem como `manual`;
    - aviso ao sair da página com alterações não salvas.
  - **Cabeçalho:**
    - **Publicar**: desabilitado sem letra ou com alterações não salvas;
    - **Tirar do ar**;
    - **Baixar LRC**: gerado no navegador a partir de `lrc_raw`;
    - **Excluir**: não pode estar publicada nem em processamento.
  - **Seções recolhíveis:**
    - Dados da música (artista, título, tipo, CEFR);
    - Reprocessar (`auto`, `lrclib` ou `align`) ou enviar outra letra;
    - Último processamento.

## Como rodar
1. API e worker em `backend/` (veja `backend/README.md`): `uvicorn api.main:app --reload` e `python -m api.worker`.
2. Em `web/`:
   ```
   npm install
   npm run dev      # http://localhost:5173
   npm run build    # checagem de tipos (tsc) + build de produção em dist/
   ```
3. A API precisa liberar o CORS para `http://localhost:5173`, que já é o padrão de `CORS_ORIGINS` no backend.
4. Se `ADMIN_TOKEN` estiver preenchido no backend, coloque o mesmo valor em `VITE_ADMIN_TOKEN` (`web/.env.local`).

## Regras para manter
- `src/lib/types.ts` deve espelhar `backend/api/schemas/admin.py`. Ao mudar a API, atualize os dois.
- `src/lib/lrc.ts` segue as mesmas regras de `backend/api/services/lrc.py` (formato `[mm:ss.xx]`, vários tempos por linha, metadados ignorados).
- A sincronia (`useLyricSync`) deve continuar igual à que o app mobile vai usar, para a revisão mostrar o que o usuário verá. O app usa busca binária e o site usa uma busca linear, com o mesmo resultado para linhas ordenadas.
- O offset vai sempre no campo `offset_ms`, nunca na tag `[offset:]` do LRC.

## Não verificado
- A reprodução e a sincronia com o vídeo tocando (só o layout e os dados foram conferidos).
- O fluxo de importação completo, que precisa de `YOUTUBE_API_KEY`.

## A definir
- Hospedagem (por enquanto só no localhost).
- Compartilhar a lógica de sincronia com o app mobile num pacote comum, ou manter cópias.
