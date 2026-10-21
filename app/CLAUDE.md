# Lyrix · App (React Native): contexto do projeto

Contexto do app mobile para as próximas sessões do Claude. Ele registra o que já foi decidido e marca como **"a definir"** o que ainda não foi. A visão geral do produto e das pastas está no `README.md` da raiz. As telas estão em `design/`. A API está em `backend/API.md`.

**Fluxo do MVP:**
1. Escolher uma música do acervo.
2. Ouvir com a letra sincronizada, com a linha atual destacada.
3. Tocar numa palavra ou selecionar uma frase curta para ver a tradução.

**Escopo:** **uma música por vez. Sem biblioteca do usuário e sem fila de músicas.** A sincronia precisa ser **estável do começo ao fim**, que é o problema do Spotify que o app resolve.

## Decisões já tomadas
1. **React Native**, para Android e iOS.
2. **Player do YouTube visível no app** (IFrame Player API). O Spotify foi descartado.
3. **Acervo curado:** o app lista só as músicas publicadas pelo backend. Não há busca livre no YouTube.
4. **Letra sincronizada via LRC, por linha.** `GET /songs/{id}` traz:
   - `youtube_video_id`: o ID do vídeo, não a URL;
   - `lines`: as linhas **já interpretadas pelo backend** a partir do LRC (ordenadas por tempo, vários tempos por linha já expandidos, texto vazio = instrumental, tag `[offset:]` ignorada). **O app não tem parser de LRC** e não recebe `lrc_raw`;
   - `offset_ms`: quanto o vídeo está atrasado em relação ao LRC (ex.: `5200` para um clipe com 5,2 s a mais de introdução; `0` se o LRC foi gerado com o áudio do próprio vídeo).
5. **Tradução só sob demanda** (palavra ou frase curta). **Nunca traduzir nem exibir a letra inteira traduzida.**
6. **Ambiente atual:** só desenvolvimento. Licenças e termos de uso ficam para depois.
7. **Projeto:** **Expo (SDK 57) + TypeScript**, com `expo-router` (pilha simples: Acervo → Música). Está no SDK 57 porque o Expo Go da Play Store ainda não suporta o 58; subir para o 58 quando ele atualizar (`npx expo install expo@^58.0.0 && npx expo install --fix`; o gesture-handler 3 do SDK 58 também tem o builder `Gesture` como API legada).
8. **Bibliotecas:**
   - player: `react-native-youtube-iframe` + `react-native-webview`. Estados (`onChangeState`): `unstarted`, `video cued`, `buffering`, `playing`, `paused`, `ended`. Erros (`onError`): `invalid_parameter`, `HTML5_error`, `video_not_found`, `embed_not_allowed`. `onPlaybackRateChange` recebe um **número**;
   - dados e cache em memória: `@tanstack/react-query` (`networkMode: 'always'`, para a consulta falhar sem rede em vez de ficar pausada). Sem cache persistente;
   - conexão: `@react-native-community/netinfo`;
   - gestos e animações: `react-native-gesture-handler` 2 (builder `Gesture.Pan()` + `GestureDetector`) e `react-native-reanimated` 4 (usar `.get()`/`.set()` nos shared values e evitar refs nos callbacks dos gestos, por causa das regras do React Compiler no lint);
   - ícones: `lucide-react-native`; fontes: `@expo-google-fonts/*` (Plus Jakarta Sans e Atkinson Hyperlegible).
9. **Visual:** segue `design/telas/*.html` e o `design/Guia-de-Identidade-Visual.md`. Os tokens estão copiados em `src/theme/tokens.ts`. O modo escuro segue o sistema.
10. **Acervo:** ordem A–Z por título (o backend passou a ordenar por título e artista). Tem "puxar para atualizar". Sem busca, sem CEFR, com a miniatura do YouTube (ou um bloco tingido se não houver).
11. **Rolagem da letra:** a linha atual fica a ~1/3 da área. Rolar manualmente pausa a rolagem e mostra "Voltar à linha atual"; o acompanhamento volta após ~5 s sem rolar ou ao tocar no botão. Também fica pausada com o painel aberto e durante um anúncio.
12. **Toque em palavra e seleção de frase:** a divisão das palavras é feita **no app** (`src/features/letra/tokenizar.ts`, por espaços, mantendo contrações; a pontuação das pontas sai da consulta). Tocar numa palavra traduz a palavra. Segurar uma linha (450 ms) seleciona a linha inteira, e as alças encurtam a seleção, até **2 linhas consecutivas**. A tradução da frase atualiza ao soltar a alça.
13. **Painel de tradução:** sheet próprio (reanimated), dentro da área da letra, sem véu. A música não pausa. Fecha pelo X, arrastando para baixo ou pelo botão voltar do Android (que fecha o painel antes de sair da música).
14. **Tradução pelo backend:** `src/api/translate.ts` chama `POST /translate` (Azure Translator, com cache por trecho no backend; veja `backend/API.md`), mapeando `palavra → word` e `frase → phrase`. As chaves do provedor **nunca** ficam no app. Qualquer falha (sem chave = 503, erro da Azure = 502, sem rede) mostra o erro do painel (tela 18).
15. **Anúncio:** **heurística** em `src/features/player/relogio.ts`. O player diz `playing`, mas o tempo não avança (menos de 50 ms) por pelo menos 1,5 s (`buffering` não conta). Isso mostra a faixa da tela 10 e tira o destaque. **No primeiro teste no Moto G7 um anúncio tocou e a faixa não apareceu:** é preciso ver o que o player informa durante o anúncio e ajustar.
16. **Erros ao abrir a música:** 404 (música tirada do ar) mostra a tela 11, "Música indisponível". Outros erros com rede mostram o layout da tela 12 com ícone de alerta, "Não foi possível carregar a música", Tentar de novo / Voltar ao acervo. Sem rede mostra a tela 12.
17. **Segundo plano:** `AppState` = `background` pausa o player. Ao voltar, o usuário retoma pelo player.

