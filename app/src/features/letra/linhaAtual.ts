import type { LyricLine } from '@/api/types';

// Ajuste de latência do áudio (fones Bluetooth) ainda não entra no MVP.
export const LATENCIA_DO_AUDIO_MS = 0;

/** Busca binária: índice da última linha com `start_ms ≤ tempoDaLetraMs`, ou -1 antes da primeira linha. */
export function indiceDaLinha(linhas: readonly LyricLine[], tempoDaLetraMs: number): number {
  let inicio = 0;
  let fim = linhas.length - 1;
  let resultado = -1;
  while (inicio <= fim) {
    const meio = (inicio + fim) >> 1;
    if (linhas[meio].start_ms <= tempoDaLetraMs) {
      resultado = meio;
      inicio = meio + 1;
    } else {
      fim = meio - 1;
    }
  }
  return resultado;
}

/** `tempoDaLetra = tempoDoVídeo − offset_ms − latênciaDoÁudio`. */
export function tempoDaLetra(tempoDoVideoMs: number, offsetMs: number): number {
  return tempoDoVideoMs - offsetMs - LATENCIA_DO_AUDIO_MS;
}

/** A linha só é destacada se tiver texto: linhas vazias são trechos instrumentais. */
export function ehLinhaComTexto(linhas: readonly LyricLine[], indice: number): boolean {
  return indice >= 0 && indice < linhas.length && linhas[indice].text.trim() !== '';
}
