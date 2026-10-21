import type { ApiError } from "../lib/api";
import { STATUS_LABELS } from "../lib/format";
import type { SongStatus } from "../lib/types";

export function StatusBadge({ status }: { status: SongStatus }) {
  return <span className={`badge status-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function ErrorBox({ error }: { error: ApiError }) {
  return (
    <div className="alert error" role="alert">
      <strong>{error.message}</strong>
      {error.problems.length > 0 && (
        <ul>
          {error.problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {error.songId && (
        <p>
          <a href={`#/musicas/${error.songId}`}>Abrir a música existente</a>
        </p>
      )}
    </div>
  );
}
