# Guia de Identidade Visual — Lyrix (MVP)

Este guia define a identidade visual do app: fontes, cores, espaçamentos e regras de estilo. As telas de referência estão em [`telas/`](telas/index.html) e usam exatamente os tokens daqui (arquivo [`telas/estilos.css`](telas/estilos.css)).

---

## 1. Identidade visual

### Conceito: "leitura calma com um ponto de luz"

O app é estudado por períodos longos, com o olhar indo e voltando entre o vídeo e a letra. Por isso a interface é **fria, neutra e silenciosa**, e só um elemento chama a atenção: a **linha que está sendo cantada**, destacada em âmbar — o único tom quente do app.

### Princípios

1. **A letra é a protagonista.** Tudo o que não for player ou letra é pequeno, discreto e fica fora do caminho.
2. **Um destaque por vez.** O âmbar é exclusivo da linha atual. A cor primária (índigo) marca o que o usuário escolheu (palavra, frase, botões). As duas nunca têm o mesmo papel.
3. **Nada sobre o player.** O player do YouTube é intocável: nenhum aviso, botão ou painel fica por cima dele.
4. **Toque confortável.** Toda área de toque tem pelo menos 44 × 44 px, inclusive cada palavra da letra.
5. **Acessível por padrão.** Contraste mínimo de 4,5:1 em todo texto, e nenhuma informação transmitida só por cor.

### Personalidade

| É | Não é |
|---|---|
| Calmo, claro, encorajador | Infantil, gamificado, barulhento |
| Moderno e minimalista | Frio ou técnico demais |
| Direto ("Toque numa palavra…") | Cheio de jargão ou de pontos de exclamação |

**Tom de voz:** frases curtas, em segunda pessoa ("você"), dizendo o que aconteceu e o que fazer. Exemplo: "Não foi possível traduzir agora." + botão "Tentar de novo".

---

## 2. Fontes

| Uso | Fonte | Pesos | Por quê |
|---|---|---|---|
| Interface e títulos | **Plus Jakarta Sans** | 400, 500, 600, 700, 800 | Geométrica, aberta e moderna, mas amigável. Dá personalidade sem chamar mais atenção que a letra. |
| Letra da música e traduções | **Atkinson Hyperlegible** | 400, 700 | Criada pelo Braille Institute para máxima legibilidade. Diferencia **I / l / 1** e **O / 0**, o que importa em inglês ("I'll", "left", "I"). |

- As duas são gratuitas, no Google Fonts, com licença SIL Open Font License (OFL) — podem ser embarcadas no app.
- React Native (Expo): `@expo-google-fonts/plus-jakarta-sans` e `@expo-google-fonts/atkinson-hyperlegible`. Sem Expo: baixar os `.ttf` e linkar como assets.
- **Fallback:** fonte do sistema (San Francisco no iOS, Roboto no Android).
- Usar a Atkinson **só** no conteúdo em inglês e nas traduções. Isso ajuda o usuário a separar "conteúdo de estudo" de "interface".

### Escala tipográfica

| Token | Fonte | Tamanho / altura da linha | Peso | Uso |
|---|---|---|---|---|
| `titulo-tela` | Plus Jakarta | 28 / 34 | 800 (−1% de espaçamento) | "Músicas" |
| `titulo-mensagem` | Plus Jakarta | 20 / 26 | 800 | Títulos de estados vazio, erro e fim |
| `titulo-barra` | Plus Jakarta | 17 / 22 | 700 | Título da música na barra superior |
| `card-titulo` | Plus Jakarta | 17 / 22 | 600 | Título no card de música |
| `corpo` | Plus Jakarta | 16 / 24 | 400 | Textos gerais |
| `secundario` | Plus Jakarta | 15 / 20 | 500 | Artista, subtítulos, textos de estado |
| `aviso` | Plus Jakarta | 14 / 20 | 600 | Faixas de aviso (anúncio, sem conexão) |
| `legenda` | Plus Jakarta | 13 / 18 | 500 | Dica abaixo do player, artista na barra |
| `rotulo` | Plus Jakarta | 12 / 16 | 700, caixa alta, +8% de espaçamento | "PALAVRA", "FRASE", "8 MÚSICAS · A–Z" |
| `botao` | Plus Jakarta | 16 / 20 | 700 | Botões |
| `letra` | Atkinson | 20 / 30 | 400 | Linhas da letra |
| `letra-atual` | Atkinson | 20 / 30 | 700 | Linha que está sendo cantada |
| `painel-palavra` | Atkinson | 28 / 34 | 700 | Palavra no painel de tradução |
| `painel-frase` | Atkinson | 22 / 30 | 700 | Frase no painel de tradução |
| `traducao` | Atkinson | 20 / 28 | 400 | Tradução em português |

