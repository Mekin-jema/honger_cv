from src.extraction.base import ExtractionResult
from src.extraction.quality import score_text_quality


def _make_result(text: str) -> ExtractionResult:
    return ExtractionResult(
        text=text, pages=1, method="text", source_filename="test.txt"
    )


def test_sufficient_text_passes() -> None:
    text = "This is a well written resume with plenty of real English words. " * 8
    quality = score_text_quality(_make_result(text))
    assert quality.is_sufficient is True
    assert quality.reasons == []
    assert quality.char_count >= 50
    assert quality.word_count >= 15
    assert quality.alpha_ratio >= 0.5


def test_low_char_count_fails() -> None:
    quality = score_text_quality(_make_result("Short text"))
    assert quality.is_sufficient is False
    assert any("char_count" in r for r in quality.reasons)


def test_low_word_count_fails() -> None:
    text = "a" * 100
    quality = score_text_quality(_make_result(text))
    assert quality.is_sufficient is False
    assert any("word_count" in r for r in quality.reasons)


def test_low_alpha_ratio_fails() -> None:
    text = "123 456 789 012 345 678 901 234 567 890 123 456 789 012 345 !@#"
    quality = score_text_quality(_make_result(text))
    assert quality.is_sufficient is False
    assert any("alpha_ratio" in r for r in quality.reasons)


def test_empty_text_fails_all() -> None:
    quality = score_text_quality(_make_result(""))
    assert quality.is_sufficient is False
    assert len(quality.reasons) == 3
    assert any("char_count" in r for r in quality.reasons)
    assert any("word_count" in r for r in quality.reasons)
    assert any("alpha_ratio" in r for r in quality.reasons)


def test_multiple_failures_reported() -> None:
    text = "12 34"
    quality = score_text_quality(_make_result(text))
    assert quality.is_sufficient is False
    assert len(quality.reasons) >= 2
