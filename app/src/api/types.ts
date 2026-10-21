// Formatos das rotas públicas do app (backend/API.md e backend/api/schemas/songs.py).

export type SongSummary = {
  id: string;
  title: string;
  artist: string;
  thumbnail_url: string | null;
  video_duration_ms: number;
  cefr_level: string | null;
};

/** Linha da letra, já em ordem de tempo. Texto vazio = trecho instrumental. */
export type LyricLine = {
  line_index: number;
  start_ms: number;
  text: string;
};

export type SongDetail = SongSummary & {
  youtube_video_id: string;
  /** Quanto o vídeo está atrasado em relação ao LRC. */
  offset_ms: number;
  lines: LyricLine[];
};