## Como a sincronização funciona
- **Leitura do tempo do vídeo:** `getCurrentTime()` é **assíncrono** (passa pela WebView). Por isso:
  1. **Âncora:** ler o tempo real a cada ~500 ms e logo após cada mudança de estado. Guardar `{ tempoDoVídeo, momentoLocal }`.
  2. **Interpolação:** a cada frame, estimar `tempoAtual = âncora.tempoDoVídeo + (agora − âncora.momentoLocal) × velocidade`.
  3. Cada nova leitura corrige a estimativa, então o erro não se acumula.
- **Escolha da linha:**
  - `tempoDaLetra = tempoAtual − offset_ms − latênciaDoÁudio`;
  - em seguida, **busca binária** pela última linha com `início ≤ tempoDaLetra`;
  - um seek é tratado automaticamente;
  - linhas com texto vazio apagam o destaque (trecho instrumental).
- **Regra do YouTube:** **não sobrepor nada ao player** e mantê-lo com no mínimo 200×200 px.

## Implementação atual
```
app/
├── src/app/              # rotas (expo-router): _layout.tsx, index.tsx (Acervo), musica/[id].tsx (Música)
├── src/api/              # client.ts (erros: rede / nao_encontrado / servidor), songs.ts, types.ts, translate.ts (POST /translate)
├── src/theme/            # tokens.ts (guia, seção 10), tipografia.ts, useCores.ts
├── src/components/       # Botao, BotaoIcone, Esqueleto, EstadoMensagem, FaixaAviso
├── src/features/acervo/  # CardMusica + esqueleto da lista
├── src/features/player/  # Reproducao (tela de música), relogio.ts + useLinhaAtual.ts (sincronização), estados
├── src/features/letra/   # Letra (rolagem), LinhaLetra, linhaAtual.ts (busca binária), tokenizar.ts
├── src/features/traducao/# PainelTraducao, AlcasSelecao, selecao.ts, useTraducao.ts
├── src/hooks/            # useConexao (sem rede / faixa da tela 13), useAoIrParaSegundoPlano
└── __tests__/            # testes da lógica pura (sincronização, detector de anúncio, tokenização, seleção)
```
- **Latência do áudio:** `LATENCIA_DO_AUDIO_MS = 0` (`src/features/letra/linhaAtual.ts`) até o ajuste ser decidido.
- **Velocidade:** o app não tem controle próprio, mas respeita a velocidade escolhida no menu do player (`onPlaybackRateChange`).
- **Worklets (reanimated):** dentro de `useAnimatedStyle` (e de qualquer worklet) **não chame funções JS comuns**: calcule os valores fora e use só o resultado. Uma chamada assim derrubava o app ao abrir a música (tela vermelha no Android, fechamento no iOS), e nem o `tsc` nem o lint pegam.
- **Player:** o `react-native-youtube-iframe` carrega por padrão uma página `iframe.html` hospedada pelo autor da biblioteca (`baseUrlOverride` permite hospedar uma cópia própria). Rever antes de publicar.

**Como rodar** (dentro de `app/`)
```
npm install
copy .env.example .env.local      # ajuste EXPO_PUBLIC_API_URL para o IP da máquina
npx expo start                    # abrir no Expo Go (Android/iOS)
npm test                          # testes (jest-expo)
npx tsc --noEmit && npx expo lint # tipos e lint
```
O backend precisa rodar com `uvicorn api.main:app --reload --host 0.0.0.0` para o celular acessar.

**Verificado:** `tsc`, `expo lint`, `expo-doctor` (21/21, SDK 57), os 23 testes unitários e o bundle Android (`expo export`).
**Verificado no aparelho (Moto G7, Expo Go 57):** o acervo carrega e a tela da música abre com o player e a letra.
**Não verificado:** sincronia do começo ao fim, gestos, rolagem, tradução real (falta a chave da Azure no backend), segundo plano, Bluetooth e o iPhone depois da correção dos worklets.

## Pontos em aberto (a definir)
- **Ajuste de latência do áudio** (Bluetooth) pelo usuário, e se entra no MVP: **a definir**.
- **Controle de velocidade de reprodução** no app (a API do YouTube permite 0,25×–2×), e se entra no MVP: **a definir**.
- **Login do usuário** no MVP: **a definir**.
- **Comportamento real durante os anúncios:** validar a heurística no aparelho e ajustar os limites.
- **Idiomas da interface:** **a definir**. Hoje a interface é em português. A tradução é do inglês para o português.

## Próximo passo sugerido (ainda não decidido)
Testar no aparelho com 5 músicas (3 vídeos "Topic" e 2 clipes) para medir:
- o jitter do `getCurrentTime()`;
- o comportamento durante os anúncios (e se a heurística dispara);
- a latência com fone Bluetooth.

## Pendências para o futuro (fora do escopo atual)
- Licença das letras antes de publicar nas lojas.
- Termos do YouTube:
  - não tocar em segundo plano;
  - não sobrepor nada ao player;
  - não cobrar nem condicionar o acesso ao vídeo (nada de "músicas exclusivas do Premium").
- Monetização (anúncios e depois assinatura): fora do MVP, modelo a definir.
