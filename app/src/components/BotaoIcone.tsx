import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { toqueMinimo } from '@/theme/tokens';
import { useCores } from '@/theme/useCores';

type Props = {
  /** Obrigatório: o botão só tem ícone. */
  rotulo: string;
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function BotaoIcone({ rotulo, onPress, children, style }: Props) {
  const cores = useCores();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={onPress}
      style={({ pressed }) => [estilos.botao, pressed && { backgroundColor: cores.superficie2 }, style]}
    >
      {children}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    width: toqueMinimo,
    height: toqueMinimo,
    borderRadius: toqueMinimo / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
