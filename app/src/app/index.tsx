import { router } from 'expo-router';
import { AlertCircle, Music, RotateCw, WifiOff } from 'lucide-react-native';
import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMusicas } from '@/api/songs';
import type { SongSummary } from '@/api/types';
import { Botao } from '@/components/Botao';
import { EstadoMensagem } from '@/components/EstadoMensagem';
import { CardMusica, ListaEsqueleto } from '@/features/acervo/CardMusica';
import { useSemConexao } from '@/hooks/useConexao';
import { tipografia } from '@/theme/tipografia';
import { useCores } from '@/theme/useCores';

/** Tela 1 — Acervo (F1). */
export default function TelaAcervo() {
  const cores = useCores();
  const insets = useSafeAreaInsets();
  const semConexao = useSemConexao();
  const { data: musicas, isPending, isError, isFetching, isRefetching, refetch } = useMusicas();

  const abrir = useCallback((musica: SongSummary) => {
    router.push({ pathname: '/musica/[id]', params: { id: musica.id, titulo: musica.title, artista: musica.artist } });
  }, []);

  const tentarDeNovo = () => void refetch();

  let conteudo;
  if (isPending || (isError && isFetching)) {
    conteudo = <ListaEsqueleto />;
  } else if (isError && semConexao) {
    conteudo = (
      <EstadoMensagem
        Icone={WifiOff}
        tom="erro"
        alerta
        titulo="Você está sem conexão"
        texto="Conecte-se à internet para ver o acervo e ouvir as músicas."
      >
        <Botao titulo="Tentar de novo" Icone={RotateCw} largo onPress={tentarDeNovo} />
      </EstadoMensagem>
    );
  } else if (isError) {
    conteudo = (
      <EstadoMensagem
        Icone={AlertCircle}
        tom="erro"
        alerta
        titulo="Não foi possível carregar as músicas"
        texto="Algo deu errado do nosso lado. Tente de novo em instantes."
      >
        <Botao titulo="Tentar de novo" Icone={RotateCw} largo onPress={tentarDeNovo} />
      </EstadoMensagem>
    );
  } else if (musicas.length === 0) {
    conteudo = (
      <EstadoMensagem
        Icone={Music}
        tom="primario"
        titulo="Nenhuma música por aqui ainda"
        texto="O acervo está sendo preparado. Volte daqui a pouco."
      >
        <Botao titulo="Atualizar" variante="secundario" Icone={RotateCw} largo onPress={tentarDeNovo} />
      </EstadoMensagem>
    );
  } else {
    conteudo = (
      <FlatList
        data={musicas}
        keyExtractor={(musica) => musica.id}
        renderItem={({ item, index }) => <CardMusica musica={item} indice={index} onPress={abrir} />}
        ListHeaderComponent={
          <Text style={[tipografia.rotulo, estilos.rotuloLista, { color: cores.texto2 }]}>
            {musicas.length === 1 ? '1 música' : `${musicas.length} músicas`} · A–Z
          </Text>
        }
        contentContainerStyle={[estilos.lista, { paddingBottom: 24 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={tentarDeNovo}
            tintColor={cores.primaria}
            colors={[cores.primaria]}
            progressBackgroundColor={cores.superficie}
          />
        }
      />
    );
  }

  return (
    <View style={[estilos.tela, { paddingTop: insets.top, backgroundColor: cores.fundo }]}>
      <View style={estilos.cabecalho}>
        <Text style={[tipografia.tituloTela, { color: cores.texto }]} accessibilityRole="header">
          Músicas
        </Text>
        <Text style={[tipografia.secundario, { color: cores.texto2 }]}>Escolha uma música para estudar</Text>
      </View>
      {conteudo}
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  cabecalho: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  // O espaço até o primeiro card vem do gap da lista (8 px, como em .rotulo-lista).
  rotuloLista: { paddingHorizontal: 4 },
  lista: { paddingHorizontal: 16, gap: 8 },
});
