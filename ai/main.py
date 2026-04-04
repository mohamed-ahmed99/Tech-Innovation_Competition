"""
NeuroGuard AI Service — Production FastAPI entry point.
Serves the tumor detection model via REST API.
"""
import os
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api_adapter import router as tumor_router
from digital_twin.router import router as digital_twin_router

logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(name)s  %(message)s")

app = FastAPI(
    title="NeuroGuard AI Service",
    version="1.0.0",
    description="Tumor detection inference API",
)

# Allow the Node.js backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tumor_router, prefix="/api/v1/tumor")
app.include_router(digital_twin_router, prefix="/api/v1/digital-twin")


@app.get("/")
def root():
    return {"service": "NeuroGuard AI", "status": "running"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("AI_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, log_level="info")