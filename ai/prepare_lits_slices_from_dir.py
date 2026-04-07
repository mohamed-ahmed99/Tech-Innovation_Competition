from __future__ import annotations

import argparse
import csv
import random
import re
import shutil
from pathlib import Path

import cv2
import nibabel as nib
import numpy as np


def normalize_ct_slice(slice_2d: np.ndarray) -> np.ndarray:
    arr = slice_2d.astype(np.float32)
    lo, hi = np.percentile(arr, 1), np.percentile(arr, 99)
    arr = np.clip(arr, lo, hi)
    arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-8)
    return (arr * 255.0).astype(np.uint8)


def _read_volume(path: Path) -> np.ndarray:
    vol = np.asanyarray(nib.load(str(path)).dataobj)
    if vol.ndim == 4:
        vol = vol[..., 0]
    if vol.ndim != 3:
        raise ValueError(f"Expected 3D volume, got shape={vol.shape} for {path}")
    return vol.astype(np.float32, copy=False)


def _maps_from_dir(input_dir: Path) -> tuple[dict[int, Path], dict[int, Path]]:
    img_dir = input_dir / "images"
    seg_dir = input_dir / "segmentations"

    if not img_dir.exists() or not seg_dir.exists():
        raise FileNotFoundError("Expected input_dir/images and input_dir/segmentations")

    vol_map: dict[int, Path] = {}
    seg_map: dict[int, Path] = {}

    for p in img_dir.glob("volume-*.nii"):
        m = re.search(r"volume-(\d+)\.nii$", p.name)
        if m:
            vol_map[int(m.group(1))] = p

    for p in seg_dir.glob("segmentation-*.nii"):
        m = re.search(r"segmentation-(\d+)\.nii$", p.name)
        if m:
            seg_map[int(m.group(1))] = p

    return vol_map, seg_map


def build_slice_dataset(
    input_dir: Path,
    output_dir: Path,
    axis: int = 2,
    max_pos_per_volume: int = 2,
    max_neg_per_volume: int = 2,
    min_pos_pixels: int = 25,
    min_neg_std: float = 8.0,
    seed: int = 42,
) -> None:
    random.seed(seed)

    if output_dir.exists():
        shutil.rmtree(output_dir)

    images_dir = output_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    vol_map, seg_map = _maps_from_dir(input_dir)
    pair_ids = sorted(set(vol_map).intersection(seg_map))
    if not pair_ids:
        raise RuntimeError("No paired volume/segmentation files found")

    rows: list[tuple[str, int]] = []
    skipped = 0

    for case_id in pair_ids:
        print(f"processing_case={case_id}")
        try:
            vol = _read_volume(vol_map[case_id])
            seg = _read_volume(seg_map[case_id])

            if vol.shape != seg.shape:
                skipped += 1
                continue

            if axis == 0:
                tumor_counts = np.count_nonzero(seg == 2, axis=(1, 2))
                nonzero_counts = np.count_nonzero(seg, axis=(1, 2))
                vol_std = np.std(vol, axis=(1, 2))
            elif axis == 1:
                tumor_counts = np.count_nonzero(seg == 2, axis=(0, 2))
                nonzero_counts = np.count_nonzero(seg, axis=(0, 2))
                vol_std = np.std(vol, axis=(0, 2))
            else:
                tumor_counts = np.count_nonzero(seg == 2, axis=(0, 1))
                nonzero_counts = np.count_nonzero(seg, axis=(0, 1))
                vol_std = np.std(vol, axis=(0, 1))

            pos_slices = np.where(tumor_counts >= min_pos_pixels)[0].tolist()
            neg_slices = np.where((nonzero_counts == 0) & (vol_std >= min_neg_std))[0].tolist()

            if pos_slices:
                pos_slices = random.sample(pos_slices, min(max_pos_per_volume, len(pos_slices)))
            if neg_slices:
                neg_slices = random.sample(neg_slices, min(max_neg_per_volume, len(neg_slices)))

            for sl in pos_slices:
                img = normalize_ct_slice(np.take(vol, sl, axis=axis))
                out_name = f"case_{case_id:03d}_slice_{sl:03d}_pos.png"
                cv2.imwrite(str(images_dir / out_name), img)
                rows.append((out_name, 1))

            for sl in neg_slices:
                img = normalize_ct_slice(np.take(vol, sl, axis=axis))
                out_name = f"case_{case_id:03d}_slice_{sl:03d}_neg.png"
                cv2.imwrite(str(images_dir / out_name), img)
                rows.append((out_name, 0))
        except Exception:
            skipped += 1

    if not rows:
        raise RuntimeError("No slice samples were generated")

    random.shuffle(rows)

    with open(output_dir / "labels.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["filename", "label"])
        writer.writerows(rows)

    positives = sum(label for _, label in rows)
    negatives = len(rows) - positives

    print(f"paired_cases={len(pair_ids)}")
    print(f"samples={len(rows)}")
    print(f"positives={positives}")
    print(f"negatives={negatives}")
    print(f"skipped_cases={skipped}")
    print(f"output_dir={output_dir}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build balanced LiTS slice dataset from extracted volumes")
    parser.add_argument("--input_dir", required=True, help="Directory containing images/ and segmentations/")
    parser.add_argument("--output_dir", required=True, help="Output prepared dataset directory")
    parser.add_argument("--axis", type=int, default=2, choices=[0, 1, 2])
    parser.add_argument("--max_pos_per_volume", type=int, default=2)
    parser.add_argument("--max_neg_per_volume", type=int, default=2)
    parser.add_argument("--min_pos_pixels", type=int, default=25)
    parser.add_argument("--min_neg_std", type=float, default=8.0)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    build_slice_dataset(
        input_dir=Path(args.input_dir),
        output_dir=Path(args.output_dir),
        axis=args.axis,
        max_pos_per_volume=args.max_pos_per_volume,
        max_neg_per_volume=args.max_neg_per_volume,
        min_pos_pixels=args.min_pos_pixels,
        min_neg_std=args.min_neg_std,
        seed=args.seed,
    )
