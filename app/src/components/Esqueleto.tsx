import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useCores } from '@/theme/useCores';

type Props = {
  largura?: DimensionValue;
  altura?: DimensionValue;
  style?: StyleProp<ViewStyle>;
};

/** Bloco de carregamento: pulsa a opacidade 1 → 0,6 → 1 em 1,2 s (parado se o sistema pedir menos movimento). */
export function Esqueleto({ largura, altura, style }: Props) {
  const cores = useCores();
  const reduzirMovimento = useReducedMotion();
  const opacidade = useSharedValue(1);

  useEffect(() => {
    if (reduzirMovimento) return;
    opacidade.set(withRepeat(withSequence(withTiming(0.6, { duration: 600 }), withTiming(1, { duration: 600 })), -1));
    return () => cancelAnimation(opacidade);
  }, [reduzirMovimento, opacidade]);

  const animado = useAnimatedStyle(() => ({ opacity: opacidade.get() }));

  return (
    <Animated.View
      style={[{ width: largura, height: altura, borderRadius: 9, backgroundColor: cores.esqueleto }, style, animado]}
    />
  );
}
