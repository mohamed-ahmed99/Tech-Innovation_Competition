from __future__ import annotations

import os
from typing import Dict, List, Optional

SUPPORTED_ORGANS = ("brain", "liver", "spinal_cord", "breast")

_ORGAN_ALIASES = {
    "brain": "brain",
    "cerebrum": "brain",
    "liver": "liver",
    "hepatic": "liver",
    "breast": "breast",
    "mammary": "breast",
    "mammogram": "breast",
    "spinal": "spinal_cord",
    "spinalcord": "spinal_cord",
    "spinal_cord": "spinal_cord",
    "spine": "spinal_cord",
}


def _resolve_checkpoint(primary_env_name: str) -> Optional[str]:
    primary = os.environ.get(primary_env_name)
    fallback = os.environ.get("TUMOR_CHECKPOINT")

    if primary and os.path.exists(primary):
        return primary
    if fallback and os.path.exists(fallback):
        return fallback

    # If paths do not exist, keep previous behavior of returning configured values.
    return primary or fallback


def normalize_organ_name(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    key = value.strip().lower().replace("-", "_").replace(" ", "_")
    return _ORGAN_ALIASES.get(key)


def get_tumor_checkpoint_for_organ(organ: str) -> Optional[str]:
    organ = normalize_organ_name(organ) or ""
    if organ == "brain":
        return _resolve_checkpoint("TUMOR_CHECKPOINT_BRAIN")
    if organ == "liver":
        return _resolve_checkpoint("TUMOR_CHECKPOINT_LIVER")
    if organ == "spinal_cord":
        return _resolve_checkpoint("TUMOR_CHECKPOINT_SPINAL_CORD")
    if organ == "breast":
        return _resolve_checkpoint("TUMOR_CHECKPOINT_BREAST")
    return None


def get_available_tumor_organs() -> List[str]:
    return [organ for organ in SUPPORTED_ORGANS if get_tumor_checkpoint_for_organ(organ)]


def checkpoint_env_map() -> Dict[str, str]:
    return {
        "brain": "TUMOR_CHECKPOINT_BRAIN or TUMOR_CHECKPOINT",
        "liver": "TUMOR_CHECKPOINT_LIVER or TUMOR_CHECKPOINT",
        "spinal_cord": "TUMOR_CHECKPOINT_SPINAL_CORD or TUMOR_CHECKPOINT",
        "breast": "TUMOR_CHECKPOINT_BREAST or TUMOR_CHECKPOINT",
    }
