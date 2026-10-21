"""Formatos de entrada e saída da rota de tradução sob demanda, usada pelo app."""

from pydantic import BaseModel, ConfigDict, Field, model_validator

from api.models import TranslationKind

# Limite do Dictionary Lookup da Azure.
MAX_WORD_LENGTH = 100
# Frase curta: até 2 linhas da letra cabem com folga.
MAX_PHRASE_LENGTH = 300


class TranslateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    text: str = Field(min_length=1, max_length=MAX_PHRASE_LENGTH, examples=["drifting"])
    kind: TranslationKind

    @model_validator(mode="after")
    def check_word(self) -> "TranslateRequest":
        if self.kind == TranslationKind.WORD and (
            len(self.text) > MAX_WORD_LENGTH or any(char.isspace() for char in self.text)
        ):
            raise ValueError(f"Uma palavra precisa ser um único termo de até {MAX_WORD_LENGTH} caracteres.")
        return self


class TranslateResponse(BaseModel):
    text: str
    kind: TranslationKind
    translation: str
    cached: bool
