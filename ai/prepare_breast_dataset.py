"""
prepare_breast_dataset.py
-------------------------
Prepare the "Breast Cancer Patients MRI's" dataset into NeuroGuard format:

output_dir/
  images/
  labels.csv

Expected source layout:
source_dir/
  train/
    Healthy/
    Sick/
  validation/
    Healthy/
    Sick/
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

import cv2

VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tif", ".tiff"}
CLASS_LABELS = {
    "healthy": 0,
    "sick": 1,
}


def iter_images(class_dir: Path):
    for path in sorted(class_dir.rglob("*")):
        if path.is_file() and path.suffix.lower() in VALID_EXTENSIONS:
            yield path


def prepare(source_dir: Path, output_dir: Path) -> None:
    images_dir = output_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    idx = 0

    for split in ("train", "validation"):
        for class_name, label in CLASS_LABELS.items():
            class_dir = source_dir / split / class_name.capitalize()
            if not class_dir.exists():
                continue

            for image_path in iter_images(class_dir):
                img = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
                if img is None:
                    continue

                idx += 1
                out_name = f"sample_{idx:06d}.png"
                out_path = images_dir / out_name
                cv2.imwrite(str(out_path), img)

                rows.append({"filename": out_name, "label": label})

    if not rows:
        raise RuntimeError(f"No images were prepared from source_dir={source_dir}")

    labels_path = output_dir / "labels.csv"
    with open(labels_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["filename", "label"])
        writer.writeheader()
        writer.writerows(rows)

    positives = sum(1 for row in rows if int(row["label"]) == 1)
    negatives = len(rows) - positives

    print(f"Prepared dataset: {output_dir}")
    print(f"Total samples: {len(rows)}")
    print(f"Healthy (0): {negatives}")
    print(f"Sick (1): {positives}")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Prepare breast MRI dataset for NeuroGuard training")
    p.add_argument("--source_dir", required=True, help="Path to Breast Cancer Patients MRI's root")
    p.add_argument("--output_dir", required=True, help="Path to prepared output directory")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    prepare(Path(args.source_dir), Path(args.output_dir))