**Tamanho do texto do sistema:** todas as fontes devem acompanhar o ajuste de acessibilidade do aparelho (Dynamic Type no iOS, escala de fonte no Android). No React Native isso já é o padrão (`allowFontScaling`). Recomenda-se limitar a escala da letra a cerca de 1,6× (`maxFontSizeMultiplier`) para que o layout não quebre.

---

## 3. Paleta de cores

### Cores principais

| Papel | Modo claro | Modo escuro | Uso | Por que esta cor |
|---|---|---|---|---|
| **Primária** — Índigo | `#4F46E5` (pressionado `#4338CA`) | `#A5A1FF` | Botões, links, seleção de palavra e frase, foco, botão "Voltar à linha atual" | Azul-violeta transmite foco, confiança e concentração — cores associadas a estudo — sem a frieza de um azul corporativo. |
| **Secundária** — Verde-azulado | `#0F766E` | `#5EEAD4` | Painel de tradução: rótulo ("PALAVRA"/"FRASE") e texto traduzido | Calma e clareza. Usada só na tradução, cria a associação "esta cor = significado". |
| **Fundo** | `#F6F6FA` | `#111218` | Fundo das telas | Branco levemente frio: ofusca menos que o branco puro e cansa menos em leituras longas. |
| **Texto** | `#1C1B2E` | `#EDEDF3` | Títulos, linha atual, palavra no painel | Quase preto azulado: contraste alto (15,6:1) mas menos duro que o preto puro. |
| **Destaque** — Âmbar | `#F5B83D` (tinta `#FFEDB5`) | tinta `#3D3218` | **Somente** o fundo da linha que está sendo cantada | Único tom quente: lembra música, energia e "aqui e agora". Como é exclusivo, o olho encontra a linha atual na hora. |
| **Sucesso** | `#15803D` | `#4ADE80` | Fim da música, "Conexão restabelecida" | Verde clássico de conclusão, em tom escuro o bastante para texto. |
| **Erro** | `#B42318` | `#FF8A7A` | Falha ao carregar, sem conexão, vídeo indisponível, erro de tradução | Vermelho sóbrio: avisa sem alarmar. |

### Cores de apoio

| Token | Modo claro | Modo escuro | Uso |
|---|---|---|---|
| `superficie` | `#FFFFFF` | `#1B1C25` | Cards, painel de tradução |
| `superficie-2` | `#EEEEF4` | `#252633` | Fundo de ícone pressionado, área do player quando ele não carrega |
| `borda` | `#DCDCE6` | `#33344A` | Bordas de cards, divisores, alça do painel |
| `texto-2` (secundário) | `#5C5B70` | `#A6A7B8` | Artista, linhas da letra que não são a atual, legendas |
| `primaria-tinta` | `#E7E5FF` | `#2E2B5C` | Fundo da palavra/frase selecionada, botão secundário, aviso de anúncio |
| `sobre-primaria-tinta` | `#3730A3` | `#C7C4FF` | Texto sobre `primaria-tinta` |
| `secundaria-tinta` | `#DDF3F0` | `#123B37` | Miniaturas (variação) |
| `destaque-texto` | `#8A6100` | `#F5B83D` | Ícone sobre a tinta âmbar (miniaturas) |
| `sucesso-tinta` | `#DCF5E5` | `#12321F` | Fundo do selo de "Fim da música" |
| `erro-tinta` | `#FDE4E1` | `#3A1C1A` | Fundo de avisos e selos de erro |
| `esqueleto` | `#E4E4EC` | `#2A2B38` | Blocos de carregamento |
| `sombra` | `rgba(28,27,46,.14)` | `rgba(0,0,0,.55)` | Painel de tradução e botão flutuante |
| `player-fundo` | `#000000` | `#000000` | Área do player (igual nos dois modos) |

