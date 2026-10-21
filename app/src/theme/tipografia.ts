import type { TextStyle } from 'react-native';

import { fontes } from './tokens';

// Escala tipográfica do guia (seção 2). O peso vem da família da fonte, por isso não há fontWeight.
export const tipografia = {
  tituloTela: { fontFamily: fontes.ui.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.28 },
  tituloMensagem: { fontFamily: fontes.ui.extrabold, fontSize: 20, lineHeight: 26 },
  tituloBarra: { fontFamily: fontes.ui.bold, fontSize: 17, lineHeight: 22 },
  cardTitulo: { fontFamily: fontes.ui.semibold, fontSize: 17, lineHeight: 22 },
  corpo: { fontFamily: fontes.ui.regular, fontSize: 16, lineHeight: 24 },
  secundario: { fontFamily: fontes.ui.medio, fontSize: 15, lineHeight: 20 },
  mensagemTexto: { fontFamily: fontes.ui.regular, fontSize: 15, lineHeight: 22 },
  aviso: { fontFamily: fontes.ui.semibold, fontSize: 14, lineHeight: 20 },
  legenda: { fontFamily: fontes.ui.medio, fontSize: 13, lineHeight: 18 },
  legendaForte: { fontFamily: fontes.ui.semibold, fontSize: 13, lineHeight: 18 },
  rotulo: { fontFamily: fontes.ui.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.96, textTransform: 'uppercase' },
  botao: { fontFamily: fontes.ui.bold, fontSize: 16, lineHeight: 20 },
  botaoCompacto: { fontFamily: fontes.ui.bold, fontSize: 15, lineHeight: 20 },
  letra: { fontFamily: fontes.letra.regular, fontSize: 20, lineHeight: 30 },
  letraAtual: { fontFamily: fontes.letra.bold, fontSize: 20, lineHeight: 30 },
  painelPalavra: { fontFamily: fontes.letra.bold, fontSize: 28, lineHeight: 34 },
  painelFrase: { fontFamily: fontes.letra.bold, fontSize: 22, lineHeight: 30 },
  traducao: { fontFamily: fontes.letra.regular, fontSize: 20, lineHeight: 28 },
} satisfies Record<string, TextStyle>;

// Limite de escala do texto da letra, para o layout não quebrar com fontes grandes do sistema.
export const ESCALA_MAXIMA_LETRA = 1.6;
