"""
prepare_dataset.py
------------------
Convert raw medical dataset folders into the project-ready layout:

output_dir/
  images/
  masks/           # optional if masks are found
  labels.csv       # filename,label

Supports common image formats and optional NIfTI volumes (.nii/.nii.gz).

Example:
  python prepare_dataset.py \
    --source_dir /content/data/liver_raw \
    --output_dir /content/data/liver_prepared
"""

from __future__ import annotations

import argparse
import csv
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional

import cv2
import numpy as np

try:
    import nibabel as nib
    NIBABEL_AVAILABLE = True
except Exception:
    NIBABEL_AVAILABLE = False


logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(message)s")
log = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp", ".nii", ".nii.gz",
}
MASK_HINTS = ("mask", "seg", "label", "lesion", "tumor", "tumour")
POSITIVE_HINTS = ("tumor", "tumour", "cancer", "lesion", "malignant", "metast")


def _is_nifti(path: Path) -> bool:
    name = path.name.lower()
    return name.endswith(".nii") or name.endswith(".nii.gz")


def _bare_stem(path: Path) -> str:
    name = path.name
    lower = name.lower()
    if lower.endswith(".nii.gz"):
        return name[:-7]
    return path.stem


def _normalize_key(name: str) -> str:
    key = name.lower().strip()
    key = re.sub(r"\s+", "_", key)
    key = re.sub(r"[-]+", "_", key)
    for token in MASK_HINTS:
        key = re.sub(rf"(^|_)({token})(_|$)", "_", key)
    key = re.sub(r"_+", "_", key).strip("_")
    return key


def _is_supported_file(path: Path) -> bool:
    suffix = path.suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return True
    return path.name.lower().endswith(".nii.gz")


def _is_mask_candidate(path: Path) -> bool:
    joined = " ".join([p.lower() for p in path.parts])
    return any(token in joined for token in MASK_HINTS)


def _load_nifti_slice(path: Path, is_mask: bool) -> Optional[np.ndarray]:
    if not NIBABEL_AVAILABLE:
        log.warning(f"Skipping NIfTI (nibabel not installed): {path}")
        return None

    try:
        volume = nib.load(str(path)).get_fdata()
    except Exception as exc:
        log.warning(f"Failed to read NIfTI {path}: {exc}")
        return None

    if volume.ndim == 4:
        volume = volume[..., 0]
    if volume.ndim != 3:
        log.warning(f"Unsupported NIfTI dimensions {volume.shape} for {path}")
        return None

    mid = volume.shape[2] // 2
    image = volume[:, :, mid].astype(np.float32)

    if is_mask:
        return ((image > 0).astype(np.uint8) * 255)

    lo, hi = np.percentile(image, 1), np.percentile(image, 99)
    image = np.clip(image, lo, hi)
    image = (image - image.min()) / (image.max() - image.min() + 1e-8)
    return (image * 255).astype(np.uint8)


def _load_image(path: Path, is_mask: bool) -> Optional[np.ndarray]:
    if _is_nifti(path):
        arr = _load_nifti_slice(path, is_mask)
        if arr is None:
            return None
        if not is_mask:
            return cv2.cvtColor(arr, cv2.COLOR_GRAY2BGR)
        return arr

    flag = cv2.IMREAD_GRAYSCALE if is_mask else cv2.IMREAD_COLOR
    arr = cv2.imread(str(path), flag)
    if arr is None:
        return None

    if is_mask and arr.ndim == 3:
        arr = cv2.cvtColor(arr, cv2.COLOR_BGR2GRAY)
    return arr


def _collect_files(source_dir: Path) -> List[Path]:
    files = [p for p in source_dir.rglob("*") if p.is_file() and _is_supported_file(p)]
    return sorted(files)


def _safe_write_png(path: Path, image: np.ndarray) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    ok = cv2.imwrite(str(path), image)
    return bool(ok)


def prepare(source_dir: Path, output_dir: Path, min_mask_pixels: int = 10) -> None:
    if not source_dir.exists():
        raise FileNotFoundError(f"Source directory does not exist: {source_dir}")

    images_dir = output_dir / "images"
    masks_dir = output_dir / "masks"
    images_dir.mkdir(parents=True, exist_ok=True)
    masks_dir.mkdir(parents=True, exist_ok=True)

    all_files = _collect_files(source_dir)
    if not all_files:
        raise RuntimeError(f"No supported image files were found under: {source_dir}")

    mask_files = [p for p in all_files if _is_mask_candidate(p)]
    image_files = [p for p in all_files if p not in mask_files]

    mask_map: Dict[str, Path] = {}
    for mp in mask_files:
        key = _normalize_key(_bare_stem(mp))
        if key and key not in mask_map:
            mask_map[key] = mp

    rows: List[Dict[str, int | str]] = []
    errors = 0
    mask_written = 0

    for idx, image_path in enumerate(image_files, start=1):
        key = _normalize_key(_bare_stem(image_path))
        if not key:
            key = _normalize_key(image_path.name)

        image = _load_image(image_path, is_mask=False)
        if image is None:
            errors += 1
            continue

        out_name = f"sample_{idx:06d}.png"
        out_img = images_dir / out_name
        if not _safe_write_png(out_img, image):
            errors += 1
            continue

        label = 0
        candidate_mask = mask_map.get(key)
        if candidate_mask:
            mask = _load_image(candidate_mask, is_mask=True)
            if mask is not None:
                label = int(np.count_nonzero(mask) >= min_mask_pixels)
                if _safe_write_png(masks_dir / out_name, mask):
                    mask_written += 1
        else:
            stem = _bare_stem(image_path).lower()
            if any(token in stem for token in POSITIVE_HINTS):
                label = 1

        rows.append({"filename": out_name, "label": label})

    if not rows:
        raise RuntimeError(
            "No samples were prepared. Check source structure and file formats. "
            "Expected images or volumes under source_dir."
        )

    with open(output_dir / "labels.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["filename", "label"])
        writer.writeheader()
        writer.writerows(rows)

    tumor = sum(1 for r in rows if int(r["label"]) == 1)
    no_tumor = len(rows) - tumor

    log.info("Dataset prepared successfully")
    log.info(f"  source_dir:  {source_dir}")
    log.info(f"  output_dir:  {output_dir}")
    log.info(f"  samples:     {len(rows)}")
    log.info(f"  masks_saved: {mask_written}")
    log.info(f"  tumor:       {tumor}")
    log.info(f"  no_tumor:    {no_tumor}")
    log.info(f"  errors:      {errors}")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Prepare raw dataset into NeuroGuard training format")
    p.add_argument("--source_dir", required=True, help="Path to raw dataset root")
    p.add_argument("--output_dir", required=True, help="Path to prepared dataset output")
    p.add_argument("--min_mask_pixels", type=int, default=10, help="Min non-zero mask pixels to mark label=1")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    prepare(Path(args.source_dir), Path(args.output_dir), min_mask_pixels=args.min_mask_pixels)
