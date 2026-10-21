import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { YoutubeIframeRef } from 'react-native-youtube-iframe';

import type { LyricLine } from '@/api/types';
import { indiceDaLinha, tempoDaLetra } from '@/features/letra/linhaAtual';

import { ANCORA_INICIAL, atualizarDetector, DETECTOR_INICIAL, tempoEstimado } from './relogio';

/** Estados de onChangeState do react-native-youtube-iframe. */
export type EstadoPlayer = 'unstarted' | 'video cued' | 'buffering' | 'playing' | 'paused' | 'ended';

const INTERVALO_LEITURA_MS = 500;

type Opcoes = {
  playerRef: RefObject<YoutubeIframeRef | null>;
  pronto: boolean;
  estado: EstadoPlayer;
  velocidade: number;
  linhas: readonly LyricLine[];
  offsetMs: number;
};

type Resultado = {
  /** Índice da linha em que a música está (inclui linhas vazias), ou -1 antes da primeira linha. */
  posicao: number;
  /** Heurística: o player diz "tocando", mas o tempo não avança (provável anúncio). */
  anuncio: boolean;
};

/**
 * Sincronização da letra (app/CLAUDE.md, "Como a sincronização deve funcionar"):
 * lê o tempo real a cada ~500 ms e a cada mudança de estado (âncora) e interpola a cada frame.
 */
export function useLinhaAtual({ playerRef, pronto, estado, velocidade, linhas, offsetMs }: Opcoes): Resultado {
  const [posicao, setPosicao] = useState(-1);
  const [anuncio, setAnuncio] = useState(false);
  const ancora = useRef(ANCORA_INICIAL);
  const detector = useRef(DETECTOR_INICIAL);
  const estadoAtual = useRef(estado);
  const velocidadeAtual = useRef(velocidade);
  const ultimaLeituraPedida = useRef(0);
  const ultimaLeituraAplicada = useRef(0);

  const recalcular = useCallback(() => {
    const tempoMs = tempoEstimado(ancora.current, performance.now());
    setPosicao(indiceDaLinha(linhas, tempoDaLetra(tempoMs, offsetMs)));
  }, [linhas, offsetMs]);

  const ler = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return;
    const numero = ++ultimaLeituraPedida.current;
    const antes = performance.now();
    let segundos: number;
    try {
      segundos = await player.getCurrentTime();
    } catch {
      return;
    }
    // Leituras podem voltar fora de ordem: só vale a mais recente.
    if (numero < ultimaLeituraAplicada.current || !Number.isFinite(segundos)) return;
    ultimaLeituraAplicada.current = numero;
    // O valor foi lido em algum momento da ida e volta pela WebView: usamos o meio.
    const agoraMs = (antes + performance.now()) / 2;
    const tempoMs = segundos * 1000;
    const tocando = estadoAtual.current === 'playing';
    const resultado = atualizarDetector(detector.current, { tempoMs, agoraMs, tocando });
    detector.current = resultado.detector;
    setAnuncio(resultado.anuncio);
    ancora.current = {
      videoMs: tempoMs,
      localMs: agoraMs,
      velocidade: velocidadeAtual.current,
      avancando: tocando && !resultado.parado,
    };
    recalcular();
  }, [playerRef, recalcular]);

  // Mudança de estado ou de velocidade: congela a estimativa no instante atual e pede uma nova leitura.
  useEffect(() => {
    const agoraMs = performance.now();
    ancora.current = {
      videoMs: tempoEstimado(ancora.current, agoraMs),
      localMs: agoraMs,
      velocidade,
      avancando: estado === 'playing' && ancora.current.avancando,
    };
    estadoAtual.current = estado;
    velocidadeAtual.current = velocidade;
    if (estado !== 'playing') setAnuncio(false);
    if (pronto) void ler();
  }, [estado, velocidade, pronto, ler]);

  // Âncora periódica. Também enquanto pausado, para acompanhar um seek feito com o vídeo parado.
  useEffect(() => {
    if (!pronto) return;
    const intervalo = setInterval(() => void ler(), INTERVALO_LEITURA_MS);
    return () => clearInterval(intervalo);
  }, [pronto, ler]);

  // Interpolação a cada frame enquanto toca. setPosicao só re-renderiza quando a linha muda.
  useEffect(() => {
    if (estado !== 'playing') return;
    let frame = requestAnimationFrame(function quadro() {
      recalcular();
      frame = requestAnimationFrame(quadro);
    });
    return () => cancelAnimationFrame(frame);
  }, [estado, recalcular]);

  return { posicao, anuncio };
}
