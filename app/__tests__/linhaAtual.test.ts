import type { LyricLine } from '@/api/types';
import { ehLinhaComTexto, indiceDaLinha, tempoDaLetra } from '@/features/letra/linhaAtual';

const linhas: LyricLine[] = [
  { line_index: 0, start_ms: 1000, text: 'first' },
  { line_index: 1, start_ms: 3000, text: 'second' },
  { line_index: 2, start_ms: 5000, text: '' },
  { line_index: 3, start_ms: 9000, text: 'chorus' },
];

describe('indiceDaLinha', () => {
  it('devolve -1 antes da primeira linha', () => {
    expect(indiceDaLinha(linhas, 0)).toBe(-1);
    expect(indiceDaLinha(linhas, 999)).toBe(-1);
  });

  it('escolhe a última linha com início ≤ tempo', () => {
    expect(indiceDaLinha(linhas, 1000)).toBe(0);
    expect(indiceDaLinha(linhas, 2999)).toBe(0);
    expect(indiceDaLinha(linhas, 3000)).toBe(1);
    expect(indiceDaLinha(linhas, 6000)).toBe(2);
    expect(indiceDaLinha(linhas, 999_999)).toBe(3);
  });

  it('trata seek para trás e para frente sem depender do estado anterior', () => {
    expect(indiceDaLinha(linhas, 9500)).toBe(3);
    expect(indiceDaLinha(linhas, 1500)).toBe(0);
  });

  it('funciona com letra vazia', () => {
    expect(indiceDaLinha([], 5000)).toBe(-1);
  });
});

describe('tempoDaLetra', () => {
  it('desconta o offset do vídeo (clipe com introdução mais longa)', () => {
    expect(tempoDaLetra(6200, 5200)).toBe(1000);
    expect(indiceDaLinha(linhas, tempoDaLetra(6200, 5200))).toBe(0);
  });
});

describe('ehLinhaComTexto', () => {
  it('linhas vazias são instrumentais e não ganham destaque', () => {
    expect(ehLinhaComTexto(linhas, 1)).toBe(true);
    expect(ehLinhaComTexto(linhas, 2)).toBe(false);
    expect(ehLinhaComTexto(linhas, -1)).toBe(false);
  });
});
