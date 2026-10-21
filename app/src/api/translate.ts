import { postJson } from './client';

export type TipoTrecho = 'palavra' | 'frase';

export type Traducao = {
  texto: string;
  traducao: string;
};

type RespostaTraducao = { text: string; kind: 'word' | 'phrase'; translation: string; cached: boolean };

const TIPO_NA_API = { palavra: 'word', frase: 'phrase' } as const;

/**
 * Traduz só o trecho pedido (uma palavra ou uma frase curta), do inglês para o português,
 * pela rota `POST /translate` do backend (Azure Translator, com cache por trecho).
 */
export async function traduzir(texto: string, tipo: TipoTrecho, signal?: AbortSignal): Promise<Traducao> {
  const resposta = await postJson<RespostaTraducao>('/translate', { text: texto, kind: TIPO_NA_API[tipo] }, signal);
  return { texto, traducao: resposta.translation };
}
