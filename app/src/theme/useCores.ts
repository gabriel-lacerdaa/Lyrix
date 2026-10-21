import { useColorScheme } from 'react-native';

import { claro, escuro, type Cores } from './tokens';

/** Cores do tema atual. O modo escuro segue a configuração do sistema (não há opção no app). */
export function useCores(): Cores {
  return useColorScheme() === 'dark' ? escuro : claro;
}
