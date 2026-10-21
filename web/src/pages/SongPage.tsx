import { useCallback, useEffect, useState } from "react";
import { ErrorBox, StatusBadge } from "../components/common";
import { ReviewEditor } from "../components/ReviewEditor";
import { JobPanel, LyricsForm, MetadataForm, ReprocessPanel } from "../components/SongPanels";
import { api, asApiError, type ApiError } from "../lib/api";
import { formatDuration, KIND_LABELS, youtubeUrl } from "../lib/format";
import { navigate } from "../lib/router";
import type { AdminSong } from "../lib/types";

export function SongPage({ id }: { id: string }) {
  const [song, setSong] = useState<AdminSong | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      setSong(await api.getSong(id));
      setError(null);
    } catch (e) {
      setError(asApiError(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const jobActive = song?.latest_job?.status === "queued" || song?.latest_job?.status === "running";

  // Enquanto a tarefa roda no worker, consulta a cada 2 s.
  useEffect(() => {
    if (!jobActive) return;
    const timer = window.setTimeout(load, 2000);
    return () => window.clearTimeout(timer);
  }, [jobActive, song, load]);

  // Avisa antes de sair da página com alterações não salvas.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function run(action: () => Promise<AdminSong | void>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      if (updated) setSong(updated);
      return true;
    } catch (e) {
      setError(asApiError(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!song) return error ? <ErrorBox error={error} /> : <p className="muted">Carregando…</p>;

  const hasLyrics = song.lines.some((line) => line.text);
  const published = song.status === "published";

  async function handleDelete() {
    if (!song || !window.confirm(`Excluir "${song.artist} – ${song.title}"?`)) return;
    if (await run(() => api.deleteSong(song.id))) navigate("/");
  }

  function downloadLrc() {
    if (!song?.lrc_raw) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([song.lrc_raw], { type: "text/plain;charset=utf-8" }));
    link.download = `${song.artist} - ${song.title}.lrc`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const publishHint = !hasLyrics
    ? "A música ainda não tem letra sincronizada."
    : dirty
      ? "Salve as alterações antes de publicar."
      : undefined;

  return (
    <div className="song-page">
      <div className="song-header">
        {song.thumbnail_url && <img src={song.thumbnail_url} alt="" />}
        <div className="song-header-info">
          <h1>{song.title}</h1>
          <div className="muted">
            {song.artist} · {KIND_LABELS[song.video_kind]} · {formatDuration(song.video_duration_ms)} ·{" "}
            <a href={youtubeUrl(song.youtube_video_id)} target="_blank" rel="noreferrer">
              YouTube
            </a>
          </div>
          <StatusBadge status={song.status} />
        </div>
        <div className="toolbar actions">
          {published ? (
            <button onClick={() => run(() => api.unpublish(song.id))} disabled={busy}>
              Tirar do ar
            </button>
          ) : (
            <button
              className="primary"
              onClick={() => run(() => api.publish(song.id))}
              disabled={busy || jobActive || !!publishHint}
              title={publishHint}
            >
              Publicar
            </button>
          )}
          <button onClick={downloadLrc} disabled={!song.lrc_raw}>
            Baixar LRC
          </button>
          <button className="danger" onClick={handleDelete} disabled={busy || jobActive || published}>
            Excluir
          </button>
        </div>
      </div>

      {error && <ErrorBox error={error} />}

      {jobActive && song.latest_job && <JobPanel job={song.latest_job} live />}

      {!jobActive && song.status === "failed" && song.latest_job && (
        <>
          <h2>O processamento falhou</h2>
          <JobPanel job={song.latest_job} />
        </>
      )}

      {!jobActive && song.status === "waiting_lyrics" && (
        <>
          <div className="alert warn">
            A LRCLIB não tem a letra desta música. Cole a letra abaixo para gerar o LRC por alinhamento, ou confira o
            artista e o título em "Dados da música" e reprocesse.
          </div>
          <LyricsForm song={song} busy={busy} onSubmit={(text) => run(() => api.submitLyrics(song.id, text))} />
        </>
      )}

      {!jobActive && hasLyrics && (
        <ReviewEditor
          song={song}
          busy={busy}
          onSave={(update) => run(() => api.updateSong(song.id, update))}
          onDirtyChange={setDirty}
        />
      )}

      {!jobActive && (
        <div className="extras">
          <details>
            <summary>Dados da música</summary>
            <MetadataForm
              key={song.updated_at}
              song={song}
              busy={busy}
              onSave={(update) => run(() => api.updateSong(song.id, update))}
            />
          </details>
          <details>
            <summary>Reprocessar ou enviar outra letra</summary>
            <ReprocessPanel song={song} busy={busy} onReprocess={(method) => run(() => api.reprocess(song.id, method))} />
            {song.status !== "waiting_lyrics" && (
              <LyricsForm song={song} busy={busy} onSubmit={(text) => run(() => api.submitLyrics(song.id, text))} />
            )}
          </details>
          {song.latest_job && song.status !== "failed" && (
            <details>
              <summary>Último processamento</summary>
              <JobPanel job={song.latest_job} />
            </details>
          )}
        </div>
      )}
    </div>
  );
}
