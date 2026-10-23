import hashlib

from src.auth.base import BaseAuthProvider
from src.config import settings


class EnvAuthProvider(BaseAuthProvider):
    """Validates API keys against the API_KEYS environment variable.

    Keys are stored as a comma-separated list in the env var.
    This is suitable for development and single-service deployments.
    """

    def __init__(self) -> None:
        self._valid_keys: set[str] = set(settings.api_keys_list)

    async def validate_key(self, api_key: str) -> bool:
        return api_key in self._valid_keys

    async def get_key_identity(self, api_key: str) -> str:
        return hashlib.sha256(api_key.encode()).hexdigest()[:16]
