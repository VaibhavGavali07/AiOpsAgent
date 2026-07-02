from cryptography.fernet import Fernet, InvalidToken

from app.settings import settings


class CryptoService:
    def __init__(self, key: str) -> None:
        self._fernet = Fernet(key.encode())

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, token: str) -> str:
        try:
            return self._fernet.decrypt(token.encode()).decode()
        except InvalidToken as exc:
            raise ValueError("Credential decryption failed — FERNET_KEY may have changed") from exc

    @staticmethod
    def mask(plaintext: str) -> str:
        if len(plaintext) <= 8:
            return "****"
        return f"{plaintext[:4]}…{plaintext[-4:]}"


_crypto: CryptoService | None = None


def get_crypto() -> CryptoService:
    global _crypto
    if _crypto is None:
        _crypto = CryptoService(settings.fernet_key)
    return _crypto
