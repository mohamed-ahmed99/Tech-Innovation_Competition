from __future__ import annotations

import os
from typing import Dict, List, Optional

SUPPORTED_ORGANS = ("brain", "liver", "spinal_cord")

_ORGAN_ALIASES = {
    "brain": "brain",
    "cerebrum": "brain",
    "liver": "liver",
    "hepatic": "liver",
    "spinal": "spinal_cord",
    "spinalcord": "spinal_cord",
    "spinal_cord": "spinal_cord",
    "spine": "spinal_cord",
}


def normalize_organ_name(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    key = value.strip().lower().replace("-", "_").replace(" ", "_")
    return _ORGAN_ALIASES.get(key)


def get_tumor_checkpoint_for_organ(organ: str) -> Optional[str]:
    organ = normalize_organ_name(organ) or ""
    if organ == "brain":
        return os.environ.get("TUMOR_CHECKPOINT_BRAIN") or os.environ.get("TUMOR_CHECKPOINT")
    if organ == "liver":
        return os.environ.get("TUMOR_CHECKPOINT_LIVER") or os.environ.get("TUMOR_CHECKPOINT")
    if organ == "spinal_cord":
        return os.environ.get("TUMOR_CHECKPOINT_SPINAL_CORD") or os.environ.get("TUMOR_CHECKPOINT")
    return None


def get_available_tumor_organs() -> List[str]:
    return [organ for organ in SUPPORTED_ORGANS if get_tumor_checkpoint_for_organ(organ)]


def checkpoint_env_map() -> Dict[str, str]:
    return {
        "brain": "TUMOR_CHECKPOINT_BRAIN or TUMOR_CHECKPOINT",
        "liver": "TUMOR_CHECKPOINT_LIVER or TUMOR_CHECKPOINT",
        "spinal_cord": "TUMOR_CHECKPOINT_SPINAL_CORD or TUMOR_CHECKPOINT",
    }
