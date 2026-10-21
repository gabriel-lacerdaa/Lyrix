import type { SongStatus, SyncMethod, SyncSource, VideoKind } from "./types";

export const STATUS_LABELS: Record<SongStatus, string> = {
  draft: "Rascunho",
  processing: "Processando",
  waiting_lyrics: "Aguardando letra",
  ready_for_review: "Pronta para revisão",
  failed: "Falhou",
  published: "Publicada",
  broken: "Quebrada",
};

export const KIND_LABELS: Record<VideoKind, string> = {
  topic: "Topic (áudio do álbum)",
  official_audio: "Official Audio",
  clip: "Clipe",
};

export const SOURCE_LABELS: Record<SyncSource, string> = {
  lrclib: "LRCLIB",
  stable_ts: "Alinhamento (stable-ts)",
  manual: "Manual",
};

export const METHOD_LABELS: Record<SyncMethod, string> = {
  auto: "Automático: LRC da LRCLIB se a duração bater, senão alinhamento",
  lrclib: "Só LRCLIB: usar o LRC pronto",
  align: "Alinhar no áudio do vídeo (yt-dlp + Demucs + stable-ts)",
};

export const STEP_LABELS: Record<string, string> = {
  fetching_lyrics: "Buscando a letra na LRCLIB",
  downloading_audio: "Baixando o áudio",
  separating_vocals: "Separando a voz",
  aligning: "Alinhando a letra",
  validating: "Validando o LRC",
  ready_for_review: "Pronto para revisão",
  waiting_lyrics: "Aguardando letra",
  failed: "Falhou",
};

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function formatDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

export function youtubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
