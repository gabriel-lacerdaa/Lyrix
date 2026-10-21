"""Rota pública usada pelo app: tradução sob demanda de uma palavra ou de uma frase curta."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.database import get_db
from api.schemas.translate import TranslateRequest, TranslateResponse
from api.services import translation

router = APIRouter(prefix="/translate", tags=["app"])


@router.post("", response_model=TranslateResponse)
def translate(body: TranslateRequest, db: Session = Depends(get_db)) -> TranslateResponse:
    try:
        result, cached = translation.translate(db, body.kind, body.text)
    except translation.TranslationNotConfigured as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Tradução indisponível: AZURE_TRANSLATOR_KEY não configurada."
        ) from exc
    except translation.TranslationError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
    return TranslateResponse(text=body.text, kind=body.kind, translation=result, cached=cached)
