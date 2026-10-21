from enum import StrEnum


class SongStatus(StrEnum):
    DRAFT = "draft"
    PROCESSING = "processing"
    WAITING_LYRICS = "waiting_lyrics"
    READY_FOR_REVIEW = "ready_for_review"
    FAILED = "failed"
    PUBLISHED = "published"
    BROKEN = "broken"


class VideoKind(StrEnum):
    TOPIC = "topic"
    OFFICIAL_AUDIO = "official_audio"
    CLIP = "clip"


class SyncSource(StrEnum):
    LRCLIB = "lrclib"
    STABLE_TS = "stable_ts"
    MANUAL = "manual"


class SyncMethod(StrEnum):
    """Como a tarefa gera o LRC: auto = LRCLIB se a duração bater, senão alinhamento."""

    AUTO = "auto"
    LRCLIB = "lrclib"
    ALIGN = "align"


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class TranslationKind(StrEnum):
    """Trecho traduzido sob demanda: uma palavra (dicionário) ou uma frase curta."""

    WORD = "word"
    PHRASE = "phrase"
