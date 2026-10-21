"""Tradução sob demanda (uma palavra ou uma frase curta) pelo Azure Translator, com cache por trecho no banco.

- Palavra: Dictionary Lookup (vários significados); se o dicionário não conhecer o termo, usa o Translate.
- Frase: Translate.
O cache é por trecho, nunca por música: a letra inteira nunca é traduzida.
"""

import hashlib
import re

import httpx
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.config import get_settings
from api.models import TranslationCache, TranslationKind

SOURCE_LANG = "en"
PROVIDER = "azure"
# Quantos significados de uma palavra entram na resposta (ex.: "flutuando, à deriva").
MAX_WORD_TRANSLATIONS = 3
SPACES = re.compile(r"\s+")


class TranslationError(Exception):
    pass


class TranslationNotConfigured(Exception):
    pass


def normalize(text: str) -> str:
    """Minúsculas, apóstrofo reto e espaços únicos (a mesma regra de normalizarConsulta no app)."""
    return SPACES.sub(" ", text.replace("‘", "'").replace("’", "'")).strip().lower()


def cache_key(kind: TranslationKind, text: str, target_lang: str) -> str:
    return hashlib.sha256(f"{kind}|{SOURCE_LANG}|{target_lang}|{normalize(text)}".encode()).hexdigest()


def _post(path: str, text: str) -> list[dict]:
    settings = get_settings()
    headers = {
        "Ocp-Apim-Subscription-Key": settings.azure_translator_key,
        "Content-Type": "application/json; charset=UTF-8",
    }
    if settings.azure_translator_region:
        headers["Ocp-Apim-Subscription-Region"] = settings.azure_translator_region
    try:
        response = httpx.post(
            f"{settings.azure_translator_endpoint.rstrip('/')}{path}",
            params={"api-version": "3.0", "from": SOURCE_LANG, "to": settings.translation_target_lang},
            headers=headers,
            json=[{"Text": text}],
            timeout=10,
        )
    except httpx.HTTPError as exc:
        raise TranslationError(f"Falha ao acessar o Azure Translator: {exc}") from exc
    if response.status_code != 200:
        raise TranslationError(f"O Azure Translator respondeu {response.status_code}: {_error_message(response)}")
    return response.json()


def _error_message(response: httpx.Response) -> str:
    try:
        return response.json()["error"]["message"]
    except (ValueError, KeyError, TypeError):
        return response.text[:300]


def lookup_word(text: str) -> str | None:
    """Até MAX_WORD_TRANSLATIONS significados distintos, do mais provável ao menos provável. None se não houver."""
    try:
        translations = _post("/dictionary/lookup", text)[0]["translations"]
    except (IndexError, KeyError, TypeError) as exc:
        raise TranslationError("Resposta inesperada do Azure Translator (dicionário).") from exc
    meanings: list[str] = []
    for item in sorted(translations, key=lambda t: t.get("confidence", 0), reverse=True):
        target = (item.get("displayTarget") or "").strip()
        if target and target.lower() not in (m.lower() for m in meanings):
            meanings.append(target)
        if len(meanings) == MAX_WORD_TRANSLATIONS:
            break
    return ", ".join(meanings) or None


def translate_text(text: str) -> str:
    try:
        return _post("/translate", text)[0]["translations"][0]["text"]
    except (IndexError, KeyError, TypeError) as exc:
        raise TranslationError("Resposta inesperada do Azure Translator.") from exc


def translate(db: Session, kind: TranslationKind, text: str) -> tuple[str, bool]:
    """Devolve (tradução, veio_do_cache). Só chama a Azure se o trecho ainda não estiver no cache."""
    settings = get_settings()
    if not settings.azure_translator_key:
        raise TranslationNotConfigured()
    target_lang = settings.translation_target_lang
    key = cache_key(kind, text, target_lang)

    cached = db.get(TranslationCache, key)
    if cached is not None:
        return cached.translation, True

    translation = (lookup_word(text) if kind == TranslationKind.WORD else None) or translate_text(text)
    db.add(
        TranslationCache(
            key_hash=key,
            kind=kind,
            source_lang=SOURCE_LANG,
            target_lang=target_lang,
            source_text=normalize(text),
            translation=translation,
            provider=PROVIDER,
        )
    )
    try:
        db.commit()
    except IntegrityError:
        # Outro pedido salvou o mesmo trecho ao mesmo tempo: a tradução já está no cache.
        db.rollback()
    return translation, False
