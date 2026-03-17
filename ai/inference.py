"""
inference.py
------------
Production inference pipeline.

Responsibilities:
  1. Load a single image (any modality, any format)
  2. Run the tumour detection model
  3. Generate a Grad-CAM heatmap for explainability
  4. Extract a bounding box from the segmentation mask
  5. Map the bounding box to an anatomical region label
  6. Return an API-ready JSON-serialisable dict:

        {
            "tumor_detected": true,
            "confidence": 0.91,
            "location": "left temporal lobe",
            "bounding_box": {"x": 84, "y": 112, "w": 60, "h": 48},
            "segmentation_mask": [[0, 0, 1, ...], ...],   # (H×W) binary
            "heatmap_base64": "data:image/png;base64,..."
        }

Usage
-----
    python inference.py --image scan.png --checkpoint checkpoints/best_model.pth
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import logging
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from config import cfg
from data.dataset import load_image, get_transforms
from models.tumor_detector import build_model

log = logging.getLogger(__name__)


# ── Anatomical region mapper ───────────────────────────────────────────────────

_BRAIN_QUADRANT_MAP = {
    (0, 0): "left frontal lobe",
    (0, 1): "right frontal lobe",
    (1, 0): "left parietal lobe",
    (1, 1): "right parietal lobe",
    (2, 0): "left temporal lobe",
    (2, 1): "right temporal lobe",
    (3, 0): "left occipital lobe",
    (3, 1): "right occipital lobe",
}


def bbox_to_region(
    bbox: Dict[str, int],
    image_size: Tuple[int, int] = (224, 224),
    modality: str = "mri",
) -> str:
    """
    Map a bounding box centre to an approximate anatomical region name.
    This is a coarse heuristic based on image quadrant — a production
    system would overlay a registered brain atlas.
    """
    if bbox["w"] == 0 or bbox["h"] == 0:
        return "undetermined"

    H, W     = image_size
    cx       = bbox["x"] + bbox["w"] / 2
    cy       = bbox["y"] + bbox["h"] / 2

    if modality == "mri":
        row = min(int(cy / H * 4), 3)   # 0=top … 3=bottom
        col = 0 if cx < W / 2 else 1   # 0=left, 1=right
        return _BRAIN_QUADRANT_MAP.get((row, col), "cerebral region")

    # Generic quadrant label for CT / X-ray
    v = "upper" if cy < H / 2 else "lower"
    h = "left"  if cx < W / 2 else "right"
    return f"{v} {h} quadrant"


# ── Grad-CAM ───────────────────────────────────────────────────────────────────

class GradCAM:
    """
    Gradient-weighted Class Activation Mapping.
    Produces a spatial attention heatmap indicating which image regions
    most influenced the classification decision.

    target_layer: name of the Conv2d layer to hook (e.g. "enc6.0.block.2.0")
    """

    def __init__(self, model: torch.nn.Module, target_layer_name: str):
        self.model       = model
        self.activations : Optional[torch.Tensor] = None
        self.gradients   : Optional[torch.Tensor] = None
        self._hook_layer(target_layer_name)

    def _hook_layer(self, name: str):
        for n, m in self.model.named_modules():
            if n == name:
                m.register_forward_hook(self._save_activation)
                m.register_full_backward_hook(self._save_gradient)
                log.debug(f"GradCAM hook registered on '{n}'")
                return
        log.warning(f"GradCAM: layer '{name}' not found — heatmap disabled")

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(
        self,
        image_tensor: torch.Tensor,   # (1, 3, H, W)
        target_class: int = 1,
    ) -> np.ndarray:
        """Return a (H, W) float heatmap in [0, 1]."""
        self.model.zero_grad()
        out   = self.model(image_tensor)
        score = out["probabilities"][0, target_class]
        score.backward()

        if self.activations is None or self.gradients is None:
            return np.zeros(image_tensor.shape[2:], dtype=np.float32)

        weights = self.gradients.mean(dim=[2, 3], keepdim=True)   # (1, C, 1, 1)
        cam     = (weights * self.activations).sum(dim=1, keepdim=True)  # (1, 1, h, w)
        cam     = F.relu(cam)
        cam     = F.interpolate(
            cam, size=image_tensor.shape[2:], mode="bilinear", align_corners=False
        )
        cam = cam.squeeze().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam.astype(np.float32)


# ── Bounding box extraction ────────────────────────────────────────────────────

def extract_bounding_box(
    mask: np.ndarray,
    min_area: int = 100,
) -> Dict[str, int]:
    """
    Find the largest connected component in a binary mask
    and return its bounding box as {x, y, w, h}.
    Returns zeros if no valid region is found.
    """
    binary = (mask > 0.5).astype(np.uint8)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return {"x": 0, "y": 0, "w": 0, "h": 0}

    largest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(largest) < min_area:
        return {"x": 0, "y": 0, "w": 0, "h": 0}

    x, y, w, h = cv2.boundingRect(largest)
    return {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}


# ── Heatmap overlay ────────────────────────────────────────────────────────────

def heatmap_to_base64(
    original_image: np.ndarray,   # (H, W, 3) uint8
    heatmap: np.ndarray,          # (H, W) float [0,1]
    alpha: float = 0.5,
) -> str:
    """Blend Grad-CAM heatmap onto the original image and encode as PNG base64."""
    colormap = cv2.applyColorMap(
        (heatmap * 255).astype(np.uint8), cv2.COLORMAP_JET
    )
    colormap_rgb = cv2.cvtColor(colormap, cv2.COLOR_BGR2RGB)
    overlay = (original_image * (1 - alpha) + colormap_rgb * alpha).astype(np.uint8)

    pil_img = Image.fromarray(overlay)
    buffer  = io.BytesIO()
    pil_img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


# ── Model loader ───────────────────────────────────────────────────────────────

def load_model(
    checkpoint_path: str,
    architecture: str = "efficientnet_unet",
    device: Optional[torch.device] = None,
) -> torch.nn.Module:
    """Load model weights from a checkpoint."""
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)

    if isinstance(ckpt, dict) and "model" in ckpt and isinstance(ckpt["model"], dict):
        state_dict = ckpt["model"]
    elif isinstance(ckpt, dict):
        state_dict = ckpt
    else:
        raise ValueError("Unsupported checkpoint format: expected dict or dict['model']")

    # Legacy production checkpoints can be classifier-only EfficientNet weights
    # (encoder.* + classifier.*) that do not include UNet decoder heads.
    has_legacy_encoder = any(k.startswith("encoder.") for k in state_dict)
    has_unet_encoder = any(k.startswith("enc0.") for k in state_dict)
    has_decoder_heads = any(k.startswith("dec") or k.startswith("seg_head.") for k in state_dict)

    resolved_architecture = architecture
    if architecture == "efficientnet_unet" and has_legacy_encoder and not has_unet_encoder and not has_decoder_heads:
        resolved_architecture = "efficientnet"

    model = build_model(architecture=resolved_architecture, num_classes=2, pretrained=False)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    log.info(
        "Model loaded from '%s' (epoch %s, architecture=%s)",
        checkpoint_path,
        ckpt.get("epoch", "?"),
        resolved_architecture,
    )
    return model


# ── Main inference function ────────────────────────────────────────────────────

def predict(
    image_path: str,
    model: torch.nn.Module,
    modality: str = "mri",
    file_format: str = "png",
    image_size: Tuple[int, int] = (224, 224),
    threshold: float = 0.50,
    use_gradcam: bool = True,
    device: Optional[torch.device] = None,
    gradcam_layer: str = "enc6.0",
) -> Dict:
    """
    Run full inference on a single image.

    Returns
    -------
    dict  — API-ready result matching the schema:
        {
            "tumor_detected": bool,
            "confidence": float,          # probability of tumour class
            "location": str,              # anatomical region name
            "bounding_box": {x, y, w, h},
            "segmentation_mask": list[list[int]],
            "heatmap_base64": str,        # PNG overlay as data-URI
            "raw_scores": {no_tumor, tumor}
        }
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # ── Pre-process ────────────────────────────────────────────────────────────
    raw_image     = load_image(image_path, image_size, modality, file_format)  # uint8 (H,W,3)
    transform     = get_transforms("val", image_size)
    image_tensor  = transform(raw_image).unsqueeze(0).to(device)                # (1,3,H,W)

    # ── Forward pass ───────────────────────────────────────────────────────────
    gradcam_map = np.zeros(image_size, dtype=np.float32)

    if use_gradcam:
        gcam    = GradCAM(model, gradcam_layer)
        model.train()                # enable gradients for GradCAM
        gradcam_map = gcam.generate(image_tensor, target_class=1)
        model.eval()
        with torch.no_grad():
            out = model(image_tensor)
    else:
        with torch.no_grad():
            out = model(image_tensor)

    probs       = out["probabilities"][0].cpu()          # (2,)
    tumor_prob  = float(probs[1].item())
    detected    = tumor_prob >= threshold

    # ── Segmentation mask ──────────────────────────────────────────────────────
    if "mask_probs" in out:
        mask_np = out["mask_probs"][0, 0].cpu().numpy()     # (H, W)
    else:
        # Fallback: threshold Grad-CAM heatmap as proxy mask
        mask_np = (gradcam_map > 0.5).astype(np.float32)

    binary_mask = (mask_np > 0.5).astype(np.uint8)

    # ── Bounding box & location ────────────────────────────────────────────────
    bbox   = extract_bounding_box(binary_mask, min_area=cfg.inference.bbox_min_area)
    region = bbox_to_region(bbox, image_size, modality) if detected else "none"

    # ── Heatmap overlay ────────────────────────────────────────────────────────
    heatmap_b64 = (
        heatmap_to_base64(raw_image, gradcam_map)
        if use_gradcam and detected
        else ""
    )

    # ── Compose result ─────────────────────────────────────────────────────────
    result = {
        "tumor_detected":    bool(detected),
        "confidence":        round(tumor_prob, 4),
        "location":          region,
        "bounding_box":      bbox,
        "segmentation_mask": binary_mask.tolist(),   # 2D list, easy to JSON-serialise
        "heatmap_base64":    heatmap_b64,
        "raw_scores": {
            "no_tumor": round(float(probs[0].item()), 4),
            "tumor":    round(tumor_prob, 4),
        },
    }

    return result


