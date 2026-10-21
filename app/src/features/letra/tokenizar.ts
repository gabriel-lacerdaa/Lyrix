export type Palavra = {
  /** Como aparece na letra, com a pontuação (ex.: "mind,"). */
  exibida: string;
  /** Sem a pontuação das pontas, com a caixa original (ex.: "I'll"). Vazio se não houver letras. */
  limpa: string;
};

// Letras (inclusive acentuadas) e dígitos. A pontuação no meio, como em "we're", é mantida.
const PONTAS = /^[^A-Za-z0-9À-ɏ]+|[^A-Za-z0-9À-ɏ]+$/g;

export function limparPontas(texto: string): string {
  return texto.replace(PONTAS, '');
}

export function tokenizar(texto: string): Palavra[] {
  return texto
    .split(/\s+/)
    .filter(Boolean)
    .map((exibida) => ({ exibida, limpa: limparPontas(exibida) }));
}

/** Chave da consulta de tradução e do rótulo de acessibilidade ("Traduzir we're"). */
export function chaveDaPalavra(palavra: Palavra): string {
  return normalizarConsulta(palavra.limpa);
}

/** Minúsculas e apóstrofo reto, para "We’re" e "we're" serem o mesmo trecho no cache. */
export function normalizarConsulta(texto: string): string {
  return texto.replace(/[‘’]/g, "'").toLowerCase();
}