### Contraste (WCAG)

| Combinação | Razão | Nível |
|---|---|---|
| Texto `#1C1B2E` sobre fundo `#F6F6FA` | 15,6:1 | AAA |
| Texto secundário `#5C5B70` sobre fundo | 6,1:1 | AA |
| Texto da linha atual sobre âmbar `#FFEDB5` | 14,5:1 | AAA |
| Branco sobre primária `#4F46E5` | 6,3:1 | AA |
| Seleção `#3730A3` sobre `#E7E5FF` | 8,1:1 | AAA |
| Secundária `#0F766E` sobre branco | 5,5:1 | AA |
| Erro `#B42318` sobre branco | 6,6:1 | AA |
| Sucesso `#15803D` sobre branco | 5,0:1 | AA |
| Escuro: texto `#EDEDF3` sobre `#111218` | 16,0:1 | AAA |
| Escuro: texto secundário `#A6A7B8` sobre `#1B1C25` | 7,1:1 | AAA |
| Escuro: primária `#A5A1FF` sobre `#111218` | 8,1:1 | AAA |
| Escuro: secundária `#5EEAD4` sobre `#1B1C25` | 11,5:1 | AAA |

### Modo escuro

O modo escuro segue a configuração do sistema. Regras:

- O fundo nunca é preto puro (`#111218`) — evita o efeito de "borrão" ao rolar em telas OLED. Só o player é preto.
- As cores de destaque ficam mais claras e menos saturadas (índigo `#A5A1FF`, verde-azulado `#5EEAD4`) para manter o contraste sem ofuscar.
- A linha atual usa uma tinta âmbar escura (`#3D3218`) com texto branco em negrito.

---

## 4. Espaçamento e grade

Grade de **4 px**. Valores usados:

| Token | Valor | Uso principal |
|---|---|---|
| `esp-1` | 4 | Ícone ↔ texto pequeno |
| `esp-2` | 8 | Entre cards; entre ícone e texto em botões |
| `esp-3` | 12 | Padding interno do card |
| `esp-4` | 16 | Margem lateral da letra e da lista |
| `esp-5` | 20 | Margem lateral dos títulos |
| `esp-6` | 24 | Padding lateral do painel de tradução |
| `esp-8` | 32 | Margem lateral dos estados vazio/erro; entre seções |
| `esp-12` | 48 | Respiros grandes |

**Áreas seguras:** respeitar a área segura do sistema no topo (notch / ilha dinâmica) e embaixo (barra de gestos). Nas telas de referência elas aparecem como 47 px no topo e 34 px embaixo (iPhone padrão). No React Native: `react-native-safe-area-context`.

---

## 5. Forma: raios, bordas e sombras

| Token | Valor | Uso |
|---|---|---|
| `raio-palavra` | 6 | Fundo da palavra/frase selecionada |
| `raio-miniatura` | 8 | Miniatura do vídeo no card |
| `raio-linha` | 12 | Fundo da linha atual; botão compacto |
| `raio-botao` | 14 | Botões de 52 px |
| `raio-card` | 16 | Cards de música |
| `raio-painel` | 24 | Cantos superiores do painel de tradução |
| pílula | metade da altura | Botões de ícone (44 → 22), botão flutuante |

- **Bordas:** 1 px na cor `borda`, em cards e divisores.
- **Sombras:** só em elementos que flutuam sobre o conteúdo:
  - Painel de tradução: `0 -10px 30px sombra`
  - Botão "Voltar à linha atual": `0 6px 18px sombra`
  - Cards **não** têm sombra (borda apenas), para manter a tela leve.

