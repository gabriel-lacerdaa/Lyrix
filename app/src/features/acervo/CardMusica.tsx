import { ChevronRight, Music } from 'lucide-react-native';
import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SongSummary } from '@/api/types';
import { Esqueleto } from '@/components/Esqueleto';
import { tipografia } from '@/theme/tipografia';
import { raio, type Cores } from '@/theme/tokens';
import { useCores } from '@/theme/useCores';

type Props = {
  musica: SongSummary;
  /** Posição na lista: escolhe a cor da miniatura substituta, como nas telas de referência. */
  indice: number;
  onPress: (musica: SongSummary) => void;
};

export const CardMusica = memo(function CardMusica({ musica, indice, onPress }: Props) {
  const cores = useCores();
  const [miniaturaFalhou, setMiniaturaFalhou] = useState(false);
  const temMiniatura = !!musica.thumbnail_url && !miniaturaFalhou;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${musica.title}, ${musica.artist}`}
      onPress={() => onPress(musica)}
      style={({ pressed }) => [
        estilos.card,
        { backgroundColor: pressed ? cores.primariaTinta : cores.superficie, borderColor: cores.borda },
      ]}
    >
      {temMiniatura ? (
        <Image
          source={{ uri: musica.thumbnail_url! }}
          style={[estilos.miniatura, { backgroundColor: cores.superficie2 }]}
          resizeMode="cover"
          onError={() => setMiniaturaFalhou(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <MiniaturaSubstituta indice={indice} cores={cores} />
      )}
      <View style={estilos.textos}>
        <Text style={[tipografia.cardTitulo, { color: cores.texto }]} numberOfLines={1}>
          {musica.title}
        </Text>
        <Text style={[tipografia.secundario, { color: cores.texto2 }]} numberOfLines={1}>
          {musica.artist}
        </Text>
      </View>
      <ChevronRight size={20} color={cores.texto2} strokeWidth={2} />
    </Pressable>
  );
});

/** Sem miniatura, o card usa um bloco tingido com ícone de música (variações 0–3 de estilos.css). */
function MiniaturaSubstituta({ indice, cores }: { indice: number; cores: Cores }) {
  const variacoes = [
    { fundo: cores.primariaTinta, icone: cores.primaria },
    { fundo: cores.secundariaTinta, icone: cores.secundaria },
    { fundo: cores.destaqueTinta, icone: cores.destaqueTexto },
    { fundo: cores.superficie2, icone: cores.texto2 },
  ];
  const { fundo, icone } = variacoes[indice % variacoes.length];
  return (
    <View style={[estilos.miniatura, estilos.centro, { backgroundColor: fundo }]}>
      <Music size={22} color={icone} strokeWidth={2} />
    </View>
  );
}

// Larguras dos textos de cada esqueleto, iguais às de 02-acervo-carregando.html.
const LARGURAS_ESQUELETO = [
  ['70%', '45%'], ['55%', '38%'], ['80%', '50%'], ['62%', '40%'], ['74%', '48%'], ['58%', '36%'], ['68%', '44%'],
] as const;

export function ListaEsqueleto() {
  const cores = useCores();
  return (
    <View style={estilos.listaEsqueleto} accessibilityLabel="Carregando músicas" accessible>
      {LARGURAS_ESQUELETO.map(([titulo, artista], i) => (
        <View
          key={i}
          style={[estilos.card, estilos.cardEsqueleto, { backgroundColor: cores.superficie, borderColor: cores.borda }]}
        >
          <Esqueleto style={estilos.miniatura} />
          <View style={[estilos.textos, estilos.textosEsqueleto]}>
            <Esqueleto largura={titulo} altura={14} />
            <Esqueleto largura={artista} altura={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: raio.card,
    borderWidth: 1,
  },
  cardEsqueleto: { paddingRight: 12 },
  miniatura: { width: 96, height: 54, borderRadius: raio.miniatura },
  centro: { alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  textosEsqueleto: { gap: 8 },
  listaEsqueleto: { paddingTop: 24, paddingHorizontal: 16, gap: 8 },
});
