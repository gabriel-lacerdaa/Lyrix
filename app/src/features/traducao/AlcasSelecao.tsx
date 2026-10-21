import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { tipografia } from '@/theme/tipografia';
import { toqueMinimo } from '@/theme/tokens';
import { useCores } from '@/theme/useCores';

import type { Alca, Retangulo } from './selecao';

const ALTURA_BARRA = tipografia.letra.lineHeight;
const DIAMETRO = 12;

type Ponto = { x: number; y: number };

type Props = {
  /** Retângulos da primeira e da última palavra selecionadas, nas coordenadas do conteúdo da letra. */
  inicio: Retangulo;
  fim: Retangulo;
  onMover: (alca: Alca, ponto: Ponto) => void;
  onArrastando: (arrastando: boolean) => void;
  onSoltar: () => void;
};

/** Alças no início e no fim da frase (barra de 2 px + círculo de 12 px), para encurtar a seleção. */
export function AlcasSelecao({ inicio, fim, onMover, onArrastando, onSoltar }: Props) {
  return (
    <>
      <AlcaArrastavel alca="inicio" palavra={inicio} onMover={onMover} onArrastando={onArrastando} onSoltar={onSoltar} />
      <AlcaArrastavel alca="fim" palavra={fim} onMover={onMover} onArrastando={onArrastando} onSoltar={onSoltar} />
    </>
  );
}

type PropsAlca = Omit<Props, 'inicio' | 'fim'> & { alca: Alca; palavra: Retangulo };

function AlcaArrastavel({ alca, palavra, onMover, onArrastando, onSoltar }: PropsAlca) {
  const cores = useCores();
  // A barra fica na borda da palavra, na altura do texto (7 px abaixo do topo do alvo de 44 px).
  const barraX = alca === 'inicio' ? palavra.x : palavra.x + palavra.largura - 2;
  const barraY = palavra.y + (palavra.altura - ALTURA_BARRA) / 2;
  // Círculo acima da barra no início e abaixo dela no fim.
  const circuloY = alca === 'inicio' ? barraY - 7 : barraY + ALTURA_BARRA - DIAMETRO + 7;
  const areaX = barraX + 1 - toqueMinimo / 2;
  const areaY = circuloY + DIAMETRO / 2 - toqueMinimo / 2;
  // O dedo fica sobre o círculo, mas o ponto procurado é o meio da barra: é onde fica o texto.
  const ajusteY = barraY + ALTURA_BARRA / 2 - (circuloY + DIAMETRO / 2);

  const arrastar = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onStart(() => onArrastando(true))
    .onUpdate((e) => {
      // e.x/e.y são relativos à área da alça, que acompanha a palavra a cada mudança da seleção.
      onMover(alca, { x: areaX + e.x, y: areaY + e.y + ajusteY });
    })
    .onFinalize(() => {
      onArrastando(false);
      onSoltar();
    });

  return (
    <GestureDetector gesture={arrastar}>
      <View
        style={[
          estilos.areaDeToque,
          { left: areaX, top: areaY },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View
          style={[
            estilos.barra,
            { backgroundColor: cores.primaria, left: toqueMinimo / 2 - 1, top: barraY - circuloY - DIAMETRO / 2 + toqueMinimo / 2 },
          ]}
        />
        <View style={[estilos.circulo, { backgroundColor: cores.primaria }]} />
      </View>
    </GestureDetector>
  );
}

const estilos = StyleSheet.create({
  areaDeToque: {
    position: 'absolute',
    width: toqueMinimo,
    height: toqueMinimo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barra: { position: 'absolute', width: 2, height: ALTURA_BARRA },
  circulo: { width: DIAMETRO, height: DIAMETRO, borderRadius: DIAMETRO / 2 },
});
