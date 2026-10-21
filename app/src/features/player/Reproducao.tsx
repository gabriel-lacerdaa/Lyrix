import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import YoutubePlayer, { type YoutubeIframeRef } from 'react-native-youtube-iframe';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SongDetail } from '@/api/types';
import { FaixaAviso } from '@/components/FaixaAviso';
import { Letra } from '@/features/letra/Letra';
import { ehLinhaComTexto } from '@/features/letra/linhaAtual';
import { tokenizar } from '@/features/letra/tokenizar';
import { PainelTraducao, type Pedido } from '@/features/traducao/PainelTraducao';
import {
  selecaoDeLinha,
  selecaoDePalavra,
  textoDaSelecao,
  type Selecao,
} from '@/features/traducao/selecao';
import { useAoIrParaSegundoPlano } from '@/hooks/useAoIrParaSegundoPlano';
import { useFaixaConexao } from '@/hooks/useConexao';
import { useCores } from '@/theme/useCores';

import { alturaDoPlayer, PlayerCarregando } from './AreaDoPlayer';
import { Dica } from './BarraMusica';
import { MusicaIndisponivel } from './EstadosMusica';
import { useLinhaAtual, type EstadoPlayer } from './useLinhaAtual';

type Props = { musica: SongDetail; onVoltar: () => void };

/** Tela 2 — Música (F2 + F3), com o painel de tradução (F4 + F5). */
export function Reproducao({ musica, onVoltar }: Props) {
  const cores = useCores();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const altura = alturaDoPlayer(width);
  const player = useRef<YoutubeIframeRef | null>(null);

  const [pronto, setPronto] = useState(false);
  const [estado, setEstado] = useState<EstadoPlayer>('unstarted');
  const [tocar, setTocar] = useState(false);
  const [velocidade, setVelocidade] = useState(1);
  const [videoIndisponivel, setVideoIndisponivel] = useState(false);
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [alturaPainel, setAlturaPainel] = useState(0);
  const faixaConexao = useFaixaConexao();

  const palavras = useMemo(() => musica.lines.map((linha) => tokenizar(linha.text)), [musica.lines]);
  const { posicao, anuncio } = useLinhaAtual({
    playerRef: player,
    pronto,
    estado,
    velocidade,
    linhas: musica.lines,
    offsetMs: musica.offset_ms,
  });
  const fim = estado === 'ended';
  const destacada = !fim && !anuncio && ehLinhaComTexto(musica.lines, posicao) ? posicao : -1;

  // O vídeo não pode tocar em segundo plano. Ao voltar, o usuário retoma pelo player.
  useAoIrParaSegundoPlano(useCallback(() => setTocar(false), []));

  const aoMudarEstado = useCallback((novo: string) => {
    setEstado(novo as EstadoPlayer);
    // Mantém o `play` em sincronia com os controles do próprio YouTube.
    if (novo === 'playing') setTocar(true);
    if (novo === 'paused' || novo === 'ended') setTocar(false);
  }, []);

  const aoFicarPronto = useCallback(() => {
    setPronto(true);
    player.current
      ?.getPlaybackRate()
      .then((taxa) => {
        if (Number.isFinite(taxa) && taxa > 0) setVelocidade(taxa);
      })
      .catch(() => {});
  }, []);

  // ----- Tradução -----
  const selecaoAtual = useRef<Selecao | null>(null);
  const selecionar = useCallback((nova: Selecao | null) => {
    selecaoAtual.current = nova;
    setSelecao(nova);
  }, []);

  const fecharPainel = useCallback(() => {
    selecionar(null);
    setPedido(null);
  }, [selecionar]);

  const aoTocarPalavra = useCallback(
    (linha: number, indice: number) => {
      selecionar(selecaoDePalavra(linha, indice));
      setPedido({ tipo: 'palavra', texto: palavras[linha][indice].limpa });
    },
    [palavras, selecionar],
  );

  const aoSegurarLinha = useCallback(
    (linha: number) => {
      if (palavras[linha].length === 0) return;
      const nova = selecaoDeLinha(linha, palavras[linha].length);
      selecionar(nova);
      setPedido({ tipo: 'frase', texto: textoDaSelecao(nova, palavras) });
    },
    [palavras, selecionar],
  );

  // A tradução da frase atualiza ao soltar a alça.
  const aoSoltarAlca = useCallback(() => {
    const atual = selecaoAtual.current;
    if (atual) setPedido({ tipo: 'frase', texto: textoDaSelecao(atual, palavras) });
  }, [palavras]);

  // Android: o botão voltar fecha o painel antes de sair da música.
  const painelAberto = selecao !== null;
  useEffect(() => {
    if (!painelAberto) return;
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      fecharPainel();
      return true;
    });
    return () => assinatura.remove();
  }, [painelAberto, fecharPainel]);

  if (videoIndisponivel) return <MusicaIndisponivel alturaPlayer={altura} onVoltar={onVoltar} />;

  let faixa;
  if (faixaConexao === 'perdida') {
    faixa = (
      <FaixaAviso
        tom="erro"
        texto="Sem conexão. A música pode parar e as traduções não funcionam até você se reconectar."
      />
    );
  } else if (faixaConexao === 'restabelecida') {
    faixa = <FaixaAviso tom="sucesso" texto="Conexão restabelecida." />;
  } else if (anuncio) {
    faixa = <FaixaAviso tom="info" texto="Anúncio em reprodução. A letra volta a acompanhar quando a música começar." />;
  } else {
    faixa = <Dica />;
  }

  return (
    <>
      {/* Nada fica sobreposto ao player depois que ele carrega. */}
      <View style={{ height: altura, backgroundColor: cores.playerFundo }}>
        <YoutubePlayer
          ref={player}
          height={altura}
          width={width}
          videoId={musica.youtube_video_id}
          play={tocar}
          onReady={aoFicarPronto}
          onChangeState={aoMudarEstado}
          onError={() => setVideoIndisponivel(true)}
          onPlaybackRateChange={(taxa: number) => setVelocidade(taxa)}
        />
        {!pronto ? (
          <View style={StyleSheet.absoluteFill}>
            <PlayerCarregando altura={altura} />
          </View>
        ) : null}
      </View>
      {faixa}
      <View style={estilos.areaLetra}>
        <Letra
          linhas={musica.lines}
          palavras={palavras}
          posicao={posicao}
          destacada={destacada}
          fim={fim}
          congelada={anuncio}
          selecao={selecao}
          alturaPainel={alturaPainel}
          margemInferior={insets.bottom}
          onTocarPalavra={aoTocarPalavra}
          onSegurarLinha={aoSegurarLinha}
          onAlterarSelecao={selecionar}
          onSoltarAlca={aoSoltarAlca}
          onVoltarAoAcervo={onVoltar}
        />
        <PainelTraducao
          pedido={pedido}
          onFechar={fecharPainel}
          onAltura={setAlturaPainel}
          margemInferior={insets.bottom}
        />
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  areaLetra: { flex: 1, minHeight: 0, overflow: 'hidden' },
});
