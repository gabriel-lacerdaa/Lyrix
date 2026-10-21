import { tokenizar } from '@/features/letra/tokenizar';
import {
  faixaNaLinha,
  linhasPermitidas,
  moverAlca,
  palavraMaisProxima,
  selecaoDeLinha,
  textoDaSelecao,
  type Retangulo,
} from '@/features/traducao/selecao';

const linhas = [
  "we're running out of time tonight",
  'but I don’t mind,',
  '',
  'so let it go',
].map(tokenizar);

describe('seleção de frase', () => {
  it('segurar a linha seleciona a linha inteira', () => {
    const selecao = selecaoDeLinha(0, linhas[0].length);
    expect(textoDaSelecao(selecao, linhas)).toBe("we're running out of time tonight");
  });

  it('as alças encurtam a seleção', () => {
    let selecao = selecaoDeLinha(0, linhas[0].length);
    selecao = moverAlca(selecao, 'inicio', { linha: 0, palavra: 1 });
    selecao = moverAlca(selecao, 'fim', { linha: 0, palavra: 4 });
    expect(textoDaSelecao(selecao, linhas)).toBe('running out of time');
  });

  it('o início não passa do fim', () => {
    const selecao = moverAlca(selecaoDeLinha(0, 6), 'inicio', { linha: 1, palavra: 2 });
    expect(selecao.inicio).toEqual(selecao.fim);
  });

  it('permite no máximo 2 linhas consecutivas e ignora linhas instrumentais', () => {
    const selecao = selecaoDeLinha(1, linhas[1].length);
    expect(linhasPermitidas(selecao, 'fim', linhas)).toEqual([1]);
    expect(linhasPermitidas(selecao, 'inicio', linhas)).toEqual([0, 1]);
  });

  it('frase em 2 linhas junta as palavras e tira a pontuação das pontas', () => {
    let selecao = selecaoDeLinha(0, linhas[0].length);
    selecao = moverAlca(selecao, 'inicio', { linha: 0, palavra: 4 });
    selecao = moverAlca(selecao, 'fim', { linha: 1, palavra: 3 });
    expect(textoDaSelecao(selecao, linhas)).toBe('time tonight but I don’t mind');
    expect(faixaNaLinha(selecao, 0, 6)).toEqual([4, 5]);
    expect(faixaNaLinha(selecao, 1, 4)).toEqual([0, 3]);
    expect(faixaNaLinha(selecao, 3, 4)).toBeNull();
  });
});

describe('palavraMaisProxima', () => {
  const r = (x: number, y: number): Retangulo => ({ x, y, largura: 40, altura: 44 });
  const retangulos = [
    [r(0, 0), r(50, 0), r(100, 0)],
    [r(0, 50), r(50, 50)],
  ];

  it('acha a palavra sob o dedo', () => {
    expect(palavraMaisProxima(retangulos, [0, 1], { x: 60, y: 10 })).toEqual({ linha: 0, palavra: 1 });
    expect(palavraMaisProxima(retangulos, [0, 1], { x: 10, y: 70 })).toEqual({ linha: 1, palavra: 0 });
  });

  it('fica só nas linhas permitidas', () => {
    expect(palavraMaisProxima(retangulos, [0], { x: 10, y: 300 })).toEqual({ linha: 0, palavra: 0 });
  });
});
