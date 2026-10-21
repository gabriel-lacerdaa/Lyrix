import {
  atualizarDetector,
  DETECTOR_INICIAL,
  TEMPO_PARADO_PARA_ANUNCIO_MS,
  tempoEstimado,
  type Detector,
} from '@/features/player/relogio';

describe('tempoEstimado', () => {
  it('interpola a partir da âncora enquanto o vídeo avança', () => {
    const ancora = { videoMs: 10_000, localMs: 500, velocidade: 1, avancando: true };
    expect(tempoEstimado(ancora, 500)).toBe(10_000);
    expect(tempoEstimado(ancora, 750)).toBe(10_250);
  });

  it('respeita a velocidade de reprodução', () => {
    const ancora = { videoMs: 0, localMs: 0, velocidade: 0.5, avancando: true };
    expect(tempoEstimado(ancora, 1000)).toBe(500);
  });

  it('congela quando o vídeo não está avançando', () => {
    const ancora = { videoMs: 4000, localMs: 0, velocidade: 1, avancando: false };
    expect(tempoEstimado(ancora, 60_000)).toBe(4000);
  });
});

describe('atualizarDetector', () => {
  function ler(detector: Detector, tempoMs: number, agoraMs: number, tocando = true) {
    return atualizarDetector(detector, { tempoMs, agoraMs, tocando });
  }

  it('não acusa anúncio enquanto o tempo avança', () => {
    let r = ler(DETECTOR_INICIAL, 0, 0);
    r = ler(r.detector, 500, 500);
    r = ler(r.detector, 1000, 1000);
    expect(r).toMatchObject({ parado: false, anuncio: false });
  });

  it('acusa anúncio quando "tocando" mas o tempo fica parado', () => {
    let r = ler(DETECTOR_INICIAL, 0, 0);
    r = ler(r.detector, 0, 500);
    expect(r).toMatchObject({ parado: true, anuncio: false });
    r = ler(r.detector, 0, 500 + TEMPO_PARADO_PARA_ANUNCIO_MS);
    expect(r.anuncio).toBe(true);
    r = ler(r.detector, 400, 2500);
    expect(r).toMatchObject({ parado: false, anuncio: false });
  });

  it('pausado ou carregando nunca conta como anúncio', () => {
    let r = ler(DETECTOR_INICIAL, 3000, 0, false);
    r = ler(r.detector, 3000, 5000, false);
    expect(r).toMatchObject({ parado: false, anuncio: false });
  });
});
