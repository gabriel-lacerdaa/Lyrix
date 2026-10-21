import { limparPontas, type Palavra } from '@/features/letra/tokenizar';

export type Posicao = { linha: number; palavra: number };

export type Selecao = {
  tipo: 'palavra' | 'frase';
  inicio: Posicao;
  fim: Posicao;
};

export type Alca = 'inicio' | 'fim';

export type Retangulo = { x: number; y: number; largura: number; altura: number };

// Frase curta: no máximo 2 linhas consecutivas (Design-das-Telas.md, seção 3).
export const MAXIMO_DE_LINHAS = 2;

export function comparar(a: Posicao, b: Posicao): number {
  return a.linha - b.linha || a.palavra - b.palavra;
}

export function selecaoDePalavra(linha: number, palavra: number): Selecao {
  return { tipo: 'palavra', inicio: { linha, palavra }, fim: { linha, palavra } };
}

export function selecaoDeLinha(linha: number, totalDePalavras: number): Selecao {
  return { tipo: 'frase', inicio: { linha, palavra: 0 }, fim: { linha, palavra: totalDePalavras - 1 } };
}

/** Linhas para onde a alça pode ir: a linha da outra alça e a vizinha, se tiver palavras. */
export function linhasPermitidas(selecao: Selecao, alca: Alca, linhas: readonly Palavra[][]): number[] {
  const fixa = alca === 'inicio' ? selecao.fim.linha : selecao.inicio.linha;
  const vizinha = alca === 'inicio' ? fixa - (MAXIMO_DE_LINHAS - 1) : fixa + (MAXIMO_DE_LINHAS - 1);
  const candidatas = alca === 'inicio' ? [vizinha, fixa] : [fixa, vizinha];
  return candidatas.filter((linha) => (linhas[linha]?.length ?? 0) > 0);
}

/** Move uma alça sem deixar o início passar do fim. */
export function moverAlca(selecao: Selecao, alca: Alca, alvo: Posicao): Selecao {
  if (alca === 'inicio') {
    return { ...selecao, inicio: comparar(alvo, selecao.fim) > 0 ? selecao.fim : alvo };
  }
  return { ...selecao, fim: comparar(alvo, selecao.inicio) < 0 ? selecao.inicio : alvo };
}

/** Palavra mais próxima do ponto, só entre as linhas permitidas. */
export function palavraMaisProxima(
  retangulos: readonly (readonly (Retangulo | undefined)[] | undefined)[],
  permitidas: readonly number[],
  ponto: { x: number; y: number },
): Posicao | null {
  let melhor: Posicao | null = null;
  let menorDistancia = Infinity;
  for (const linha of permitidas) {
    retangulos[linha]?.forEach((r, palavra) => {
      if (!r) return;
      const dx = Math.max(r.x - ponto.x, 0, ponto.x - (r.x + r.largura));
      const dy = Math.max(r.y - ponto.y, 0, ponto.y - (r.y + r.altura));
      // A distância vertical pesa mais, para não pular de linha sem querer.
      const distancia = dx * dx + 4 * dy * dy;
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        melhor = { linha, palavra };
      }
    });
  }
  return melhor;
}

/** Faixa [primeira, última] de palavras selecionadas dentro de uma linha, ou null. */
export function faixaNaLinha(selecao: Selecao | null, linha: number, totalDePalavras: number): [number, number] | null {
  if (!selecao || linha < selecao.inicio.linha || linha > selecao.fim.linha || totalDePalavras === 0) return null;
  const primeira = linha === selecao.inicio.linha ? selecao.inicio.palavra : 0;
  const ultima = linha === selecao.fim.linha ? selecao.fim.palavra : totalDePalavras - 1;
  return [primeira, ultima];
}

/** Texto selecionado, sem a pontuação das pontas ("running out of time"). */
export function textoDaSelecao(selecao: Selecao, linhas: readonly Palavra[][]): string {
  const partes: string[] = [];
  for (let linha = selecao.inicio.linha; linha <= selecao.fim.linha; linha++) {
    const faixa = faixaNaLinha(selecao, linha, linhas[linha]?.length ?? 0);
    if (!faixa) continue;
    for (let i = faixa[0]; i <= faixa[1]; i++) partes.push(linhas[linha][i].exibida);
  }
  return limparPontas(partes.join(' '));
}
