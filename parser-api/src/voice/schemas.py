from pydantic import BaseModel, ConfigDict, Field


class VoiceTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1, max_length=600)
    answer: str = Field(min_length=1, max_length=1_200)


class VoiceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=2, max_length=600)
    context: str = Field(min_length=20, max_length=40_000)
    history: list[VoiceTurn] = Field(default_factory=list, max_length=6)
