from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        # Decode without requiring specific claims (iss, aud, etc.) to be flexible
        # Only verify signature and expiration
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM],
            options={"verify_signature": True, "verify_exp": True, "require_iss": False}
        )
        return payload
    except JWTError as e:
        print(f"JWT decode error: {str(e)}")
        return None
    except Exception as e:
        print(f"Token decode error: {str(e)}")
        return None

