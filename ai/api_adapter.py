from __future__ import annotations

import io
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

import torch
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from inference import load_model, predict

log     = logging.getLogger(__name__)
router  = APIRouter(tags=["Tumor Detection"])


_model  : Optional[torch.nn.Module] = None
_device : Optional[torch.device]    = None


def _get_model() -> torch.nn.Module:
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


# ── Pydantic response schema ───────────────────────────────────────────────────

class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int


class TumorAnalysisResponse(BaseModel):
    tumor_detected:   bool  = Field(..., description="True if tumour probability ≥ threshold")
    confidence:       float = Field(..., ge=0.0, le=1.0, description="Tumour class probability")
    location:         str   = Field(..., description="Approximate anatomical region")
    bounding_box:     BoundingBox
    raw_scores:       dict
    heatmap_base64:   Optional[str] = Field(None, description="PNG overlay as data-URI")


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
    file:         UploadFile = File(...,   description="Medical scan image (PNG/JPG)"),
    modality:     str        = Form("mri", description="mri | ct | xray"),
    threshold:    float      = Form(0.50,  description="Detection confidence threshold"),
    return_heatmap: bool     = Form(False, description="Include Grad-CAM overlay in response"),
):
    """
    Analyse a medical scan and return tumour detection results.

    Returns the same JSON schema as predict() in inference.py, minus
    the raw segmentation mask (too large for API responses).
    """
    # Validate modality
    if modality not in ("mri", "ct", "xray"):
        raise HTTPException(status_code=400, detail=f"Invalid modality: {modality}")

    # Validate file type
    suffix = Path(file.filename or "scan.png").suffix.lower()
    if suffix not in (".png", ".jpg", ".jpeg"):
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Upload PNG or JPG.",
        )

    # Save upload to a temp file (inference.py needs a file path)
    content = await file.read()
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        model   = _get_model()
        gradcam = bool(int(os.environ.get("TUMOR_GRADCAM", "1"))) and return_heatmap

        result = predict(
            image_path  = tmp_path,
            model       = model,
            modality    = modality,
            file_format = suffix.lstrip("."),
            threshold   = threshold,
            use_gradcam = gradcam,
            device      = _device,
        )
    except Exception as e:
        log.exception("Inference error")
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    # Strip large fields unless requested
    if not return_heatmap:
        result.pop("heatmap_base64", None)
    result.pop("segmentation_mask", None)   # always omit (use /analyze/mask for this)

    return JSONResponse(content=result)


@router.post("/analyze/mask")
async def analyze_scan_with_mask(
    file:     UploadFile = File(...),
    modality: str        = Form("mri"),
    threshold: float     = Form(0.50),
):

    content = await file.read()
    suffix  = Path(file.filename or "scan.png").suffix.lower()

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        model  = _get_model()
        result = predict(
            image_path  = tmp_path,
            model       = model,
            modality    = modality,
            file_format = suffix.lstrip("."),
            threshold   = threshold,
            use_gradcam = False,
            device      = _device,
        )
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return JSONResponse(content=result)


# ── Minimal standalone server (for testing without an existing backend) ────────

if __name__ == "__main__":
    import uvicorn
    from fastapi import FastAPI

    app = FastAPI(title="Tumour Detection API", version="1.0.0")
    app.include_router(router, prefix="/api/v1/tumor")

    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="info")