from dataclasses import dataclass, field


class ExtractionError(Exception):
    """Raised when a file cannot be read or parsed by an extractor."""

    def __init__(self, message: str, filename: str):
        self.filename = filename
        super().__init__(message)


@dataclass
class ExtractionResult:
    text: str
    pages: int
    method: str
    source_filename: str
    char_count: int = field(init=False)
    word_count: int = field(init=False)

    def __post_init__(self) -> None:
        self.char_count = len(self.text)
        self.word_count = len(self.text.split()) if self.text else 0
