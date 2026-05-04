from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    """Use plain str for email: EmailStr rejects dev TLDs like `.local` (RFC special-use)."""
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def email_shape(cls, v: str) -> str:
        s = v.strip()
        if "@" not in s or s.startswith("@") or s.endswith("@") or ".." in s:
            raise ValueError("Invalid email format")
        local, _, domain = s.partition("@")
        if not local or not domain:
            raise ValueError("Invalid email format")
        return s


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
