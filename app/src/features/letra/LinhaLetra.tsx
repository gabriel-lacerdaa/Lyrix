import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ESCALA_MAXIMA_LETRA, tipografia } from '@/theme/tipografia';
import { raio, toqueMinimo } from '@/theme/tokens';
import { useCores } from '@/theme/useCores';

import { chaveDaPalavra, type Palavra } from './tokenizar';

// Toque longo (~450 ms) numa linha seleciona a frase (Design-das-Telas.md, seção 3).
export const DURACAO_TOQUE_LONGO_MS = 450;
const FADE_DESTAQUE_MS = 150;
// Texto de 30 px num alvo de 44 px: 7 px acima e abaixo.
const RESPIRO_VERTICAL = (toqueMinimo - tipografia.letra.lineHeight) / 2;

type Props = {
  indice: number;
  palavras: Palavra[];
  atual: boolean;
  /** Palavras selecionadas nesta linha (-1 = nenhuma). */
  selecaoInicio: number;
  selecaoFim: number;
  onTocarPalavra: (linha: number, palavra: number) => void;
  onSegurarLinha: (linha: number) => void;
  onLayoutLinha: (linha: number, evento: LayoutChangeEvent) => void;
  onLayoutPalavra: (linha: number, palavra: number, evento: LayoutChangeEvent) => void;
};

export const LinhaLetra = memo(function LinhaLetra({
  indice,
  palavras,
  atual,
  selecaoInicio,
  selecaoFim,
  onTocarPalavra,
  onSegurarLinha,
  onLayoutLinha,
  onLayoutPalavra,
}: Props) {
  const cores = useCores();
  const reduzirMovimento = useReducedMotion();
  const destaque = useSharedValue(atual ? 1 : 0);

  useEffect(() => {
    destaque.set(withTiming(atual ? 1 : 0, { duration: reduzirMovimento ? 0 : FADE_DESTAQUE_MS }));
  }, [atual, reduzirMovimento, destaque]);

  // As cores são calculadas aqui: o estilo animado roda na thread de UI e não pode chamar funções JS comuns.
  const corDestaque = cores.destaqueTinta;
  const corSemDestaque = transparente(corDestaque);
  const fundo = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(destaque.get(), [0, 1], [corSemDestaque, corDestaque]),
  }));

  return (
    <Animated.View style={[estilos.linha, fundo]} onLayout={(e) => onLayoutLinha(indice, e)}>
      {palavras.map((palavra, i) => {
        const selecionada = selecaoInicio >= 0 && i >= selecaoInicio && i <= selecaoFim;
        const chave = chaveDaPalavra(palavra);
        const curta = palavra.limpa.length <= 2;
        return (
          <Pressable
            key={i}
            onPress={chave ? () => onTocarPalavra(indice, i) : undefined}
            onLongPress={() => onSegurarLinha(indice)}
            delayLongPress={DURACAO_TOQUE_LONGO_MS}
            onLayout={(e) => onLayoutPalavra(indice, i, e)}
            // Palavras curtas ("a", "I") ganham área de toque extra nas laterais.
            hitSlop={curta ? { left: 6, right: 6 } : undefined}
            accessible={!!chave}
            accessibilityRole="button"
            accessibilityLabel={`Traduzir ${chave}`}
            accessibilityHint="Toque duas vezes e segure para traduzir a linha"
            accessibilityState={{ selected: selecionada }}
            style={estilos.palavra}
          >
            <View
              style={[
                estilos.palavraFundo,
                selecionada && { backgroundColor: cores.primariaTinta },
                selecionada && cantos(i === selecaoInicio, i === selecaoFim),
              ]}
            >
              <Text
                maxFontSizeMultiplier={ESCALA_MAXIMA_LETRA}
                accessibilityLanguage="en-US"
                style={[
                  atual || selecionada ? tipografia.letraAtual : tipografia.letra,
                  {
                    color: selecionada ? cores.sobrePrimariaTinta : atual ? cores.sobreDestaqueTinta : cores.texto2,
                  },
                ]}
              >
                {palavra.exibida}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </Animated.View>
  );
});

/** Numa frase, só a primeira e a última palavra têm cantos arredondados. */
function cantos(primeira: boolean, ultima: boolean) {
  return {
    borderTopLeftRadius: primeira ? raio.palavra : 0,
    borderBottomLeftRadius: primeira ? raio.palavra : 0,
    borderTopRightRadius: ultima ? raio.palavra : 0,
    borderBottomRightRadius: ultima ? raio.palavra : 0,
  };
}

/** A mesma cor com alfa 0, para o fade do fundo âmbar não passar por preto. */
function transparente(hex: string): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0)`;
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: raio.linha,
  },
  palavra: { paddingVertical: RESPIRO_VERTICAL, justifyContent: 'center' },
  palavraFundo: { paddingHorizontal: 4, borderRadius: raio.palavra },
});
