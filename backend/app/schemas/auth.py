from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    password_must_change: bool
    email_verified: bool


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=10)


class NewPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str
