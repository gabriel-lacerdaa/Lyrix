import type {
  AdminSong,
  AdminSongSummary,
  ImportPreview,
  SongCreate,
  SongStatus,
  SongUpdate,
  SyncMethod,
} from "./types";

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const ADMIN_TOKEN: string = import.meta.env.VITE_ADMIN_TOKEN || "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public problems: string[] = [],
    public songId?: string,
  ) {
    super(message);
  }
}

type ErrorDetail =
  | string
  | { message?: string; problems?: string[]; song_id?: string }
  | { loc?: (string | number)[]; msg: string }[];

function toApiError(status: number, body: { detail?: ErrorDetail } | null): ApiError {
  const detail = body?.detail;
  if (typeof detail === "string") return new ApiError(status, detail);
  if (Array.isArray(detail)) {
    // Erro de validação do FastAPI/Pydantic.
    return new ApiError(
      status,
      "Dados inválidos.",
      detail.map((item) => `${(item.loc ?? []).slice(1).join(".")}: ${item.msg}`),
    );
  }
  if (detail) return new ApiError(status, detail.message ?? `Erro ${status}.`, detail.problems ?? [], detail.song_id);
  return new ApiError(status, `A API respondeu com erro ${status}.`);
}

export function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(0, String(error));
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (ADMIN_TOKEN) headers["X-Admin-Token"] = ADMIN_TOKEN;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, `Não foi possível conectar à API em ${BASE_URL}. Ela está rodando?`);
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, data);
  return data as T;
}

export const api = {
  listSongs: (status?: SongStatus) =>
    request<AdminSongSummary[]>("GET", `/admin/songs${status ? `?status=${status}` : ""}`),
  getSong: (id: string) => request<AdminSong>("GET", `/admin/songs/${id}`),
  previewImport: (url: string) => request<ImportPreview>("POST", "/admin/songs/import", { url }),
  createSong: (body: SongCreate) => request<AdminSong>("POST", "/admin/songs", body),
  updateSong: (id: string, body: SongUpdate) => request<AdminSong>("PATCH", `/admin/songs/${id}`, body),
  submitLyrics: (id: string, text: string) => request<AdminSong>("POST", `/admin/songs/${id}/lyrics`, { text }),
  reprocess: (id: string, method: SyncMethod) =>
    request<AdminSong>("POST", `/admin/songs/${id}/reprocess`, { method }),
  publish: (id: string) => request<AdminSong>("POST", `/admin/songs/${id}/publish`),
  unpublish: (id: string) => request<AdminSong>("POST", `/admin/songs/${id}/unpublish`),
  deleteSong: (id: string) => request<void>("DELETE", `/admin/songs/${id}`),
};
