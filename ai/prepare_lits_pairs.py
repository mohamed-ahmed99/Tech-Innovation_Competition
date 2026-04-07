from __future__ import annotations

import argparse
import csv
import re
import shutil
import zipfile
from pathlib import Path

import nibabel as nib
import numpy as np


def build_lits_pairs(zip_path: Path, output_dir: Path) -> None:
    if not zip_path.exists():
        raise FileNotFoundError(f"Zip not found: {zip_path}")

    if output_dir.exists():
        shutil.rmtree(output_dir)

    images_dir = output_dir / "images"
    seg_dir = output_dir / "segmentations"
    images_dir.mkdir(parents=True, exist_ok=True)
    seg_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path) as zf:
        names = zf.namelist()

        vol_map: dict[int, str] = {}
        seg_map: dict[int, str] = {}

        for name in names:
            m_vol = re.search(r"volume-(\d+)\.nii$", name)
            if m_vol:
                vol_map[int(m_vol.group(1))] = name
            m_seg = re.search(r"segmentation-(\d+)\.nii$", name)
            if m_seg:
                seg_map[int(m_seg.group(1))] = name

        pair_ids = sorted(set(vol_map).intersection(seg_map))
        if not pair_ids:
            raise RuntimeError("No paired volume/segmentation files found in archive")

        rows: list[tuple[str, int]] = []
        skipped = 0

        for idx in pair_ids:
            vol_name = f"volume-{idx}.nii"
            seg_name = f"segmentation-{idx}.nii"

            vol_out = images_dir / vol_name
            seg_out = seg_dir / seg_name

            try:
                with zf.open(vol_map[idx]) as src, open(vol_out, "wb") as dst:
                    dst.write(src.read())
                with zf.open(seg_map[idx]) as src, open(seg_out, "wb") as dst:
                    dst.write(src.read())

                seg_data = nib.load(str(seg_out)).get_fdata()
                label = int(np.any(seg_data == 2))
                rows.append((vol_name, label))
            except Exception:
                skipped += 1
                if vol_out.exists():
                    vol_out.unlink(missing_ok=True)
                if seg_out.exists():
                    seg_out.unlink(missing_ok=True)

        with open(output_dir / "labels.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["filename", "label"])
            writer.writerows(rows)

    positives = sum(label for _, label in rows)
    negatives = len(rows) - positives

    print(f"paired_candidates={len(pair_ids)}")
    print(f"written={len(rows)}")
    print(f"positives={positives}")
    print(f"negatives={negatives}")
    print(f"skipped={skipped}")
    print(f"output_dir={output_dir}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build paired LiTS NIfTI dataset from zip")
    parser.add_argument("--zip_path", required=True, help="Path to LiTS zip")
    parser.add_argument("--output_dir", required=True, help="Output prepared dataset directory")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    build_lits_pairs(Path(args.zip_path), Path(args.output_dir))