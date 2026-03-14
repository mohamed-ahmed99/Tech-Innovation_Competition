"""
api_adapter.py
--------------
FastAPI router exposing the NeuroGuard tumor detection model.
Endpoints:
  GET  /health   — liveness + readiness probe
  POST /analyze  — full tumor analysis (classification + segmentation + grad-cam)
"""
from __future__ import annotations

import logging
import io
import os
import tempfile
from pathlib import Path
from typing import Optional

import torch
from PIL import Image, UnidentifiedImageError
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import sys
sys.path.insert(0, str(Path(__file__).parent))
from inference import load_model, predict

log    = logging.getLogger(__name__)
router = APIRouter(tags=["Tumor Detection"])

_model:  Optional[torch.nn.Module] = None
_device: Optional[torch.device]    = None

SUPPORTED_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def _get_model() -> torch.nn.Module:
    """Lazy-load the model on first request."""
    global _model, _device

    if _model is not None:
        return _model

    checkpoint = os.environ.get("TUMOR_CHECKPOINT")
    if not checkpoint:
        raise RuntimeError(
            "TUMOR_CHECKPOINT environment variable not set. "
            "Point it to your best_model.pth file."
        )

    _device = torch.device(
        os.environ.get("TUMOR_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
    )
    _model = load_model(checkpoint, device=_device)
    log.info(f"Tumor detection model ready on {_device}")
    return _model


def _normalize_uploaded_image(filename: str, content_type: str | None, content: bytes) -> tuple[str, bytes]:
    """
    Normalize uploaded images into formats that the inference pipeline can load reliably.
    WebP is converted to PNG to avoid OpenCV codec issues in slim containers.
    """
    suffix = Path(filename or "scan.png").suffix.lower()

    if suffix not in SUPPORTED_SUFFIXES:
        if content_type == "image/webp":
            suffix = ".webp"
        else:
            raise HTTPException(status_code=415, detail="Unsupported file type. Upload PNG, JPG, or WEBP.")

    if suffix != ".webp":
        return suffix, content

    try:
        with Image.open(io.BytesIO(content)) as img:
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            return ".png", buffer.getvalue()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=415, detail=f"Invalid WEBP image: {exc}")


# ── Pydantic response schemas ─────────────────────────────────────────────────

class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int


class TumorAnalysisResponse(BaseModel):
    tumor_detected: bool  = Field(..., description="True if tumour probability ≥ threshold")
    confidence:     float = Field(..., ge=0.0, le=1.0, description="Tumour class probability")
    location:       str   = Field(..., description="Approximate anatomical region")
    bounding_box:   BoundingBox
    raw_scores:     dict
    heatmap_base64: Optional[str] = Field(None, description="PNG overlay as data-URI")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/health")
def health_check():
    """Liveness + readiness probe."""
    try:
        model = _get_model()
        return {"status": "ok", "device": str(_device), "model": "loaded"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/analyze", response_model=TumorAnalysisResponse)
async def analyze_scan(
    file:           UploadFile = File(...,   description="Medical scan image (PNG/JPG/WEBP)"),
    modality:       str        = Form("mri", description="mri | ct | xray"),
    threshold:      float      = Form(0.50,  description="Detection confidence threshold"),
    return_heatmap: bool       = Form(False, description="Include Grad-CAM overlay"),
):
    """
    Analyse a medical scan and return tumour detection results.
    Returns structured JSON with tumor_detected, confidence, location, bounding_box, etc.
    """
    if modality not in ("mri", "ct", "xray"):
        raise HTTPException(status_code=400, detail=f"Invalid modality: {modality}")

    content = await file.read()
    normalized_suffix, normalized_content = _normalize_uploaded_image(
        file.filename or "scan.png",
        file.content_type,
        content,
    )

    with tempfile.NamedTemporaryFile(suffix=normalized_suffix, delete=False) as tmp:
        tmp.write(normalized_content)
        tmp_path = tmp.name

    try:
        model  = _get_model()
        gradcam = bool(int(os.environ.get("TUMOR_GRADCAM", "1"))) and return_heatmap

        result = predict(
            image_path  = tmp_path,
            model       = model,
            modality    = modality,
            file_format = normalized_suffix.lstrip("."),
            threshold   = threshold,
            use_gradcam = gradcam,
            device      = _device,
        )
    except Exception as e:
        log.exception("Inference error")
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if not return_heatmap:
        result.pop("heatmap_base64", None)
    result.pop("segmentation_mask", None)

    return JSONResponse(content=result)