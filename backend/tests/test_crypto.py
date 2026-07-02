import pytest
from cryptography.fernet import Fernet

from app.llm.crypto import CryptoService


@pytest.fixture()
def crypto():
    key = Fernet.generate_key().decode()
    return CryptoService(key)


def test_encrypt_decrypt_roundtrip(crypto):
    original = "sk-test-1234567890abcdef"
    token = crypto.encrypt(original)
    assert token != original
    assert crypto.decrypt(token) == original


def test_different_keys_cannot_decrypt():
    key1 = Fernet.generate_key().decode()
    key2 = Fernet.generate_key().decode()
    svc1 = CryptoService(key1)
    svc2 = CryptoService(key2)
    encrypted = svc1.encrypt("secret-data")
    with pytest.raises(ValueError, match="decryption failed"):
        svc2.decrypt(encrypted)


def test_mask_short():
    assert CryptoService.mask("abc") == "****"


def test_mask_long():
    masked = CryptoService.mask("sk-1234567890ABCDEFGHIJ")
    assert masked.startswith("sk-1")
    assert masked.endswith("GHIJ")
    assert "…" in masked


def test_mask_exactly_8():
    assert CryptoService.mask("12345678") == "****"


def test_encrypt_produces_string(crypto):
    token = crypto.encrypt("any-key")
    assert isinstance(token, str)
    assert len(token) > 0