---

## 6. Ícones

- Estilo **linha (stroke)**, traço de 2 px, cantos arredondados, grade de 24 × 24.
- Biblioteca sugerida: **Lucide** (`lucide-react-native`) — os ícones das telas seguem o mesmo estilo.
- Tamanhos: 24 (barra), 22 (fechar, miniatura), 20 (avisos, seta do card), 18 (botões), 16 (dica).
- Ícones usados: voltar (`chevron-left`), avançar (`chevron-right`), fechar (`x`), música (`music`), sem conexão (`wifi-off`), alerta (`alert-circle`), informação (`info`), atualizar (`rotate-cw`), seta para baixo (`arrow-down`), concluído (`check`), vídeo indisponível (`video-off`), toque (`pointer`/`hand`).
- Ícone sozinho como botão sempre tem rótulo de acessibilidade (`accessibilityLabel`).
- Não usar emojis na interface.

---

## 7. Componentes (resumo de estilo)

| Componente | Especificação |
|---|---|
| **Botão primário** | Altura 52, raio 14, fundo `primaria`, texto `sobre-primaria` 16/20 700. Pressionado: `primaria-pressionada`. Desativado: fundo `superficie-2`, texto `texto-2`. No máximo um por tela. |
| **Botão secundário (tonal)** | Mesmas medidas, fundo `primaria-tinta`, texto `sobre-primaria-tinta`. |
| **Botão de texto** | Sem fundo, texto `primaria`. |
| **Botão de ícone** | 44 × 44, circular, sem fundo; fundo `superficie-2` ao pressionar. |
| **Botão flutuante** ("Voltar à linha atual") | Altura 44, pílula, fundo `primaria`, ícone + texto 15/20 700, sombra. Centralizado, 50 px acima da borda inferior. |
| **Card de música** | Altura mínima 64, padding 12, raio 16, fundo `superficie`, borda 1 px. Miniatura 96 × 54 (16:9), título 17/22 600, artista 15/20 500, seta à direita. Pressionado: fundo `primaria-tinta`. O card inteiro é tocável. |
| **Player** | Largura total, 16:9 (390 × 219 numa tela de 390). Nada sobreposto. Sem player carregado: fundo `superficie-2` com ícone e texto. |
| **Linha da letra** | Atkinson 20/30. Padding 1 × 6, raio 12, espaço de 6 px entre linhas. Cada palavra é um alvo de 44 px de altura (7 px acima e abaixo do texto). Padrão: `texto-2`, peso 400. Atual: fundo `destaque-tinta`, texto `texto`, peso 700. |
| **Palavra / frase selecionada** | Fundo `primaria-tinta`, texto `sobre-primaria-tinta`, peso 700, raio 6. A frase tem alças (barra de 2 px + círculo de 12 px em `primaria`) no início e no fim. |
| **Painel de tradução** | Sobe de baixo e ocupa só a área da letra. Altura mínima 232, raio 24 no topo, alça 36 × 4, padding 8/24/46. Rótulo `rotulo` em `secundaria`; palavra ou frase em Atkinson 700; divisor; tradução Atkinson 20/28 em `secundaria`. Sem véu escuro atrás. |
| **Faixa de aviso** | Logo abaixo do player, largura total, padding 12 × 16, ícone 20 + texto 14/20 600. Informação: `primaria-tinta`; erro: `erro-tinta`; sucesso: `sucesso-tinta`. |
| **Estado vazio / erro** | Centralizado, selo circular de 72 px com ícone 32, título 20/26 800, texto 15/22, botão largo. |
| **Esqueleto (carregando)** | Blocos arredondados na cor `esqueleto`, com o formato do conteúdo final. Pode pulsar de opacidade (1 → 0,6 → 1, 1,2 s). |

---

## 8. Movimento

