"""
Security and Authentication Utilities
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        if not token:
            print("[Patient Service] Empty token provided to decode_access_token")
            return None
        
        print(f"[Patient Service] Attempting to decode token. SECRET_KEY (first 20): {settings.SECRET_KEY[:20]}..., ALGORITHM: {settings.ALGORITHM}")
        
        # Try to decode with minimal requirements - be as permissive as possible
        # First attempt: standard decode with signature and expiration verification
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[settings.ALGORITHM],
                options={
                    "verify_signature": True, 
                    "verify_exp": True, 
                    "require_iss": False,
                    "require_aud": False,
                    "require_sub": False,
                    "verify_iss": False,
                    "verify_aud": False
                }
            )
            print(f"[Patient Service] Token decoded successfully on first attempt. Claims: {list(payload.keys())}")
            return payload
        except JWTError as e:
            error_msg = str(e).lower()
            print(f"[Patient Service] First decode attempt failed: {str(e)}")
            # If it's an 'iss' related error, try with even more relaxed options
            if "iss" in error_msg or "mandatory" in error_msg or "expired" in error_msg or "signature" in error_msg:
                try:
                    print("[Patient Service] Attempting second decode with relaxed options...")
                    # Try with all claim verification disabled except signature and exp
                    payload = jwt.decode(
                        token,
                        settings.SECRET_KEY,
                        algorithms=[settings.ALGORITHM],
                        options={
                            "verify_signature": True,
                            "verify_exp": True,
                            "require_iss": False,
                            "require_aud": False,
                            "require_sub": False,
                            "verify_iss": False,
                            "verify_aud": False,
                            "verify_iat": False,
                            "verify_nbf": False
                        }
                    )
                    print(f"[Patient Service] Token decoded successfully on second attempt. Claims: {list(payload.keys())}")
                    return payload
                except Exception as retry_error:
                    print(f"[Patient Service] Second decode attempt also failed: {str(retry_error)}")
                    pass
            
            # Log the error for debugging
            print(f"[Patient Service] JWT decode error (final): {str(e)}")
            return None
            
    except Exception as e:
        print(f"[Patient Service] Token decode exception: {str(e)}, type: {type(e).__name__}")
        return None

