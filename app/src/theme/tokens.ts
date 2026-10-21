// Tokens do Guia de Identidade Visual (design/Guia-de-Identidade-Visual.md, seção 10).
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

export type Cores = typeof claro;

export const espaco = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 };
export const raio = { palavra: 6, miniatura: 8, linha: 12, botao: 14, card: 16, painel: 24 };
export const toqueMinimo = 44;

// Cores fixas do player, iguais nos dois modos (design/telas/estilos.css: .player-*).
export const corPlayer = { anel: '#2A2A36', anelAtivo: '#A5A1FF', rotulo: '#C9C9D6' };
