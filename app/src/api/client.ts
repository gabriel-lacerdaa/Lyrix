const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

/** `rede`: a API não respondeu; `nao_encontrado`: 404; `servidor`: qualquer outra resposta de erro. */
export type TipoErroApi = 'rede' | 'nao_encontrado' | 'servidor';

export class ErroApi extends Error {
  constructor(
    readonly tipo: TipoErroApi,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ErroApi';
  }
}

export function ehNaoEncontrado(erro: unknown): boolean {
  return erro instanceof ErroApi && erro.tipo === 'nao_encontrado';
}

export function getJson<T>(caminho: string, signal?: AbortSignal): Promise<T> {
  return requisitar<T>(caminho, { headers: { Accept: 'application/json' }, signal });
}

export function postJson<T>(caminho: string, corpo: unknown, signal?: AbortSignal): Promise<T> {
  return requisitar<T>(caminho, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
    signal,
  });
}

async function requisitar<T>(caminho: string, opcoes: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const { signal } = opcoes;
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, opcoes);
  } catch (erro) {
    if (signal?.aborted) throw erro;
    throw new ErroApi('rede', `Não foi possível acessar a API em ${API_URL}.`);
  }
  if (resposta.status === 404) throw new ErroApi('nao_encontrado', 'Não encontrado.', 404);
  if (!resposta.ok) throw new ErroApi('servidor', `A API respondeu ${resposta.status}.`, resposta.status);
  return (await resposta.json()) as T;
}
