"""Busca de letras (texto e LRC) na LRCLIB (https://lrclib.net), API pública sem chave."""

import re
from dataclasses import dataclass

import httpx

from api.config import get_settings

FEATURING = re.compile(r"\s*[\(\[]?\s*(feat\.?|ft\.?|featuring)\s+[^\)\]]*[\)\]]?", re.IGNORECASE)


class LrclibError(Exception):
    pass


@dataclass
class LrclibTrack:
    id: int
    track_name: str
    artist_name: str
    duration_ms: int
    plain_lyrics: str | None
    synced_lyrics: str | None


def _search(params: dict) -> list[dict]:
    settings = get_settings()
    try:
        response = httpx.get(
            f"{settings.lrclib_base_url}/search",
            params=params,
            headers={"User-Agent": settings.lrclib_user_agent},
            timeout=15,
        )
    except httpx.HTTPError as exc:
        raise LrclibError(f"Falha ao acessar a LRCLIB: {exc}") from exc
    if response.status_code != 200:
        raise LrclibError(f"A LRCLIB respondeu {response.status_code}: {response.text[:300]}")
    return response.json()


def search_track(artist: str, title: str, duration_ms: int) -> LrclibTrack | None:
    """Escolhe o resultado com a duração mais próxima do vídeo, preferindo os que têm LRC sincronizado."""
    clean_title = FEATURING.sub("", title).strip()
    results = _search({"track_name": clean_title, "artist_name": artist}) or _search({"q": f"{artist} {clean_title}"})

    tracks = [
        LrclibTrack(
            id=item["id"],
            track_name=item.get("trackName", ""),
            artist_name=item.get("artistName", ""),
            duration_ms=round(float(item.get("duration") or 0) * 1000),
            plain_lyrics=item.get("plainLyrics") or None,
            synced_lyrics=item.get("syncedLyrics") or None,
        )
        for item in results
        if not item.get("instrumental")
    ]
    tracks = [track for track in tracks if track.plain_lyrics or track.synced_lyrics]
    if not tracks:
        return None

    tolerance = get_settings().duration_tolerance_ms

    def rank(track: LrclibTrack) -> tuple[bool, bool, int]:
        diff = abs(track.duration_ms - duration_ms)
        return diff > tolerance, track.synced_lyrics is None, diff

    return min(tracks, key=rank)
