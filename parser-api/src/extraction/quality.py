from dataclasses import dataclass, field

from src.extraction.base import ExtractionResult
from src.logging import get_logger

logger = get_logger(__name__)

MIN_CHAR_COUNT = 50
MIN_WORD_COUNT = 15
MIN_ALPHA_RATIO = 0.5


@dataclass
class TextQuality:
    char_count: int
    word_count: int
    alpha_ratio: float
    is_sufficient: bool
    reasons: list[str] = field(default_factory=list)


def score_text_quality(result: ExtractionResult) -> TextQuality:
    reasons: list[str] = []

    if result.char_count < MIN_CHAR_COUNT:
        reasons.append(f"char_count: {result.char_count} < {MIN_CHAR_COUNT}")

    if result.word_count < MIN_WORD_COUNT:
        reasons.append(f"word_count: {result.word_count} < {MIN_WORD_COUNT}")

    if len(result.text) == 0:
        alpha_ratio = 0.0
    else:
        alpha_count = sum(1 for c in result.text if c.isalpha())
        alpha_ratio = alpha_count / len(result.text)

    if alpha_ratio < MIN_ALPHA_RATIO:
        reasons.append(f"alpha_ratio: {alpha_ratio:.2f} < {MIN_ALPHA_RATIO:.2f}")

    is_sufficient = len(reasons) == 0

    quality = TextQuality(
        char_count=result.char_count,
        word_count=result.word_count,
        alpha_ratio=alpha_ratio,
        is_sufficient=is_sufficient,
        reasons=reasons,
    )

    logger.info(
        "quality_check",
        is_sufficient=is_sufficient,
        char_count=result.char_count,
        word_count=result.word_count,
        alpha_ratio=round(alpha_ratio, 2),
        **({"reasons": reasons} if reasons else {}),
    )

    return quality


def is_text_sufficient(result: ExtractionResult) -> bool:
    return score_text_quality(result).is_sufficient
