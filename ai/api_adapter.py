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
from typing import Dict, Optional

import torch
from PIL import Image, UnidentifiedImageError
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import sys
sys.path.insert(0, str(Path(__file__).parent))
from inference import load_model, predict
from model_registry import checkpoint_env_map, get_available_tumor_organs, get_tumor_checkpoint_for_organ, normalize_organ_name
from organ_router import OrganRouter

log    = logging.getLogger(__name__)
router = APIRouter(tags=["Tumor Detection"])

_models: Dict[str, torch.nn.Module] = {}
_device: Optional[torch.device] = None
_organ_router = OrganRouter()

SUPPORTED_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def _get_model(organ: str = "brain") -> torch.nn.Module:
    """Lazy-load one tumor model per organ."""
    global _models, _device

    organ = normalize_organ_name(organ) or "brain"

    if organ in _models:
        return _models[organ]

    checkpoint = get_tumor_checkpoint_for_organ(organ)
    if not checkpoint:
        required_env = checkpoint_env_map().get(organ, f"checkpoint for {organ}")
        raise RuntimeError(
            f"Tumor checkpoint for organ '{organ}' is not configured. "
            f"Set {required_env}."
        )

    if _device is None:
        _device = torch.device(
            os.environ.get("TUMOR_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
        )

    _models[organ] = load_model(checkpoint, device=_device)
    log.info(f"Tumor detection model for '{organ}' ready on {_device}")
    return _models[organ]


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
    detected_organ: str   = Field(..., description="Organ selected for tumor model routing")
    organ_detection_confidence: float = Field(..., ge=0.0, le=1.0)
    organ_detection_source: str = Field(..., description="request_hint | organ_classifier | fallback_default")
    organ_detection_warning: Optional[str] = Field(None, description="Routing warning if classifier/checkpoints are missing")
    body_region:    str   = Field(..., description="Current anatomical region supported by this model")
    bounding_box:   BoundingBox
    raw_scores:     dict
    urgency_level:  str   = Field(..., description="routine | priority | urgent")
    explanation:    str   = Field(..., description="Plain-language summary of what the model found")
    treatment_options: list[str] = Field(default_factory=list, description="Non-prescriptive treatment discussion points to review with clinicians")
    expected_outlook: str = Field(..., description="General non-diagnostic outlook guidance for patient counseling")
    next_steps:     list[str] = Field(default_factory=list, description="Recommended non-diagnostic follow-up actions")
    red_flags:      list[str] = Field(default_factory=list, description="Symptoms that should trigger urgent care")
    disclaimer:     str   = Field(..., description="Safety disclaimer for non-diagnostic use")
    model_scope:    dict  = Field(default_factory=dict, description="Model capability metadata for future multimodal expansion")
    heatmap_base64: Optional[str] = Field(None, description="PNG overlay as data-URI")


def _build_clinical_guidance(result: dict, modality: str, organ: str, routing_warning: str = "") -> dict:
    """Build triage guidance while keeping the current model scoped to brain scans."""
    detected = bool(result.get("tumor_detected"))
    confidence = float(result.get("confidence", 0.0) or 0.0)

    if organ == "liver":
        red_flags = [
            "Vomiting blood or black stools",
            "Rapidly increasing abdominal swelling",
            "Severe right upper abdominal pain with fever",
            "Confusion, severe drowsiness, or jaundice worsening quickly",
        ]
    elif organ == "spinal_cord":
        red_flags = [
            "New inability to walk or sudden leg weakness",
            "Loss of bladder or bowel control",
            "Progressive numbness in legs or around groin/saddle area",
            "Severe back pain with neurological symptoms",
        ]
    elif organ == "breast":
        red_flags = [
            "Rapidly enlarging breast lump",
            "New skin dimpling, redness, or peau d'orange changes",
            "Bloody nipple discharge",
            "New hard axillary lump with pain or swelling",
        ]
    else:
        red_flags = [
            "New seizures or fainting",
            "Sudden weakness, numbness, or facial droop",
            "Severe persistent headache with vomiting",
            "New speech, vision, or confusion changes",
        ]

    if not detected:
        urgency = "routine"
        explanation = (
            f"The model did not flag a clear tumor-like pattern in this {organ} {modality.upper()} scan. "
            "This does not fully exclude disease and should be interpreted with symptoms and formal radiology review."
        )
        expected_outlook = (
            "Short-term outlook is generally reassuring from this AI screening output, "
            "but clinical follow-up remains important if symptoms continue."
        )
        next_steps = [
            "Review this result with your clinician during routine follow-up.",
            "If symptoms persist, ask for a formal radiology assessment or repeat imaging.",
            "Keep previous scans/reports for side-by-side comparison.",
        ]
        treatment_options = [
            "Observation and routine follow-up as advised by your clinician.",
            "Symptom-focused supportive care when needed.",
            "Repeat imaging only if clinically indicated.",
        ]
    elif confidence >= 0.85:
        urgency = "urgent"
        explanation = (
            f"The model flagged a high-confidence tumor-like pattern in the {organ}. "
            "This requires urgent specialist confirmation and treatment planning."
        )
        expected_outlook = (
            "Outlook depends on confirmed diagnosis, stage, and response to therapy. "
            "Earlier specialist intervention is associated with better outcomes."
        )
        next_steps = [
            "Arrange specialist review (radiology/neurology/oncology) as soon as possible.",
            "Seek same-day urgent care if any red-flag symptoms are present.",
            "Bring prior scans and clinical notes to the consultation.",
        ]
        treatment_options = [
            "Urgent multidisciplinary evaluation to confirm diagnosis.",
            "Potential options may include surgery, systemic therapy, or radiotherapy depending on final pathology.",
            "Supportive symptom management while definitive care is arranged.",
        ]
    elif confidence >= 0.60:
        urgency = "priority"
        explanation = (
            f"The model detected an intermediate-confidence suspicious pattern in the {organ}. "
            "Priority specialist follow-up is recommended to confirm whether this is clinically significant."
        )
        expected_outlook = (
            "Many intermediate-confidence findings are clarified after specialist imaging review. "
            "Timely follow-up improves decision quality and reduces risk of delayed treatment."
        )
        next_steps = [
            "Book specialist follow-up within 24-72 hours.",
            "Request a radiologist-confirmed interpretation and treatment planning advice.",
            "Track any new neurological symptoms and escalate care if they worsen.",
        ]
        treatment_options = [
            "Confirmatory imaging and specialist assessment before any definitive treatment.",
            "If confirmed, treatment may involve local or systemic options based on disease extent.",
            "Discuss risks, benefits, and alternatives with your care team.",
        ]
    else:
        urgency = "priority"
        explanation = (
            f"The model raised a low-confidence alert in the {organ}. "
            "This should be treated as a screening signal that needs clinician confirmation, not a diagnosis."
        )
        expected_outlook = (
            "Low-confidence alerts are often resolved with follow-up review, but continued monitoring is important "
            "when symptoms or risk factors are present."
        )
        next_steps = [
            "Treat this as a flagged screening result and confirm with a clinician.",
            "Consider repeat imaging or additional modalities if advised by your doctor.",
            "Do not make treatment decisions based only on this model output.",
        ]
        treatment_options = [
            "Observation plus targeted re-evaluation based on clinical judgment.",
            "Further diagnostic work-up if symptoms or physician concern persists.",
            "Conservative symptom management while awaiting confirmation.",
        ]

    return {
        "body_region": organ,
        "urgency_level": urgency,
        "explanation": explanation,
        "treatment_options": treatment_options,
        "expected_outlook": expected_outlook,
        "next_steps": next_steps,
        "red_flags": red_flags,
        "disclaimer": "This is an AI screening aid, not a medical diagnosis. A licensed clinician must confirm all findings.",
        "model_scope": {
            "active_model": f"{organ}_tumor_screening_v1",
            "supported_modalities": ["mri", "ct", "xray"],
            "supported_body_regions": get_available_tumor_organs() or ["brain"],
            "framework_ready_for_future_models": True,
            "organ_classifier_configured": bool(os.environ.get("ORGAN_CLASSIFIER_CHECKPOINT")),
            "routing_warning": routing_warning,
            "input_modality": modality,
        },
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/health")
def health_check():
    """Liveness + readiness probe."""
    try:
        _get_model("brain")
        return {
            "status": "ok",
            "device": str(_device),
            "model": "loaded",
            "available_tumor_organs": get_available_tumor_organs(),
            "organ_classifier_configured": bool(os.environ.get("ORGAN_CLASSIFIER_CHECKPOINT")),
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/analyze", response_model=TumorAnalysisResponse)
async def analyze_scan(
    file:           UploadFile = File(...,   description="Medical scan image (PNG/JPG/WEBP)"),
    modality:       str        = Form("mri", description="mri | ct | xray"),
    organ_hint:     Optional[str] = Form(None, description="Optional organ hint: brain | liver | spinal_cord | breast"),
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
        organ_decision = _organ_router.detect(normalized_content, organ_hint)
        organ = normalize_organ_name(str(organ_decision.get("organ", "brain"))) or "brain"

        try:
            model = _get_model(organ)
        except RuntimeError as model_err:
            raise HTTPException(
                status_code=503,
                detail=f"No tumor model is configured for detected organ '{organ}'. {model_err}",
            )

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

        result.update({
            "detected_organ": organ,
            "organ_detection_confidence": float(organ_decision.get("confidence", 0.0) or 0.0),
            "organ_detection_source": str(organ_decision.get("source", "unknown")),
            "organ_detection_warning": str(organ_decision.get("warning", "") or ""),
        })
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Inference error")
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if not return_heatmap:
        result.pop("heatmap_base64", None)
    result.pop("segmentation_mask", None)

    result.update(
        _build_clinical_guidance(
            result,
            modality,
            result.get("detected_organ", "brain"),
            result.get("organ_detection_warning", ""),
        )
    )

    return JSONResponse(content=result)