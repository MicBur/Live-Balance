from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
from datetime import datetime, timedelta

router = APIRouter()

# In-memory session storage (simple approach)
sessions = {}  # {token: {username, expires_at}}

# Hardcoded credentials
VALID_USERNAME = "Mark-Human"
VALID_PASSWORD = "Moltsfelde1!"

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: str
    message: str

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login endpoint with hardcoded credentials"""
    if request.username == VALID_USERNAME and request.password == VALID_PASSWORD:
        # Generate session token
        token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=24)  # 24 hour session
        
        sessions[token] = {
            "username": request.username,
            "expires_at": expires_at
        }
        
        return LoginResponse(
            success=True,
            token=token,
            message="Login erfolgreich!"
        )
    else:
        raise HTTPException(status_code=401, detail="Ungültiger Benutzername oder Passwort")

@router.post("/logout")
async def logout(token: str):
    """Logout endpoint"""
    if token in sessions:
        del sessions[token]
    return {"success": True, "message": "Logout erfolgreich"}

@router.get("/verify")
async def verify_session(token: str):
    """Verify if session token is still valid"""
    if token not in sessions:
        raise HTTPException(status_code=401, detail="Ungültige Session")
    
    session = sessions[token]
    if datetime.utcnow() > session["expires_at"]:
        del sessions[token]
        raise HTTPException(status_code=401, detail="Session abgelaufen")
    
    return {"valid": True, "username": session["username"]}

def verify_token(token: str) -> bool:
    """Helper function to verify token"""
    if not token or token not in sessions:
        return False
    
    session = sessions[token]
    if datetime.utcnow() > session["expires_at"]:
        del sessions[token]
        return False
    
    return True
