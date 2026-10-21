import { chaveDaPalavra, tokenizar } from '@/features/letra/tokenizar';

describe('tokenizar', () => {
  it('separa por espaços e mantém a pontuação na exibição', () => {
    expect(tokenizar('but I don’t mind,  I’ll hold on').map((p) => p.exibida)).toEqual([
      'but', 'I', 'don’t', 'mind,', 'I’ll', 'hold', 'on',
    ]);
  });

  it('limpa só as pontas e mantém as contrações', () => {
    const [a, b, c, d] = tokenizar('"Hello," (do I) we’re');
    expect(a.limpa).toBe('Hello');
    expect(b.limpa).toBe('do');
    expect(c.limpa).toBe('I');
    expect(d.limpa).toBe('we’re');
    expect(chaveDaPalavra(d)).toBe("we're");
    expect(chaveDaPalavra(c)).toBe('i');
  });

  it('palavras sem letras ficam com limpa vazia', () => {
    expect(tokenizar('oh — yeah')[1].limpa).toBe('');
  });

  it('linha vazia não tem palavras', () => {
    expect(tokenizar('   ')).toEqual([]);
  });
});
