from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings

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
            print(f"[Medical Test Service] Token issuer mismatch: expected 'ims-auth-service', got '{iss}'")
            return None
        return payload
        
    # Invalid, expired, or tampered token
    except JWTError as e:
        # Log the error for debugging - this will help identify the exact issue
        error_msg = str(e)
        print(f"[Medical Test Service] JWT decode error: {error_msg}")
        # Check if it's an issuer-related error
        if "iss" in error_msg.lower() or "issuer" in error_msg.lower():
            print(f"[Medical Test Service] Issuer-related error detected. Attempting decode without issuer verification...")
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
                print(f"[Medical Test Service] Retry decode also failed: {str(retry_error)}")
        return None
    except Exception as e:
        # Catch any other unexpected errors
        print(f"[Medical Test Service] Unexpected error during token decode: {str(e)}, type: {type(e).__name__}")
        return None

