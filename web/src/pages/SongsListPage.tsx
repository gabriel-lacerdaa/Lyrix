import { useEffect, useState } from "react";
import { StatusBadge, ErrorBox } from "../components/common";
import { api, asApiError, type ApiError } from "../lib/api";
import { formatDateTime, KIND_LABELS, STATUS_LABELS } from "../lib/format";
import { navigate } from "../lib/router";
import type { AdminSongSummary, SongStatus } from "../lib/types";

const FILTERS: SongStatus[] = [
  "ready_for_review",
  "processing",
  "waiting_lyrics",
  "failed",
  "published",
  "draft",
  "broken",
];

export function SongsListPage() {
  const [filter, setFilter] = useState<SongStatus | undefined>();
  const [songs, setSongs] = useState<AdminSongSummary[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      try {
        const result = await api.listSongs(filter);
        if (cancelled) return;
        setSongs(result);
        setError(null);
        // Atualiza sozinho enquanto houver música em processamento.
        if (result.some((song) => song.status === "processing")) timer = window.setTimeout(load, 3000);
      } catch (e) {
        if (!cancelled) setError(asApiError(e));
      }
    };
    load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filter]);

  return (
    <section>
      <div className="page-title">
        <h1>Acervo</h1>
        <a className="button primary" href="#/nova">
          Nova música
        </a>
      </div>

      <div className="filters" role="tablist">
        <button className={filter === undefined ? "chip active" : "chip"} onClick={() => setFilter(undefined)}>
          Todas
        </button>
        {FILTERS.map((status) => (
          <button key={status} className={filter === status ? "chip active" : "chip"} onClick={() => setFilter(status)}>
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {error && <ErrorBox error={error} />}
      {songs === null && !error && <p className="muted">Carregando…</p>}
      {songs?.length === 0 && (
        <p className="muted">
          Nenhuma música {filter ? `com status "${STATUS_LABELS[filter]}"` : "ainda"}. Use <a href="#/nova">Nova música</a>{" "}
          para colar um link do YouTube.
        </p>
      )}
      {songs && songs.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Música</th>
              <th>Vídeo</th>
              <th>Status</th>
              <th>Avisos</th>
              <th>Atualizada</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => (
              <tr key={song.id} className="clickable" onClick={() => navigate(`/musicas/${song.id}`)}>
                <td>
                  <a href={`#/musicas/${song.id}`} onClick={(e) => e.stopPropagation()}>
                    <strong>{song.title}</strong>
                  </a>
                  <div className="muted">{song.artist}</div>
                </td>
                <td>{KIND_LABELS[song.video_kind]}</td>
                <td>
                  <StatusBadge status={song.status} />
                </td>
                <td>{song.warnings_count > 0 ? song.warnings_count : "—"}</td>
                <td className="muted">{formatDateTime(song.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
