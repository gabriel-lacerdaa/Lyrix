import { useQuery } from '@tanstack/react-query';

import { traduzir, type TipoTrecho } from '@/api/translate';
import { normalizarConsulta } from '@/features/letra/tokenizar';

/** Tradução de um trecho, com cache em memória por trecho (nunca por música). */
export function useTraducao(texto: string, tipo: TipoTrecho) {
  return useQuery({
    queryKey: ['traducao', tipo, normalizarConsulta(texto)],
    queryFn: ({ signal }) => traduzir(texto, tipo, signal),
    enabled: texto !== '',
    staleTime: Infinity,
    retry: false,
  });
}
