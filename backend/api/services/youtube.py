"""Validação de links e leitura de dados de vídeos pela YouTube Data API v3."""

import re
from dataclasses import dataclass
from urllib.parse import parse_qs, urlparse

import httpx

from api.config import get_settings

API_URL = "https://www.googleapis.com/youtube/v3/videos"
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
ISO_DURATION = re.compile(r"^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$")
YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
}
PATH_PREFIXES = {"embed", "shorts", "live", "v"}


class YouTubeError(Exception):
    pass


@dataclass
class VideoInfo:
    video_id: str
    title: str
    channel_title: str
    description: str
    duration_ms: int
    thumbnail_url: str | None
    privacy_status: str
    embeddable: bool
    blocked_in_region: bool
    age_restricted: bool


def extract_video_id(url: str) -> str | None:
    """Aceita watch?v=, youtu.be/, music.youtube.com, embed/, shorts/, live/ ou o próprio ID."""
    url = url.strip()
    if VIDEO_ID.match(url):
        return url
    if "://" not in url:
        url = "https://" + url
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    parts = [part for part in parsed.path.split("/") if part]

    if host in ("youtu.be", "www.youtu.be"):
        candidate = parts[0] if parts else ""
    elif host in YOUTUBE_HOSTS:
        if parsed.path == "/watch":
            candidate = parse_qs(parsed.query).get("v", [""])[0]
        elif len(parts) >= 2 and parts[0] in PATH_PREFIXES:
            candidate = parts[1]
        else:
            candidate = ""
    else:
        return None
    return candidate if VIDEO_ID.match(candidate) else None


def parse_iso_duration(value: str) -> int:
    match = ISO_DURATION.match(value or "")
    if not match:
        return 0
    days, hours, minutes, seconds = (int(group or 0) for group in match.groups())
    return (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000


def fetch_video(video_id: str) -> VideoInfo | None:
    """Retorna os dados do vídeo, ou None se ele não existir. Custa 1 unidade da cota diária."""
    settings = get_settings()
    params = {"part": "snippet,contentDetails,status", "id": video_id, "key": settings.youtube_api_key}
    try:
        response = httpx.get(API_URL, params=params, timeout=10)
    except httpx.HTTPError as exc:
        raise YouTubeError(f"Falha ao acessar a YouTube Data API: {exc}") from exc
    if response.status_code != 200:
        raise YouTubeError(f"A YouTube Data API respondeu {response.status_code}: {response.text[:300]}")

    items = response.json().get("items", [])
    if not items:
        return None
    item = items[0]
    snippet = item.get("snippet", {})
    content = item.get("contentDetails", {})
    status = item.get("status", {})

    restriction = content.get("regionRestriction", {})
    region = settings.region_code
    blocked = ("allowed" in restriction and region not in restriction["allowed"]) or region in restriction.get(
        "blocked", []
    )
    thumbnails = snippet.get("thumbnails", {})
    thumbnail = next(
        (thumbnails[size]["url"] for size in ("maxres", "standard", "high", "medium", "default") if size in thumbnails),
        None,
    )
    return VideoInfo(
        video_id=video_id,
        title=snippet.get("title", ""),
        channel_title=snippet.get("channelTitle", ""),
        description=snippet.get("description", ""),
        duration_ms=parse_iso_duration(content.get("duration", "")),
        thumbnail_url=thumbnail,
        privacy_status=status.get("privacyStatus", ""),
        embeddable=bool(status.get("embeddable", False)),
        blocked_in_region=blocked,
        age_restricted=content.get("contentRating", {}).get("ytRating") == "ytAgeRestricted",
    )


def playback_problems(video: VideoInfo) -> list[str]:
    """Motivos que impedem o vídeo de tocar no player incorporado do app."""
    problems = []
    if video.privacy_status not in ("public", "unlisted"):
        problems.append(f"O vídeo não é público (status: {video.privacy_status or 'desconhecido'}).")
    if not video.embeddable:
        problems.append("O dono do vídeo desativou a reprodução em outros sites (incorporação).")
    if video.blocked_in_region:
        problems.append(f"O vídeo está bloqueado na região {get_settings().region_code}.")
    if video.age_restricted:
        problems.append("O vídeo tem restrição de idade e não toca no player incorporado.")
    if video.duration_ms <= 0:
        problems.append("Não foi possível ler a duração (pode ser uma transmissão ao vivo).")
    return problems
