"""Dedução do tipo de vídeo, do artista e do título da música a partir dos dados do YouTube."""

import re

from api.models import VideoKind
from api.services.youtube import VideoInfo

TITLE_NOISE = re.compile(
    r"\s*[\(\[][^\)\]]*\b(official|video|audio|lyrics?|visualizer|hd|4k|remaster(ed)?|clipe|mv)\b[^\)\]]*[\)\]]",
    re.IGNORECASE,
)
CHANNEL_NOISE = re.compile(r"(\s*vevo|\s*official)$", re.IGNORECASE)
SEPARATORS = (" - ", " – ", " — ", " | ")


def guess_song_info(video: VideoInfo) -> tuple[VideoKind, str, str]:
    """Retorna (tipo do vídeo, artista, título). Em vídeos "Topic" é confiável; nos demais é só uma sugestão."""
    channel = video.channel_title.strip()
    if channel.endswith(" - Topic") or video.description.startswith("Provided to YouTube by"):
        return VideoKind.TOPIC, channel.removesuffix(" - Topic").strip(), video.title.strip()

    kind = VideoKind.OFFICIAL_AUDIO if re.search(r"official\s+audio", video.title, re.IGNORECASE) else VideoKind.CLIP
    cleaned = TITLE_NOISE.sub("", video.title).strip()
    for separator in SEPARATORS:
        if separator in cleaned:
            artist, title = cleaned.split(separator, 1)
            return kind, artist.strip(), title.strip()
    return kind, CHANNEL_NOISE.sub("", channel).strip(), cleaned
