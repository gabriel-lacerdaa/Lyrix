// Relógio do vídeo: o player só informa o tempo de forma assíncrona (pela WebView). Guardamos uma
// âncora a cada leitura e interpolamos entre as leituras, então o erro nunca se acumula.

export type Ancora = {
  videoMs: number;
  /** Momento local (performance.now) que corresponde a `videoMs`. */
  localMs: number;
  velocidade: number;
  /** false quando pausado, carregando ou com o tempo parado: a estimativa congela em `videoMs`. */
  avancando: boolean;
};

export const ANCORA_INICIAL: Ancora = { videoMs: 0, localMs: 0, velocidade: 1, avancando: false };

export function tempoEstimado(ancora: Ancora, agoraMs: number): number {
  if (!ancora.avancando) return ancora.videoMs;
  return ancora.videoMs + Math.max(0, agoraMs - ancora.localMs) * ancora.velocidade;
}

// ----- Detecção de anúncio (heurística, a validar no aparelho) -----
// A IFrame API não avisa quando há anúncio. Consideramos anúncio quando o player diz "tocando"
// mas o tempo do vídeo não avança por um tempo. "Carregando" (buffering) não conta.

export const TOLERANCIA_PARADO_MS = 50;
export const TEMPO_PARADO_PARA_ANUNCIO_MS = 1500;

export type Detector = {
  ultimoTempoMs: number | null;
  paradoDesdeMs: number | null;
};

export const DETECTOR_INICIAL: Detector = { ultimoTempoMs: null, paradoDesdeMs: null };

export type LeituraDetector = { tempoMs: number; agoraMs: number; tocando: boolean };

export type ResultadoDetector = {
  detector: Detector;
  /** O tempo não avançou desde a leitura anterior, embora o player diga que está tocando. */
  parado: boolean;
  anuncio: boolean;
};

export function atualizarDetector(detector: Detector, leitura: LeituraDetector): ResultadoDetector {
  const { tempoMs, agoraMs, tocando } = leitura;
  if (!tocando) {
    return { detector: { ultimoTempoMs: tempoMs, paradoDesdeMs: null }, parado: false, anuncio: false };
  }
  const parado =
    detector.ultimoTempoMs !== null && Math.abs(tempoMs - detector.ultimoTempoMs) < TOLERANCIA_PARADO_MS;
  if (!parado) {
    return { detector: { ultimoTempoMs: tempoMs, paradoDesdeMs: null }, parado: false, anuncio: false };
  }
  const paradoDesdeMs = detector.paradoDesdeMs ?? agoraMs;
  return {
    detector: { ultimoTempoMs: tempoMs, paradoDesdeMs },
    parado: true,
    anuncio: agoraMs - paradoDesdeMs >= TEMPO_PARADO_PARA_ANUNCIO_MS,
  };
}
