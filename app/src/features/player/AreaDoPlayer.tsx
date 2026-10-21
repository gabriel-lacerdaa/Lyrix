import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { tipografia } from '@/theme/tipografia';
import { corPlayer } from '@/theme/tokens';
import { useCores } from '@/theme/useCores';

const ALTURA_MINIMA = 200;

/** Largura total, 16:9, nunca abaixo do mínimo de 200 px exigido pelo YouTube. */
export function alturaDoPlayer(largura: number): number {
  return Math.max(ALTURA_MINIMA, Math.round((largura * 9) / 16));
}

/** Área do player em preto com "Carregando vídeo…" (tela 09). Some quando o player fica pronto. */
export function PlayerCarregando({ altura }: { altura: number }) {
  const cores = useCores();
  return (
    <View
      style={[estilos.centro, { height: altura, backgroundColor: cores.playerFundo }]}
      accessible
      accessibilityLabel="Carregando vídeo"
    >
      <Anel />
      <Text style={[tipografia.legendaForte, { color: corPlayer.rotulo }]}>Carregando vídeo…</Text>
    </View>
  );
}

function Anel() {
  const reduzirMovimento = useReducedMotion();
  const giro = useSharedValue(0);
  useEffect(() => {
    if (reduzirMovimento) return;
    giro.set(withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1));
    return () => cancelAnimation(giro);
  }, [reduzirMovimento, giro]);
  const animado = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.get()}deg` }] }));

  return (
    <Animated.View style={animado}>
      <Svg width={36} height={36} viewBox="0 0 36 36">
        <Circle cx={18} cy={18} r={15} stroke={corPlayer.anel} strokeWidth={4} fill="none" />
        <Path d="M18 3a15 15 0 0 1 15 15" stroke={corPlayer.anelAtivo} strokeWidth={4} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

/** Bloco neutro no lugar do player quando ele não é carregado (telas 11 e 12). */
export function PlayerBloqueado({ altura, Icone, texto }: { altura: number; Icone: LucideIcon; texto: string }) {
  const cores = useCores();
  return (
    <View style={[estilos.centro, { height: altura, backgroundColor: cores.superficie2 }]}>
      <Icone size={36} color={cores.texto2} strokeWidth={2} />
      <Text style={[tipografia.legendaForte, { color: cores.texto2 }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center', gap: 10 },
});
