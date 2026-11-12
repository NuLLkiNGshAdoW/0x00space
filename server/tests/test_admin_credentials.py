import pytest

from app.services.admin_credentials import hash_password, normalize_username, verify_password


def test_password_hashes_use_unique_salts_and_verify_correctly():
    first = hash_password("secure-test-password")
    second = hash_password("secure-test-password")

    assert first != second
    assert verify_password("secure-test-password", first)
    assert not verify_password("wrong-password", first)
    assert not verify_password("secure-test-password", "unsupported$1$bad$hash")


@pytest.mark.parametrize("password", ["short", "x" * 257])
def test_password_hash_rejects_out_of_range_passwords(password):
    with pytest.raises(ValueError):
        hash_password(password)


def test_username_normalization_is_case_insensitive_and_rejects_invalid_values():
    assert normalize_username("  Test.Admin-01  ") == "test.admin-01"
    with pytest.raises(ValueError):
        normalize_username("invalid username")
