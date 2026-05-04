from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ClientCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    office_phone: str | None = Field(default=None, max_length=128)
    contracting_first_name: str = Field(min_length=1, max_length=128)
    contracting_last_name: str = Field(min_length=1, max_length=128)


class ClientUpdate(BaseModel):
    company_name: str | None = None
    phone: str | None = None
    office_phone: str | None = None
    contracting_first_name: str | None = None
    contracting_last_name: str | None = None


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    email: str
    phone: str | None
    office_phone: str | None
    contracting_first_name: str
    contracting_last_name: str
    email_verified: bool
    password_must_change: bool
