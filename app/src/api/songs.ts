import { useQuery } from '@tanstack/react-query';

import { ehNaoEncontrado, getJson } from './client';
import type { SongDetail, SongSummary } from './types';

/** Acervo publicado. A API já devolve em ordem A–Z por título. */
export function useMusicas() {
  return useQuery({
    queryKey: ['musicas'],
    queryFn: ({ signal }) => getJson<SongSummary[]>('/songs', signal),
  });
}

export function useMusica(id: string) {
  return useQuery({
    queryKey: ['musica', id],
    queryFn: ({ signal }) => getJson<SongDetail>(`/songs/${encodeURIComponent(id)}`, signal),
    // 404 = música tirada do ar: não adianta tentar de novo.
    retry: (tentativas, erro) => !ehNaoEncontrado(erro) && tentativas < 1,
  });
}
