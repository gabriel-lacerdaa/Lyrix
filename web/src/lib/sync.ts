import { useCallback, useEffect, useRef, useState } from "react";
import { findActiveLine, type TimedLine } from "./lrc";

/**
 * Mesma lógica de sincronia do app: lê o tempo real do player a cada 500 ms (âncora)
 * e interpola a cada frame. tempoDaLetra = tempoDoVídeo − offsetMs.
 * `resync` força uma nova leitura (chame após seek ou mudança de estado do player).
 */
export function useLyricSync(
  player: YT.Player | null,
  lines: TimedLine[],
  offsetMs: number,
  playing: boolean,
  rate: number,
): { active: number; resync: () => void } {
  const anchor = useRef({ videoMs: 0, at: performance.now() });
  const [active, setActive] = useState(-1);

  const resync = useCallback(() => {
    if (player) anchor.current = { videoMs: player.getCurrentTime() * 1000, at: performance.now() };
  }, [player]);

  useEffect(() => {
    resync();
    if (!playing) return;
    const id = window.setInterval(resync, 500);
    return () => window.clearInterval(id);
  }, [playing, resync]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const { videoMs, at } = anchor.current;
      const nowVideoMs = playing ? videoMs + (performance.now() - at) * rate : videoMs;
      const index = findActiveLine(lines, nowVideoMs - offsetMs);
      setActive((previous) => (previous === index ? previous : index));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lines, offsetMs, playing, rate]);

  return { active, resync };
}

/** Número salvo no localStorage (preferência local, ex.: tempo de reação do modo marcação). */
export function useStoredNumber(key: string, fallback: number): [number, (value: number) => void] {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null || Number.isNaN(Number(stored)) ? fallback : Number(stored);
    } catch {
      return fallback;
    }
  });
  const update = useCallback(
    (next: number) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, String(next));
      } catch {
        // sem localStorage: vale só nesta sessão
      }
    },
    [key],
  );
  return [value, update];
}
