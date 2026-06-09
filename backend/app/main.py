from fastapi import FastAPI
from app.routes import status

app = FastAPI()
app.include_router(status.router)