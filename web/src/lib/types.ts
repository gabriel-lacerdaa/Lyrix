// Espelho dos modelos Pydantic de backend/api/schemas/admin.py.

export type SongStatus =
  | "draft"
  | "processing"
  | "waiting_lyrics"
  | "ready_for_review"
  | "failed"
  | "published"
  | "broken";
export type VideoKind = "topic" | "official_audio" | "clip";
export type SyncSource = "lrclib" | "stable_ts" | "manual";
export type SyncMethod = "auto" | "lrclib" | "align";
export type JobStatus = "queued" | "running" | "done" | "failed";

export interface LyricLineOut {
  line_index: number;
  start_ms: number;
  text: string;
}

export interface SyncWarning {
  code: string;
  message: string;
  line_index: number | null;
}

export interface LrcCandidates {
  lrclib?: string;
  aligned?: string;
  lrclib_estimated_offset_ms?: number;
}

export interface Job {
  id: string;
  method: SyncMethod;
  status: JobStatus;
  step: string | null;
  log: string;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface AdminSongSummary {
  id: string;
  youtube_video_id: string;
  title: string;
  artist: string;
  video_kind: VideoKind;
  status: SongStatus;
  warnings_count: number;
  updated_at: string;
}

export interface AdminSong {
  id: string;
  youtube_video_id: string;
  title: string;
  artist: string;
  video_title: string;
  channel_title: string;
  video_kind: VideoKind;
  video_duration_ms: number;
  thumbnail_url: string | null;
  lyrics_plain: string | null;
  lrc_raw: string | null;
  offset_ms: number;
  sync_source: SyncSource | null;
  synced_on_video_id: string | null;
  sync_warnings: SyncWarning[];
  lrc_candidates: LrcCandidates;
  status: SongStatus;
  cefr_level: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  published_at: string | null;
  lines: LyricLineOut[];
  latest_job: Job | null;
}

export interface SimilarSong {
  id: string;
  title: string;
  artist: string;
  status: SongStatus;
}

export interface ImportPreview {
  youtube_video_id: string;
  video_title: string;
  channel_title: string;
  video_duration_ms: number;
  thumbnail_url: string | null;
  video_kind: VideoKind;
  suggested_artist: string;
  suggested_title: string;
  similar_songs: SimilarSong[];
}

export interface SongCreate {
  youtube_video_id: string;
  artist: string;
  title: string;
  video_kind: VideoKind;
}

export interface SongUpdate {
  artist?: string;
  title?: string;
  video_kind?: VideoKind;
  lyrics_plain?: string;
  lrc_raw?: string;
  offset_ms?: number;
  cefr_level?: string | null;
}
