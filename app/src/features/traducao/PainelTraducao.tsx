import { AlertCircle, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { TipoTrecho } from '@/api/translate';
import { Botao } from '@/components/Botao';
import { BotaoIcone } from '@/components/BotaoIcone';
import { Esqueleto } from '@/components/Esqueleto';
import { tipografia } from '@/theme/tipografia';
import { raio } from '@/theme/tokens';
import { useCores } from '@/theme/useCores';

import { useTraducao } from './useTraducao';

export type Pedido = { tipo: TipoTrecho; texto: string };

const ALTURA_MINIMA = 232;
const DURACAO_ABRIR_MS = 250;
const DURACAO_FECHAR_MS = 200;
// Arrastar mais que isso para baixo (ou rápido) fecha o painel.
const DISTANCIA_PARA_FECHAR = 80;
const VELOCIDADE_PARA_FECHAR = 800;

type Props = {
  /** null = painel fechado. Trocar o pedido com o painel aberto só troca o conteúdo. */
  pedido: Pedido | null;
  onFechar: () => void;
  /** Altura ocupada pelo painel (0 quando fechado), para a letra rolar a linha estudada para cima dele. */
  onAltura: (altura: number) => void;
  margemInferior: number;
};

/** Painel de tradução (F4/F5): sobe de baixo, ocupa só a área da letra e não tem véu escuro. */
export function PainelTraducao({ pedido, onFechar, onAltura, margemInferior }: Props) {
  const cores = useCores();
  const reduzirMovimento = useReducedMotion();
  // Mantém o último conteúdo durante a animação de saída.
  const [exibido, setExibido] = useState<Pedido | null>(pedido);
  const [altura, setAltura] = useState(ALTURA_MINIMA + margemInferior);
  const deslocamento = useSharedValue(ALTURA_MINIMA + margemInferior);
  const arrasto = useSharedValue(0);

  // Ajuste durante o render: um novo pedido aparece na hora (e troca o conteúdo se já estiver aberto).
  if (pedido && pedido !== exibido) setExibido(pedido);

  const aberto = pedido !== null;
  useEffect(() => {
    if (aberto) {
      deslocamento.set(withTiming(0, { duration: reduzirMovimento ? 0 : DURACAO_ABRIR_MS, easing: Easing.out(Easing.cubic) }));
      return;
    }
    onAltura(0);
    const duracao = reduzirMovimento ? 0 : DURACAO_FECHAR_MS;
    deslocamento.set(withTiming(altura, { duration: duracao, easing: Easing.in(Easing.cubic) }));
    // Mantém o último conteúdo durante a animação de saída.
    const timer = setTimeout(() => {
      setExibido(null);
      arrasto.set(0);
    }, duracao);
    return () => clearTimeout(timer);
    // Só reage a abrir/fechar; a altura é lida no momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, reduzirMovimento]);

  const fecharArrastando = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY(10)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      arrasto.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > DISTANCIA_PARA_FECHAR || e.velocityY > VELOCIDADE_PARA_FECHAR) {
        onFechar();
      } else {
        arrasto.set(withTiming(0, { duration: DURACAO_FECHAR_MS }));
      }
    });

  const animado = useAnimatedStyle(() => ({ transform: [{ translateY: deslocamento.get() + arrasto.get() }] }));

  if (!exibido) return null;

  const aoMedir = (e: LayoutChangeEvent) => {
    const nova = e.nativeEvent.layout.height;
    setAltura(nova);
    if (pedido) onAltura(nova);
  };

  const ehPalavra = exibido.tipo === 'palavra';

  return (
    <GestureDetector gesture={fecharArrastando}>
      <Animated.View
        onLayout={aoMedir}
        accessibilityLabel="Tradução"
        style={[
          estilos.painel,
          {
            paddingBottom: 12 + margemInferior,
            backgroundColor: cores.superficie,
            borderTopColor: cores.borda,
            boxShadow: `0 -10px 30px ${cores.sombra}`,
          },
          animado,
        ]}
      >
        <View style={[estilos.alca, { backgroundColor: cores.borda }]} />
        <View style={estilos.topo}>
          <Text style={[tipografia.rotulo, { color: cores.secundaria }]}>{ehPalavra ? 'Palavra' : 'Frase'}</Text>
          <BotaoIcone rotulo="Fechar tradução" onPress={onFechar} style={estilos.fechar}>
            <X size={22} color={cores.texto2} strokeWidth={2} />
          </BotaoIcone>
        </View>
        <Text
          accessibilityLanguage="en-US"
          style={[ehPalavra ? tipografia.painelPalavra : tipografia.painelFrase, { color: cores.texto }]}
        >
          {ehPalavra ? exibido.texto : `“${exibido.texto}”`}
        </Text>
        <View style={[estilos.divisor, { backgroundColor: cores.borda }]} />
        <ResultadoTraducao pedido={exibido} />
      </Animated.View>
    </GestureDetector>
  );
}

function ResultadoTraducao({ pedido }: { pedido: Pedido }) {
  const cores = useCores();
  const { data, isPending, isError, refetch } = useTraducao(pedido.texto, pedido.tipo);

  if (isPending) {
    return (
      <View style={estilos.carregando} accessible accessibilityLabel="Traduzindo">
        <Esqueleto largura="62%" altura={18} />
        <Text style={[tipografia.legenda, { color: cores.texto2 }]}>Traduzindo…</Text>
      </View>
    );
  }
  if (isError) {
    return (
      <View style={estilos.erro} accessibilityRole="alert" accessibilityLiveRegion="assertive">
        <AlertCircle size={22} color={cores.erro} strokeWidth={2} />
        <Text style={[tipografia.aviso, estilos.erroTexto, { color: cores.erro, fontSize: 15 }]}>
          Não foi possível traduzir agora.
        </Text>
        <Botao titulo="Tentar de novo" variante="secundario" compacto onPress={() => void refetch()} />
      </View>
    );
  }
  return (
    <Text style={[tipografia.traducao, { color: cores.secundaria }]} accessibilityLiveRegion="polite">
      {data.traducao}
    </Text>
  );
}

const estilos = StyleSheet.create({
  painel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: ALTURA_MINIMA,
    paddingTop: 8,
    paddingHorizontal: 24,
    borderTopLeftRadius: raio.painel,
    borderTopRightRadius: raio.painel,
    borderTopWidth: 1,
  },
  alca: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2 },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  fechar: { marginRight: -10 },
  divisor: { height: 1, marginVertical: 14 },
  carregando: { gap: 10 },
  erro: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  erroTexto: { flex: 1 },
});
