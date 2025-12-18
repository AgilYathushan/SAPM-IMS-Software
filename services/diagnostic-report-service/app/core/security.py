from typing import Optional  # Optional type hinting
from jose import JWTError, jwt  # JWT token encoding/decoding library
from app.core.config import settings  # Application configuration

def decode_access_token(token: str) -> Optional[dict]:
    try:
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

