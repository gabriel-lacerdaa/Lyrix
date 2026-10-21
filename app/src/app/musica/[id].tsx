import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ehNaoEncontrado } from '@/api/client';
import { useMusica } from '@/api/songs';
import { alturaDoPlayer } from '@/features/player/AreaDoPlayer';
import { BarraMusica } from '@/features/player/BarraMusica';
import {
  MusicaCarregando,
  MusicaErro,
  MusicaIndisponivel,
  MusicaSemConexao,
} from '@/features/player/EstadosMusica';
import { Reproducao } from '@/features/player/Reproducao';
import { useSemConexao } from '@/hooks/useConexao';
import { useCores } from '@/theme/useCores';

type Parametros = { id: string; titulo?: string; artista?: string };

export default function TelaMusica() {
  // Título e artista vêm do acervo, para a barra já aparecer preenchida enquanto a música carrega.
  const { id, titulo, artista } = useLocalSearchParams<Parametros>();
  const cores = useCores();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const alturaPlayer = alturaDoPlayer(width);
  const semConexao = useSemConexao();
  const { data: musica, isPending, isError, isFetching, error, refetch } = useMusica(id);

  const voltar = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);
  const tentarDeNovo = () => void refetch();

  let corpo;
  if (isPending || (isError && isFetching)) {
    corpo = <MusicaCarregando alturaPlayer={alturaPlayer} />;
  } else if (isError && ehNaoEncontrado(error)) {
    corpo = <MusicaIndisponivel alturaPlayer={alturaPlayer} onVoltar={voltar} />;
  } else if (isError && semConexao) {
    corpo = <MusicaSemConexao alturaPlayer={alturaPlayer} onTentarDeNovo={tentarDeNovo} onVoltar={voltar} />;
  } else if (isError) {
    corpo = <MusicaErro alturaPlayer={alturaPlayer} onTentarDeNovo={tentarDeNovo} onVoltar={voltar} />;
  } else {
    corpo = <Reproducao musica={musica} onVoltar={voltar} />;
  }

  return (
    <View style={[estilos.tela, { paddingTop: insets.top, backgroundColor: cores.fundo }]}>
      <BarraMusica titulo={musica?.title ?? titulo ?? ''} artista={musica?.artist ?? artista ?? ''} onVoltar={voltar} />
      {corpo}
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
});
