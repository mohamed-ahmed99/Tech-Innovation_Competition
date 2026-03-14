from __future__ import annotations

import io
import os
from typing import Dict, Optional

import torch
from PIL import Image
from torchvision import models, transforms

from model_registry import SUPPORTED_ORGANS, normalize_organ_name


class OrganRouter:
    """
    Detect the target organ before tumor inference.

    Priority:
    1) `organ_hint` from request (if valid)
    2) optional trained organ classifier checkpoint
    3) safe fallback to `brain` to preserve current product behavior
    """

    def __init__(self):
        self._classifier: Optional[torch.nn.Module] = None
        self._device: Optional[torch.device] = None
        self._label_order = list(SUPPORTED_ORGANS)
        self._transform = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )

    def _checkpoint(self) -> Optional[str]:
        return os.environ.get("ORGAN_CLASSIFIER_CHECKPOINT")

    def _load_classifier(self) -> Optional[torch.nn.Module]:
        checkpoint = self._checkpoint()
        if not checkpoint:
            return None

        if self._classifier is not None:
            return self._classifier

        self._device = torch.device(os.environ.get("ORGAN_DEVICE", "cuda" if torch.cuda.is_available() else "cpu"))

        model = models.resnet18(weights=None)
        model.fc = torch.nn.Linear(model.fc.in_features, len(self._label_order))

        state = torch.load(checkpoint, map_location=self._device)
        if isinstance(state, dict) and "model" in state:
            model.load_state_dict(state["model"])
        else:
            model.load_state_dict(state)

        model.to(self._device)
        model.eval()
        self._classifier = model
        return self._classifier

    def detect(self, image_bytes: bytes, organ_hint: Optional[str] = None) -> Dict[str, object]:
        hint = normalize_organ_name(organ_hint)
        if hint:
            return {
                "organ": hint,
                "confidence": 1.0,
                "source": "request_hint",
                "warning": "",
            }

        model = self._load_classifier()
        if model is None:
            return {
                "organ": "brain",
                "confidence": 0.34,
                "source": "fallback_default",
                "warning": "Organ classifier not configured yet. Set ORGAN_CLASSIFIER_CHECKPOINT for automatic organ routing.",
            }

        if self._device is None:
            self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = self._transform(image).unsqueeze(0).to(self._device)

        with torch.no_grad():
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1)[0].detach().cpu()

        idx = int(torch.argmax(probs).item())
        organ = self._label_order[idx]
        confidence = float(probs[idx].item())

        return {
            "organ": organ,
            "confidence": round(confidence, 4),
            "source": "organ_classifier",
            "warning": "",
        }
