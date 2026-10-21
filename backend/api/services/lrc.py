"""Leitura, geração e validação de arquivos LRC (sincronização por linha)."""

import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from statistics import median

TIME_TAG = re.compile(r"\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]")
OFFSET_TAG = re.compile(r"^\s*\[offset:\s*[+-]?\d+\s*\]\s*$", re.IGNORECASE | re.MULTILINE)
SECTION_HEADER = re.compile(
    r"^\s*(\[[^\]]*\]|\((verse|chorus|refrão|refrao|bridge|intro|outro|pre-chorus|hook)[^)]*\))\s*$",
    re.IGNORECASE,
)
REPEAT_MARK = re.compile(r"\s*(\(\s*x\s*\d+\s*\)|\[\s*x\s*\d+\s*\]|\s+x\d+)\s*$", re.IGNORECASE)

LONG_GAP_MS = 20_000
INSTRUMENTAL_GAP_MS = 5_000
# Códigos gerados por validate_lines (recalculados a cada edição); os demais avisos são preservados.
VALIDATION_CODES = {"empty", "few_lines", "same_time", "after_end", "long_gap", "late_start"}


@dataclass(frozen=True)
class LrcLine:
    start_ms: int
    text: str


def warning(code: str, message: str, line_index: int | None = None) -> dict:
    return {"code": code, "message": message, "line_index": line_index}


def parse_lrc(lrc: str) -> list[LrcLine]:
    """Converte o texto LRC em linhas ordenadas. Ignora metadados como [ti:] e [ar:]."""
    lines: list[LrcLine] = []
    for raw in lrc.splitlines():
        tags = TIME_TAG.findall(raw)
        if not tags:
            continue
        text = TIME_TAG.sub("", raw).strip()
        # Uma linha pode ter vários tempos: [00:10.00][01:20.00]Refrão
        for minutes, seconds, fraction in tags:
            ms = int((fraction or "0").ljust(3, "0"))  # "45" → 450 ms, "5" → 500 ms
            lines.append(LrcLine((int(minutes) * 60 + int(seconds)) * 1000 + ms, text))
    return sorted(lines, key=lambda line: line.start_ms)


def format_timestamp(ms: int) -> str:
    minutes, rest = divmod(max(ms, 0), 60_000)
    seconds, millis = divmod(rest, 1000)
    return f"{minutes:02d}:{seconds:02d}.{millis // 10:02d}"


def build_lrc(lines: list[LrcLine], *, title: str, artist: str, length_ms: int) -> str:
    header = [f"[ti:{title}]", f"[ar:{artist}]", f"[length:{format_timestamp(length_ms)[:5]}]"]
    body = [f"[{format_timestamp(line.start_ms)}]{line.text}" for line in lines]
    return "\n".join(header + body) + "\n"


def has_offset_tag(lrc: str) -> bool:
    return bool(OFFSET_TAG.search(lrc))


def lyrics_from_lrc(lrc: str) -> str:
    return "\n".join(line.text for line in parse_lrc(lrc) if line.text)


def clean_lyrics_text(text: str) -> list[str]:
    """Prepara a letra para o alinhamento: uma linha cantada por linha, sem cabeçalhos e marcas de repetição."""
    lines = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or SECTION_HEADER.match(line):
            continue
        line = REPEAT_MARK.sub("", line).strip()
        if line:
            lines.append(line)
    return lines


def with_instrumental_gaps(spans: list[tuple[int, int, str]]) -> list[LrcLine]:
    """Recebe (início, fim, texto) por linha e insere linhas vazias nas pausas longas, para apagar o destaque."""
    lines: list[LrcLine] = []
    for i, (start, end, text) in enumerate(spans):
        lines.append(LrcLine(start, text))
        next_start = spans[i + 1][0] if i + 1 < len(spans) else None
        if next_start is not None and next_start - end >= INSTRUMENTAL_GAP_MS:
            lines.append(LrcLine(end, ""))
    return lines


def validate_lines(lines: list[LrcLine], duration_ms: int, offset_ms: int = 0) -> list[dict]:
    warnings: list[dict] = []
    text_lines = [line for line in lines if line.text]
    if not text_lines:
        return [warning("empty", "O LRC não tem nenhuma linha com texto.")]
    if len(text_lines) < 5:
        warnings.append(warning("few_lines", f"Só {len(text_lines)} linhas com texto. Confira se a letra está completa."))
    if text_lines[0].start_ms + offset_ms > 60_000:
        warnings.append(warning("late_start", "A primeira linha começa depois de 1 minuto de vídeo. Confira o offset."))

    for i, line in enumerate(lines):
        if i > 0 and line.start_ms == lines[i - 1].start_ms:
            warnings.append(warning("same_time", f"As linhas {i - 1} e {i} começam no mesmo tempo.", i))
        if line.start_ms + offset_ms >= duration_ms:
            warnings.append(warning("after_end", f"A linha {i} começa depois do fim do vídeo.", i))
        if i > 0 and lines[i - 1].text and line.start_ms - lines[i - 1].start_ms > LONG_GAP_MS:
            gap_s = (line.start_ms - lines[i - 1].start_ms) / 1000
            warnings.append(
                warning(
                    "long_gap",
                    f"A linha {i - 1} fica destacada por {gap_s:.0f} s. "
                    "Se for um trecho instrumental, adicione uma linha vazia.",
                    i - 1,
                )
            )
    return warnings


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]", "", text).strip()


def estimate_offset(reference: list[LrcLine], aligned: list[LrcLine]) -> tuple[int | None, int]:
    """Compara um LRC de referência (ex.: LRCLIB) com o alinhado no vídeo.

    Retorna (offset_ms sugerido para a referência, quantidade de linhas que discordam mais de 1 s).
    """
    ref = [line for line in reference if line.text]
    ali = [line for line in aligned if line.text]
    matcher = SequenceMatcher(
        a=[_normalize(line.text) for line in ref], b=[_normalize(line.text) for line in ali], autojunk=False
    )
    diffs = [
        ali[block.b + k].start_ms - ref[block.a + k].start_ms
        for block in matcher.get_matching_blocks()
        for k in range(block.size)
    ]
    if not diffs:
        return None, 0
    offset = round(median(diffs))
    return offset, sum(1 for diff in diffs if abs(diff - offset) > 1000)
