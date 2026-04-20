import os
from fastapi import Request
from fastapi.responses import JSONResponse
try:
    from jose import jwt, JWTError
except ImportError:
    jwt = None

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "super-secret-key")

async def verify_jwt(request: Request, call_next):
    path = request.url.path
    if path in ["/health", "/docs", "/openapi.json"] or path.startswith("/metrics"):
        return await call_next(request)
        
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"detail": "Missing token"})
        
    if jwt is None:
        return JSONResponse(status_code=500, content={"detail": "python-jose not installed"})
        
    token = auth_header.split(" ")[1]
    try:
        # verify_aud=False because Supabase issues multiple audiences sometimes or custom aud.
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        request.state.user = payload
    except JWTError:
        return JSONResponse(status_code=401, content={"detail": "Invalid token"})
        
    return await call_next(request)
