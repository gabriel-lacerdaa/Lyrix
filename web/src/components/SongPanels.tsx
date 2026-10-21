import { useState, type FormEvent } from "react";
import { CEFR_LEVELS, formatDateTime, KIND_LABELS, METHOD_LABELS, STEP_LABELS } from "../lib/format";
import type { AdminSong, Job, SongUpdate, SyncMethod, VideoKind } from "../lib/types";

export function JobPanel({ job, live }: { job: Job; live?: boolean }) {
  const step = job.step ? (STEP_LABELS[job.step] ?? job.step) : null;
  return (
    <div className={live ? "card job live" : "card job"}>
      {live ? (
        <p>
          <span className="spinner" />{" "}
          {job.status === "queued" ? (
            <>
              <strong>Na fila.</strong> O worker está rodando? (<code>python -m api.worker</code> em <code>backend/</code>)
            </>
          ) : (
            <strong>{step ?? "Processando"}…</strong>
          )}
        </p>
      ) : (
        <p>
          Método: {METHOD_LABELS[job.method]} · início {formatDateTime(job.started_at)} · fim{" "}
          {formatDateTime(job.finished_at)}
        </p>
      )}
      {job.error && <div className="alert error">{job.error}</div>}
      {job.log && <pre className="log">{job.log}</pre>}
    </div>
  );
}

export function LyricsForm({
  song,
  busy,
  onSubmit,
}: {
  song: AdminSong;
  busy: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState(song.lyrics_plain ?? "");
  const published = song.status === "published";
  return (
    <form
      className="card"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit(text);
      }}
    >
      <h2>Letra para alinhar</h2>
      <p className="muted">
        Uma linha cantada por linha. Cabeçalhos como [Chorus] e marcas como (x2) são removidos; repita os refrões por
        extenso. O alinhamento baixa o áudio do vídeo e pode levar alguns minutos (o worker precisa de{" "}
        <code>requirements-processing.txt</code> e do ffmpeg).
      </p>
      <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} />
      <button className="primary" disabled={busy || published || !text.trim()}>
        Enviar letra e alinhar
      </button>
      {published && <p className="muted small">Tire a música do ar para reprocessar.</p>}
    </form>
  );
}

export function ReprocessPanel({
  song,
  busy,
  onReprocess,
}: {
  song: AdminSong;
  busy: boolean;
  onReprocess: (method: SyncMethod) => void;
}) {
  const [method, setMethod] = useState<SyncMethod>("auto");
  const published = song.status === "published";
  return (
    <div className="card">
      <h2>Reprocessar</h2>
      {(Object.keys(METHOD_LABELS) as SyncMethod[]).map((value) => (
        <label key={value} className="inline radio">
          <input type="radio" name="method" checked={method === value} onChange={() => setMethod(value)} />
          {METHOD_LABELS[value]}
        </label>
      ))}
      <p className="muted small">Gera um LRC novo e substitui o atual (incluindo ajustes manuais).</p>
      <button onClick={() => onReprocess(method)} disabled={busy || published}>
        Reprocessar
      </button>
      {published && <p className="muted small">Tire a música do ar para reprocessar.</p>}
    </div>
  );
}

export function MetadataForm({
  song,
  busy,
  onSave,
}: {
  song: AdminSong;
  busy: boolean;
  onSave: (update: SongUpdate) => void;
}) {
  const [artist, setArtist] = useState(song.artist);
  const [title, setTitle] = useState(song.title);
  const [kind, setKind] = useState<VideoKind>(song.video_kind);
  const [cefr, setCefr] = useState(song.cefr_level ?? "");
  const changed =
    artist !== song.artist || title !== song.title || kind !== song.video_kind || cefr !== (song.cefr_level ?? "");

  return (
    <form
      className="card"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSave({ artist: artist.trim(), title: title.trim(), video_kind: kind, cefr_level: cefr || null });
      }}
    >
      <h2>Dados da música</h2>
      <div className="grid-2">
        <label>
          Artista
          <input value={artist} onChange={(e) => setArtist(e.target.value)} required />
        </label>
        <label>
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Tipo do vídeo
          <select value={kind} onChange={(e) => setKind(e.target.value as VideoKind)}>
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nível (CEFR)
          <select value={cefr} onChange={(e) => setCefr(e.target.value)}>
            <option value="">—</option>
            {CEFR_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted small">
        Vídeo: {song.video_title} ({song.channel_title}). Criada em {formatDateTime(song.created_at)} · revisada em{" "}
        {formatDateTime(song.reviewed_at)}.
      </p>
      <button disabled={busy || !changed}>Salvar dados</button>
    </form>
  );
}
