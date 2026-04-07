from __future__ import annotations

import argparse
import csv
import os
import random
import re
import shutil
import tempfile
import zipfile
from pathlib import Path

import cv2
import nibabel as nib
import numpy as np


def normalize_ct_slice(slice_2d: np.ndarray) -> np.ndarray:
    """Convert a CT slice to 8-bit grayscale using robust percentile clipping."""
    arr = slice_2d.astype(np.float32)
    lo, hi = np.percentile(arr, 1), np.percentile(arr, 99)
    arr = np.clip(arr, lo, hi)
    arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-8)
    arr = (arr * 255.0).astype(np.uint8)
    return arr


def _read_volume(path: Path) -> np.ndarray:
    vol = nib.load(str(path)).get_fdata()
    if vol.ndim == 4:
        vol = vol[..., 0]
    if vol.ndim != 3:
        raise ValueError(f"Expected 3D volume, got shape={vol.shape} for {path}")
    return vol.astype(np.float32)


def _extract_pairs(zip_path: Path) -> tuple[dict[int, str], dict[int, str]]:
    with zipfile.ZipFile(zip_path) as zf:
        vol_map: dict[int, str] = {}
        seg_map: dict[int, str] = {}
        for name in zf.namelist():
            m_vol = re.search(r"volume-(\d+)\.nii$", name)
            if m_vol:
                vol_map[int(m_vol.group(1))] = name
            m_seg = re.search(r"segmentation-(\d+)\.nii$", name)
            if m_seg:
                seg_map[int(m_seg.group(1))] = name
    return vol_map, seg_map


def build_slice_dataset(
    zip_path: Path,
    output_dir: Path,
    axis: int = 2,
    max_pos_per_volume: int = 6,
    max_neg_per_volume: int = 6,
    min_pos_pixels: int = 25,
    min_neg_std: float = 8.0,
    max_cases: int = 0,
    seed: int = 42,
) -> None:
    if not zip_path.exists():
        raise FileNotFoundError(f"Zip not found: {zip_path}")

    random.seed(seed)

    lock_path = output_dir.parent / f".{output_dir.name}.lock"
    lock_fd = None
    try:
        lock_fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as exc:
        raise RuntimeError(f"Another preparation process is already running ({lock_path})") from exc

    try:
        if output_dir.exists():
            shutil.rmtree(output_dir)

        images_dir = output_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)

        vol_map, seg_map = _extract_pairs(zip_path)
        pair_ids = sorted(set(vol_map).intersection(seg_map))
        if max_cases > 0:
            pair_ids = pair_ids[:max_cases]
        if not pair_ids:
            raise RuntimeError("No paired volume/segmentation files found in archive")

        rows: list[tuple[str, int]] = []
        skipped = 0

        with zipfile.ZipFile(zip_path) as zf, tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)

            for case_id in pair_ids:
                print(f"processing_case={case_id}")
                try:
                    vol_member = vol_map[case_id]
                    seg_member = seg_map[case_id]

                    vol_path = tmp_dir / f"volume-{case_id}.nii"
                    seg_path = tmp_dir / f"segmentation-{case_id}.nii"

                    with zf.open(vol_member) as src, open(vol_path, "wb") as dst:
                        dst.write(src.read())
                    with zf.open(seg_member) as src, open(seg_path, "wb") as dst:
                        dst.write(src.read())

                    vol = _read_volume(vol_path)
                    seg = _read_volume(seg_path)

                    if vol.shape != seg.shape:
                        skipped += 1
                        continue

                    pos_slices: list[int] = []
                    neg_slices: list[int] = []

                    n_slices = vol.shape[axis]
                    for sl in range(n_slices):
                        seg_slice = np.take(seg, sl, axis=axis)
                        tumor_pixels = int(np.count_nonzero(seg_slice == 2))
                        if tumor_pixels >= min_pos_pixels:
                            pos_slices.append(sl)
                            continue

                        if np.count_nonzero(seg_slice) == 0:
                            vol_slice = np.take(vol, sl, axis=axis)
                            if float(np.std(vol_slice)) >= min_neg_std:
                                neg_slices.append(sl)

                    if pos_slices:
                        k_pos = min(max_pos_per_volume, len(pos_slices))
                        pos_slices = random.sample(pos_slices, k_pos)
                    if neg_slices:
                        k_neg = min(max_neg_per_volume, len(neg_slices))
                        neg_slices = random.sample(neg_slices, k_neg)

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
                    continue

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
    finally:
        if lock_fd is not None:
            os.close(lock_fd)
        if lock_path.exists():
            lock_path.unlink(missing_ok=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build balanced LiTS slice classification dataset")
    parser.add_argument("--zip_path", required=True, help="Path to LiTS zip")
    parser.add_argument("--output_dir", required=True, help="Output prepared dataset directory")
    parser.add_argument("--axis", type=int, default=2, choices=[0, 1, 2], help="Slice axis")
    parser.add_argument("--max_pos_per_volume", type=int, default=6)
    parser.add_argument("--max_neg_per_volume", type=int, default=6)
    parser.add_argument("--min_pos_pixels", type=int, default=25)
    parser.add_argument("--min_neg_std", type=float, default=8.0)
    parser.add_argument("--max_cases", type=int, default=0, help="Limit number of paired cases (0 = all)")
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    build_slice_dataset(
        zip_path=Path(args.zip_path),
        output_dir=Path(args.output_dir),
        axis=args.axis,
        max_pos_per_volume=args.max_pos_per_volume,
        max_neg_per_volume=args.max_neg_per_volume,
        min_pos_pixels=args.min_pos_pixels,
        min_neg_std=args.min_neg_std,
        max_cases=args.max_cases,
        seed=args.seed,
    )
