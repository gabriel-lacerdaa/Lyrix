import { useState, type FormEvent } from "react";
import { ErrorBox, StatusBadge } from "../components/common";
import { api, asApiError, type ApiError } from "../lib/api";
import { formatDuration, KIND_LABELS, youtubeUrl } from "../lib/format";
import { navigate } from "../lib/router";
import type { ImportPreview, VideoKind } from "../lib/types";

export function NewSongPage() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<VideoKind>("topic");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePreview(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const result = await api.previewImport(url);
      setPreview(result);
      setArtist(result.suggested_artist);
      setTitle(result.suggested_title);
      setKind(result.video_kind);
    } catch (e) {
      setError(asApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const song = await api.createSong({
        youtube_video_id: preview.youtube_video_id,
        artist: artist.trim(),
        title: title.trim(),
        video_kind: kind,
      });
      navigate(`/musicas/${song.id}`);
    } catch (e) {
      setError(asApiError(e));
      setBusy(false);
    }
  }

  return (
    <section className="narrow">
      <h1>Nova música</h1>
      <p className="muted">
        Cole o link do vídeo. De preferência um vídeo <strong>"Artista – Topic"</strong> ou "Official Audio", que têm o
        mesmo áudio do álbum.
      </p>

      <form className="card row-form" onSubmit={handlePreview}>
        <input
          type="text"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          autoFocus
        />
        <button className="primary" disabled={busy || !url.trim()}>
          {busy && !preview ? "Validando…" : "Validar link"}
        </button>
      </form>

      {error && <ErrorBox error={error} />}

      {preview && (
        <form className="card" onSubmit={handleCreate}>
          <div className="preview">
            {preview.thumbnail_url && <img src={preview.thumbnail_url} alt="" />}
            <div>
              <strong>{preview.video_title}</strong>
              <div className="muted">
                {preview.channel_title} · {formatDuration(preview.video_duration_ms)} ·{" "}
                <a href={youtubeUrl(preview.youtube_video_id)} target="_blank" rel="noreferrer">
                  abrir no YouTube
                </a>
              </div>
              <div className="alert ok compact">Vídeo válido: público e com reprodução incorporada permitida.</div>
            </div>
          </div>

          {preview.similar_songs.length > 0 && (
            <div className="alert warn">
              Já existe música com o mesmo artista e título no acervo (em outro vídeo):
              <ul>
                {preview.similar_songs.map((song) => (
                  <li key={song.id}>
                    <a href={`#/musicas/${song.id}`}>
                      {song.artist} – {song.title}
                    </a>{" "}
                    <StatusBadge status={song.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2>Confirme os dados</h2>
          <p className="muted">
            {kind === "topic"
              ? "Vídeo Topic: artista e título vêm direto do YouTube."
              : "Artista e título foram deduzidos do título do vídeo. Confira antes de processar: eles são usados para buscar a letra."}
          </p>
          <label>
            Artista
            <input value={artist} onChange={(e) => setArtist(e.target.value)} required />
          </label>
          <label>
            Título da música
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
          <button className="primary" disabled={busy || !artist.trim() || !title.trim()}>
            {busy ? "Salvando…" : "Salvar e processar"}
          </button>
        </form>
      )}
    </section>
  );
}
