import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** true só quando o aparelho sabe que está sem rede (enquanto verifica, os valores são null). */
export function useSemConexao(): boolean {
  const { isConnected, isInternetReachable } = useNetInfo();
  return isConnected === false || isInternetReachable === false;
}

export type FaixaConexao = 'nenhuma' | 'perdida' | 'restabelecida';

const TEMPO_RESTABELECIDA_MS = 3000;

/** Faixa da tela 13: vermelha enquanto está sem rede, verde por ~3 s quando a rede volta. */
export function useFaixaConexao(): FaixaConexao {
  const semConexao = useSemConexao();
  const [estavaSemConexao, setEstavaSemConexao] = useState(semConexao);
  const [restabelecida, setRestabelecida] = useState(false);

  // Ajuste durante o render: a faixa verde aparece só na passagem de "sem rede" para "com rede".
  if (semConexao !== estavaSemConexao) {
    setEstavaSemConexao(semConexao);
    setRestabelecida(!semConexao);
  }

  useEffect(() => {
    if (!restabelecida) return;
    const timer = setTimeout(() => setRestabelecida(false), TEMPO_RESTABELECIDA_MS);
    return () => clearTimeout(timer);
  }, [restabelecida]);

  if (semConexao) return 'perdida';
  return restabelecida ? 'restabelecida' : 'nenhuma';
}
