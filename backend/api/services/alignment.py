"""Sincronização automática a partir do áudio: yt-dlp (download), Demucs (voz) e stable-ts (alinhamento).

Essas dependências são pesadas (PyTorch) e ficam em requirements-processing.txt. Só o worker as importa,
e somente quando uma tarefa precisa alinhar; a API funciona sem elas.
"""

import importlib
import subprocess
import sys
from functools import lru_cache
from pathlib import Path
from types import ModuleType

from api.services.lrc import LrcLine, with_instrumental_gaps


class AlignmentError(Exception):
    pass


def _require(module: str, package: str) -> ModuleType:
    try:
        return importlib.import_module(module)
    except ImportError as exc:
        raise AlignmentError(
            f"O pacote '{package}' não está instalado. Rode: pip install -r requirements-processing.txt"
        ) from exc


def download_audio(video_id: str, dest_dir: Path) -> Path:
    yt_dlp = _require("yt_dlp", "yt-dlp")
    dest_dir.mkdir(parents=True, exist_ok=True)
    options = {
        "format": "bestaudio/best",
        "outtmpl": str(dest_dir / "%(id)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "noprogress": True,
    }
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
            return Path(ydl.prepare_filename(info))
    except Exception as exc:  # yt-dlp lança vários tipos próprios de erro
        raise AlignmentError(f"yt-dlp não conseguiu baixar o áudio: {exc}") from exc


def separate_vocals(audio_path: Path, out_dir: Path, model: str) -> Path:
    _require("demucs", "demucs")
    command = [sys.executable, "-m", "demucs", "--two-stems", "vocals", "-n", model, "-o", str(out_dir), str(audio_path)]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise AlignmentError(f"Demucs falhou: {result.stderr[-800:]}")
    vocals = out_dir / model / audio_path.stem / "vocals.wav"
    if not vocals.exists():
        raise AlignmentError(f"Demucs terminou, mas o arquivo {vocals} não foi encontrado.")
    return vocals


@lru_cache(maxsize=1)
def _load_whisper(model_name: str):
    return _require("stable_whisper", "stable-ts").load_model(model_name)


def align_lyrics(audio_path: Path, lyric_lines: list[str], model_name: str) -> list[LrcLine]:
    """Alinha a letra conhecida (uma linha cantada por item) com a voz e devolve o início de cada linha."""
    model = _load_whisper(model_name)
    result = model.align(str(audio_path), "\n".join(lyric_lines), language="en", original_split=True)
    segments = list(result.segments)

    if len(segments) == len(lyric_lines):
        spans = [(round(seg.start * 1000), round(seg.end * 1000), text) for seg, text in zip(segments, lyric_lines)]
        return with_instrumental_gaps(spans)

    # O agrupamento não bateu com as linhas: reconstrói as linhas pela contagem de palavras.
    words = [word for seg in segments for word in seg.words]
    spans, cursor = [], 0
    for text in lyric_lines:
        count = len(text.split())
        if cursor + count > len(words):
            raise AlignmentError("O alinhamento devolveu menos palavras do que a letra tem.")
        spans.append((round(words[cursor].start * 1000), round(words[cursor + count - 1].end * 1000), text))
        cursor += count
    return with_instrumental_gaps(spans)