| Elemento | Animação |
|---|---|
| Rolagem automática da letra | Desliza até a linha atual em ~300 ms, `ease-out`, mantendo-a a cerca de 1/3 da altura da área da letra. |
| Troca da linha atual | O fundo âmbar faz fade de ~150 ms (sem mudar o tamanho da linha). |
| Painel de tradução | Sobe em ~250 ms (`ease-out`) e desce em ~200 ms. Pode ser fechado arrastando para baixo. |
| Botão "Voltar à linha atual" | Fade + leve subida em ~200 ms. |
| Redução de movimento | Se o sistema pedir menos movimento (Reduce Motion / Remover animações), trocar deslizamentos por mudanças instantâneas ou fades curtos. |

---

## 9. Acessibilidade (checklist)

- [ ] Texto com contraste ≥ 4,5:1 (texto grande ≥ 3:1) nos dois modos.
- [ ] Alvos de toque ≥ 44 × 44 (iOS) / 48 dp recomendado (Android). Palavras curtas ("a", "I") devem ter a área ampliada com `hitSlop` ou direcionando o toque para a palavra mais próxima.
- [ ] A linha atual é marcada por três sinais: fundo, peso e cor do texto.
- [ ] Cada palavra tem rótulo "Traduzir <palavra>"; o conteúdo em inglês é marcado como idioma inglês para o leitor de tela pronunciar corretamente.
- [ ] O painel de tradução anuncia o resultado ao abrir (região "live"/`accessibilityLiveRegion`).
- [ ] Estados de erro usam papel de alerta; carregamentos informam "Carregando…".
- [ ] O botão voltar do Android fecha o painel antes de sair da tela de Música.
- [ ] As fontes acompanham o tamanho de texto do sistema.

---

## 10. Tokens para o React Native

```ts
// theme.ts
export const fontes = {
  ui: { regular: 'PlusJakartaSans_400Regular', medio: 'PlusJakartaSans_500Medium', semibold: 'PlusJakartaSans_600SemiBold', bold: 'PlusJakartaSans_700Bold', extrabold: 'PlusJakartaSans_800ExtraBold' },
  letra: { regular: 'AtkinsonHyperlegible_400Regular', bold: 'AtkinsonHyperlegible_700Bold' },
};

export const claro = {
  fundo: '#F6F6FA', superficie: '#FFFFFF', superficie2: '#EEEEF4', borda: '#DCDCE6',
  texto: '#1C1B2E', texto2: '#5C5B70',
  primaria: '#4F46E5', primariaPressionada: '#4338CA', sobrePrimaria: '#FFFFFF',
  primariaTinta: '#E7E5FF', sobrePrimariaTinta: '#3730A3',
  secundaria: '#0F766E', secundariaTinta: '#DDF3F0',
  destaque: '#F5B83D', destaqueTinta: '#FFEDB5', sobreDestaqueTinta: '#1C1B2E', destaqueTexto: '#8A6100',
  sucesso: '#15803D', sucessoTinta: '#DCF5E5',
  erro: '#B42318', erroTinta: '#FDE4E1',
  esqueleto: '#E4E4EC', sombra: 'rgba(28,27,46,0.14)', playerFundo: '#000000',
};

export const escuro: typeof claro = {
  fundo: '#111218', superficie: '#1B1C25', superficie2: '#252633', borda: '#33344A',
  texto: '#EDEDF3', texto2: '#A6A7B8',
  primaria: '#A5A1FF', primariaPressionada: '#8F8AFF', sobrePrimaria: '#111218',
  primariaTinta: '#2E2B5C', sobrePrimariaTinta: '#C7C4FF',
  secundaria: '#5EEAD4', secundariaTinta: '#123B37',
  destaque: '#F5B83D', destaqueTinta: '#3D3218', sobreDestaqueTinta: '#FFFFFF', destaqueTexto: '#F5B83D',
  sucesso: '#4ADE80', sucessoTinta: '#12321F',
  erro: '#FF8A7A', erroTinta: '#3A1C1A',
  esqueleto: '#2A2B38', sombra: 'rgba(0,0,0,0.55)', playerFundo: '#000000',
};

export const espaco = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 };
export const raio = { palavra: 6, miniatura: 8, linha: 12, botao: 14, card: 16, painel: 24 };
export const toqueMinimo = 44;
```
