import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { tipografia } from '@/theme/tipografia';
import { toqueMinimo } from '@/theme/tokens';
import { useCores } from '@/theme/useCores';

const DURACAO_MS = 200;

type Props = {
  direcao: 'cima' | 'baixo';
  distanciaDoFundo: number;
  onPress: () => void;
};

/** Botão flutuante da rolagem manual (tela 08): fade + leve subida ao aparecer. */
export function BotaoVoltarLinha({ direcao, distanciaDoFundo, onPress }: Props) {
  const cores = useCores();
  const reduzirMovimento = useReducedMotion();
  const entrada = useSharedValue(0);

  useEffect(() => {
    entrada.set(withTiming(1, { duration: reduzirMovimento ? 0 : DURACAO_MS }));
  }, [entrada, reduzirMovimento]);

  const animado = useAnimatedStyle(() => ({
    opacity: entrada.get(),
    transform: [{ translateY: (1 - entrada.get()) * 8 }],
  }));

  const Seta = direcao === 'cima' ? ArrowUp : ArrowDown;

  return (
    <Animated.View style={[estilos.posicao, { bottom: distanciaDoFundo }, animado]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          estilos.botao,
          {
            backgroundColor: pressed ? cores.primariaPressionada : cores.primaria,
            boxShadow: `0 6px 18px ${cores.sombra}`,
          },
        ]}
      >
        <Seta size={18} color={cores.sobrePrimaria} strokeWidth={2} />
        <Text style={[tipografia.botaoCompacto, { color: cores.sobrePrimaria }]}>Voltar à linha atual</Text>
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  posicao: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  botao: {
    height: toqueMinimo,
    borderRadius: toqueMinimo / 2,
    paddingLeft: 14,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
