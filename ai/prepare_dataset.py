import os
import shutil
import csv
import cv2
import numpy as np
from pathlib import Path

# ✏️ غيّر المسارين دول بس
source_dir = r"F:\NeuroGuard\archive (1)\kaggle_3m"
output_dir = r"F:\NeuroGuard\my_dataset\prepared"

# إنشاء الفولدرات
images_dir = Path(output_dir) / "images"
masks_dir  = Path(output_dir) / "masks"
images_dir.mkdir(parents=True, exist_ok=True)
masks_dir.mkdir(parents=True, exist_ok=True)

rows = []
errors = 0

for patient_folder in sorted(Path(source_dir).iterdir()):
    if not patient_folder.is_dir():
        continue

    for file in sorted(patient_folder.iterdir()):
        # تخطي ملفات الـ mask في اللوب الأساسي
        if "_mask" in file.name:
            continue
        if file.suffix.lower() not in (".tif", ".tiff", ".png", ".jpg"):
            continue

        # مسار الـ mask المقابل
        mask_path = patient_folder / (file.stem + "_mask" + file.suffix)

        # قراءة الصورة
        img = cv2.imread(str(file))
        if img is None:
            errors += 1
            continue

        # اسم الملف الجديد
        new_name = file.stem.replace(" ", "_") + ".png"

        # حفظ الصورة في images/
        cv2.imwrite(str(images_dir / new_name), img)

        # الـ mask
        label = 0
        if mask_path.exists():
            mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
            if mask is not None:
                label = 1 if mask.max() > 0 else 0
                # حفظ الـ mask في masks/
                cv2.imwrite(str(masks_dir / new_name), mask)

        rows.append({"filename": new_name, "label": label})

# كتابة labels.csv
csv_path = Path(output_dir) / "labels.csv"
with open(csv_path, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["filename", "label"])
    writer.writeheader()
    writer.writerows(rows)

# تقرير
tumor    = sum(r["label"] == 1 for r in rows)
no_tumor = sum(r["label"] == 0 for r in rows)
print(f"Processed {len(rows)} images")
print(f"   Tumor:    {tumor}")
print(f"   No Tumor: {no_tumor}")
print(f"   Errors:   {errors}")
print(f"\nDataset ready in: {output_dir}")