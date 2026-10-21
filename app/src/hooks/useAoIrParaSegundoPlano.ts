import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Chama `aoIr` quando o app vai para segundo plano (o vídeo não pode tocar em segundo plano). */
export function useAoIrParaSegundoPlano(aoIr: () => void) {
  const callback = useRef(aoIr);
  useEffect(() => {
    callback.current = aoIr;
  }, [aoIr]);

  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') callback.current();
    });
    return () => assinatura.remove();
  }, []);
}
