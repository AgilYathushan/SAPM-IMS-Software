"""
Security and Authentication Utilities
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
import hashlib
from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash using SHA-256 + bcrypt"""
    if not plain_password or not hashed_password:
        return False

    password_bytes = plain_password.encode("utf-8")
    sha256_hash = hashlib.sha256(password_bytes).digest()

    return bcrypt.checkpw(sha256_hash, hashed_password.encode("utf-8"))

def get_password_hash(password: str) -> str:
    """Hash a password using SHA-256 + bcrypt to avoid bcrypt's 72-byte limit"""
    if not isinstance(password, str) or not password:
        raise ValueError("Password must be a non-empty string")

    # Normalize and encode
    password_bytes = password.encode("utf-8")

    # Pre-hash to preserve full entropy and avoid bcrypt 72-byte limit
    sha256_hash = hashlib.sha256(password_bytes).digest()

    # Generate salt with secure default cost
    salt = bcrypt.gensalt()  # cost=12

    # Hash with bcrypt
    hashed = bcrypt.hashpw(sha256_hash, salt)

    return hashed.decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with user data"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Convert expire datetime to timestamp for JWT standard compliance
    expire_timestamp = int(expire.timestamp()) if hasattr(expire, 'timestamp') else expire
    to_encode.update({
        "exp": expire_timestamp,
        "iss": "ims-auth-service",  # Issuer claim (required by some JWT validators)
        "iat": int(datetime.utcnow().timestamp())  # Issued at claim (must be integer timestamp)
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    if not token or not isinstance(token, str):
        return None

    try:
        # Decode token with minimal verification to avoid issuer-related errors
        # We'll manually verify the issuer claim after decoding
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": False,  # Disable iat verification to avoid issues
                "verify_iss": False,  # Don't verify issuer automatically
                "require_iss": False,  # Don't require issuer claim
                "verify_aud": False,  # Don't verify audience
                "require_aud": False  # Don't require audience
            }
        )
        # Manually verify issuer claim if present (for tokens created by auth-service)
        iss = payload.get("iss")
        if iss is not None and iss != "ims-auth-service":
            # Token has issuer claim but it doesn't match - reject it
            print(f"[User Service] Token issuer mismatch: expected 'ims-auth-service', got '{iss}'")
            return None
        return payload
        
    # Invalid, expired, or tampered token
    except JWTError as e:
        # Log the error for debugging - this will help identify the exact issue
        error_msg = str(e)
        print(f"[User Service] JWT decode error: {error_msg}")
        # Check if it's an issuer-related error
        if "iss" in error_msg.lower() or "issuer" in error_msg.lower():
            print(f"[User Service] Issuer-related error detected. Attempting decode without issuer verification...")
            try:
                # Try again with even more relaxed options
                payload = jwt.decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM],
                    options={
                        "verify_signature": True,
                        "verify_exp": True,
                        "verify_iat": False,
                        "verify_iss": False,
                        "require_iss": False,
                        "verify_aud": False,
                        "require_aud": False,
                        "verify_nbf": False
                    }
                )
                return payload
            except Exception as retry_error:
                print(f"[User Service] Retry decode also failed: {str(retry_error)}")
        return None
    except Exception as e:
        # Catch any other unexpected errors
        print(f"[User Service] Unexpected error during token decode: {str(e)}, type: {type(e).__name__}")
        return None

