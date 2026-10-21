// Mesmo formato e regras de backend/api/services/lrc.py.

export interface TimedLine {
  startMs: number;
  text: string;
}

const TIME_TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrc(lrc: string): TimedLine[] {
  const lines: TimedLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const tags = [...raw.matchAll(TIME_TAG)];
    if (tags.length === 0) continue; // ignora metadados como [ti:] e [ar:]
    const text = raw.replace(TIME_TAG, "").trim();
    // Uma linha pode ter vários tempos: [00:10.00][01:20.00]Refrão
    for (const [, minutes, seconds, fraction = "0"] of tags) {
      const ms = Number(fraction.padEnd(3, "0")); // "45" → 450 ms, "5" → 500 ms
      lines.push({ startMs: (Number(minutes) * 60 + Number(seconds)) * 1000 + ms, text });
    }
  }
  return lines.sort((a, b) => a.startMs - b.startMs);
}

const pad = (value: number) => String(value).padStart(2, "0");

export function formatTimestamp(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const centis = Math.floor((total % 1000) / 10);
  return `${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
}

export function buildLrc(lines: TimedLine[], meta: { title: string; artist: string; lengthMs: number }): string {
  const header = [`[ti:${meta.title}]`, `[ar:${meta.artist}]`, `[length:${formatTimestamp(meta.lengthMs).slice(0, 5)}]`];
  const body = lines.map((line) => `[${formatTimestamp(line.startMs)}]${line.text}`);
  return [...header, ...body].join("\n") + "\n";
}

/** Índice da linha cantada no tempo `lyricMs` (-1 = antes da primeira). Mesma regra da busca binária do app. */
export function findActiveLine(lines: TimedLine[], lyricMs: number): number {
  let best = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startMs <= lyricMs && (best === -1 || lines[i].startMs >= lines[best].startMs)) best = i;
  }
  return best;
}

/** Quantas linhas começam antes da anterior (o servidor reordena por tempo ao salvar). */
export function countOutOfOrder(lines: TimedLine[]): number {
  return lines.filter((line, i) => i > 0 && line.startMs < lines[i - 1].startMs).length;
}