# ── Convenience wrapper for batch inference ────────────────────────────────────

def predict_batch(
    image_paths: list[str],
    model: torch.nn.Module,
    **kwargs,
) -> list[Dict]:
    """Run predict() on a list of image paths. Returns a list of result dicts."""
    return [predict(p, model, **kwargs) for p in image_paths]


# ── CLI ────────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Run tumour detection on a single image")
    p.add_argument("--image",        required=True,  help="Path to input image")
    p.add_argument("--checkpoint",   required=True,  help="Path to .pth checkpoint")
    p.add_argument("--modality",     default="mri",  choices=["mri", "ct", "xray"])
    p.add_argument("--file_format",  default="png",  choices=["png", "jpg", "nifti"])
    p.add_argument("--architecture", default="efficientnet_unet")
    p.add_argument("--threshold",    type=float, default=0.5)
    p.add_argument("--no_gradcam",   action="store_true")
    p.add_argument("--output",       default=None, help="Save JSON result to this file")
    return p.parse_args()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(message)s")
    args = parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model  = load_model(args.checkpoint, args.architecture, device)

    result = predict(
        image_path   = args.image,
        model        = model,
        modality     = args.modality,
        file_format  = args.file_format,
        threshold    = args.threshold,
        use_gradcam  = not args.no_gradcam,
        device       = device,
    )

    # Omit the large base64 / mask from console print
    console_result = {k: v for k, v in result.items()
                      if k not in ("heatmap_base64", "segmentation_mask")}
    print(json.dumps(console_result, indent=2))

    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\nFull result saved to {args.output}")
