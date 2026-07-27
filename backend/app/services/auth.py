from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, Header
from passlib.context import CryptContext
from app.config import settings

ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(username: str, is_super_admin: bool = False):
    expire = datetime.utcnow() + timedelta(days=30)
    payload = {"sub": username, "is_super_admin": is_super_admin, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def verify_token(authorization: str = Header(None)):
    print("Received Authorization header:", authorization)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")

def verify_super_admin(authorization: str = Header(None)):
    payload = verify_token(authorization)
    if not payload.get("is_super_admin"):
        raise HTTPException(403, "Super admin access required")
    return payload