from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.bootstrap import ensure_admin_user, ensure_schema
from app.database import SessionLocal
from app.routers import admin_accounts, admin_clients, admin_mis, auth, client_mis, public_payments


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_schema()
    db = SessionLocal()
    try:
        ensure_admin_user(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Basaveshwara Tours and Travels API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin_clients.router)
app.include_router(admin_accounts.router)
app.include_router(admin_mis.router)
app.include_router(client_mis.router)
app.include_router(public_payments.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
