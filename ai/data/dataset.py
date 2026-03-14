from __future__ import annotations

import os
import csv
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader, random_split
import torchvision.transforms as T
import torchvision.transforms.functional as TF

# Optional NIfTI support (install: pip install nibabel)
try:
    import nibabel as nib
    NIBABEL_AVAILABLE = True
except ImportError:
    NIBABEL_AVAILABLE = False

logger = logging.getLogger(__name__)


# ── Preprocessing helpers ──────────────────────────────────────────────────────

def window_ct(
    image: np.ndarray,
    window_center: int = 40,
    window_width: int = 400,
) -> np.ndarray:
    """
    Apply CT windowing (Hounsfield Unit clipping).
    Default values suit soft-tissue / brain window.
    """
    lo = window_center - window_width // 2
    hi = window_center + window_width // 2
    image = np.clip(image, lo, hi)
    image = (image - lo) / (hi - lo)   # → [0, 1]
    return image.astype(np.float32)


def normalize_mri(image: np.ndarray) -> np.ndarray:
    """Z-score normalise a single MRI slice; robust to bright spots via percentile clip."""
    p1, p99 = np.percentile(image, 1), np.percentile(image, 99)
    image = np.clip(image, p1, p99)
    mean, std = image.mean(), image.std() + 1e-8
    return ((image - mean) / std).astype(np.float32)


def load_nifti_slice(path: str, slice_axis: int = 2, slice_idx: Optional[int] = None) -> np.ndarray:
    """Load a 2-D slice from a 3-D NIfTI volume."""
    if not NIBABEL_AVAILABLE:
        raise RuntimeError("nibabel not installed. Run: pip install nibabel")
    vol = nib.load(path).get_fdata()                    # (X, Y, Z[, T])
    if vol.ndim == 4:
        vol = vol[..., 0]                               # take first time-point
    mid = vol.shape[slice_axis] // 2 if slice_idx is None else slice_idx
    slc = np.take(vol, mid, axis=slice_axis)
    return slc.astype(np.float32)


def to_rgb(image: np.ndarray) -> np.ndarray:
    """Convert (H, W) grayscale → (H, W, 3) by repeating channels."""
    if image.ndim == 2:
        image = np.stack([image] * 3, axis=-1)
    return image


def load_image(
    path: str,
    image_size: Tuple[int, int] = (224, 224),
    modality: str = "mri",       # 'mri' | 'ct' | 'xray'
    file_format: str = "png",    # 'png' | 'jpg' | 'nifti'
) -> np.ndarray:
    """
    Load and preprocess one image regardless of modality/format.
    Returns a uint8 (H, W, 3) numpy array ready for torchvision transforms.
    """
    if file_format == "nifti":
        img = load_nifti_slice(path)
        img = normalize_mri(img)
        img = (img - img.min()) / (img.max() - img.min() + 1e-8)   # → [0,1]
        img = (img * 255).astype(np.uint8)
    else:
        img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        if img is None:
            raise FileNotFoundError(f"Could not read image: {path}")
        if img.ndim == 2:
            pass                                    # grayscale — handled below
        elif img.ndim == 3 and img.shape[2] == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)   # collapse to gray first

        if modality == "ct":
            img = window_ct(img.astype(np.float32))
            img = (img * 255).astype(np.uint8)
        elif modality in ("mri", "xray"):
            img = normalize_mri(img.astype(np.float32))
            img = ((img - img.min()) / (img.max() - img.min() + 1e-8) * 255).astype(np.uint8)
        else:
            img = img.astype(np.uint8)

    img = to_rgb(img)                               # (H, W, 3) uint8
    img = cv2.resize(img, image_size, interpolation=cv2.INTER_LINEAR)
    return img


# ── Augmentation ──────────────────────────────────────────────────────────────

def get_transforms(split: str, image_size: Tuple[int, int] = (224, 224)) -> T.Compose:
    """
    Returns torchvision transform pipelines.
    The train pipeline adds geometric and photometric augmentations.
    """
    mean = (0.485, 0.456, 0.406)
    std  = (0.229, 0.224, 0.225)

    if split == "train":
        return T.Compose([
            T.ToPILImage(),
            T.Resize(image_size),
            T.RandomHorizontalFlip(p=0.5),
            T.RandomVerticalFlip(p=0.3),
            T.RandomRotation(degrees=15),
            T.ColorJitter(brightness=0.2, contrast=0.2),
            T.RandomAffine(degrees=0, translate=(0.05, 0.05), scale=(0.95, 1.05)),
            T.ToTensor(),
            T.Normalize(mean=mean, std=std),
        ])
    else:   # val / test / inference
        return T.Compose([
            T.ToPILImage(),
            T.Resize(image_size),
            T.ToTensor(),
            T.Normalize(mean=mean, std=std),
        ])


class SyncedAugmentation:
    """
    Apply identical geometric transforms to both image and mask
    so they stay spatially aligned.
    """

    def __init__(self, split: str):
        self.split = split
        self.h_flip = 0.5
        self.v_flip = 0.3
        self.rot    = 15

    def __call__(
        self, image: torch.Tensor, mask: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        if self.split != "train":
            return image, mask

        if torch.rand(1) < self.h_flip:
            image = TF.hflip(image)
            mask  = TF.hflip(mask)

        if torch.rand(1) < self.v_flip:
            image = TF.vflip(image)
            mask  = TF.vflip(mask)

        angle = (torch.rand(1).item() * 2 - 1) * self.rot
        image = TF.rotate(image, angle)
        mask  = TF.rotate(mask,  angle)

        return image, mask


# ── Dataset ───────────────────────────────────────────────────────────────────

class MedicalImageDataset(Dataset):
    """
    General-purpose dataset that works for BraTS, RSNA, NIH ChestX-ray14,
    and any custom dataset that follows the directory layout documented above.

    Parameters
    ----------
    root_dir      : path to dataset root
    split         : 'train' | 'val' | 'test'
    modality      : 'mri' | 'ct' | 'xray'
    file_format   : 'png' | 'jpg' | 'nifti'
    image_size    : (H, W) target size
    has_masks     : whether mask files exist (for segmentation)
    """

    def __init__(
        self,
        root_dir: str,
        split: str = "train",
        modality: str = "mri",
        file_format: str = "png",
        image_size: Tuple[int, int] = (224, 224),
        has_masks: bool = False,
    ):
        super().__init__()
        self.root        = Path(root_dir)
        self.split       = split
        self.modality    = modality
        self.file_format = file_format
        self.image_size  = image_size
        self.has_masks   = has_masks

        self.img_transform  = get_transforms(split, image_size)
        self.sync_aug       = SyncedAugmentation(split)

        self.samples: List[Dict] = self._load_manifest()
        logger.info(f"[{split}] {len(self.samples)} samples loaded from {root_dir}")

    # ── Manifest loading ──────────────────────────────────────────────────────

    def _load_manifest(self) -> List[Dict]:
        """
        Read labels.csv and build a list of {image_path, mask_path, label} dicts.
        Falls back to scanning the directory if no CSV exists.
        """
        csv_path = self.root / "labels.csv"
        samples  = []

        if csv_path.exists():
            with open(csv_path) as f:
                reader = csv.DictReader(f)
                for row in reader:
                    img_path  = self.root / "images" / row["filename"]
                    mask_path = self.root / "masks"  / row["filename"] if self.has_masks else None
                    samples.append({
                        "image": str(img_path),
                        "mask":  str(mask_path) if mask_path else None,
                        "label": int(row.get("label", 0)),
                        "name":  row["filename"],
                    })
        else:
            # Directory scan fallback
            img_dir = self.root / "images"
            for p in sorted(img_dir.glob(f"*.{self.file_format.lstrip('.')}")):
                mask_p = self.root / "masks" / p.name if self.has_masks else None
                label  = 1 if "tumor" in p.stem.lower() else 0
                samples.append({
                    "image": str(p),
                    "mask":  str(mask_p) if mask_p else None,
                    "label": label,
                    "name":  p.name,
                })

        return samples

    # ── Item loading ──────────────────────────────────────────────────────────

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        sample = self.samples[idx]

        # Image
        raw_image = load_image(
            sample["image"],
            image_size=self.image_size,
            modality=self.modality,
            file_format=self.file_format,
        )
        image_tensor = self.img_transform(raw_image)   # (3, H, W) float32

        result: Dict[str, torch.Tensor] = {
            "image": image_tensor,
            "label": torch.tensor(sample["label"], dtype=torch.long),
            "name":  sample["name"],
        }

        # Mask (optional)
        if self.has_masks and sample["mask"] and os.path.exists(sample["mask"]):
            mask = cv2.imread(sample["mask"], cv2.IMREAD_GRAYSCALE)
            mask = cv2.resize(mask, self.image_size, interpolation=cv2.INTER_NEAREST)
            mask = torch.from_numpy((mask > 127).astype(np.float32)).unsqueeze(0)  # (1,H,W)
            image_tensor, mask = self.sync_aug(image_tensor, mask)
            result["mask"] = mask
        else:
            result["mask"] = torch.zeros(1, *self.image_size)

        return result


# ── DataLoader factory ────────────────────────────────────────────────────────

def build_dataloaders(
    root_dir: str,
    modality: str = "mri",
    file_format: str = "png",
    image_size: Tuple[int, int] = (224, 224),
    has_masks: bool = True,
    batch_size: int = 16,
    num_workers: int = 4,
    train_split: float = 0.70,
    val_split: float = 0.15,
) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """
    Build train / val / test DataLoaders from a single root directory.
    Splits are performed at the dataset level (before __getitem__) to prevent leakage.
    """
    full_dataset = MedicalImageDataset(
        root_dir    = root_dir,
        split       = "train",         # transforms updated per-subset below
        modality    = modality,
        file_format = file_format,
        image_size  = image_size,
        has_masks   = has_masks,
    )

    n_total = len(full_dataset)
    n_train = int(n_total * train_split)
    n_val   = int(n_total * val_split)
    n_test  = n_total - n_train - n_val

    train_ds, val_ds, test_ds = random_split(
        full_dataset,
        [n_train, n_val, n_test],
        generator=torch.Generator().manual_seed(42),
    )

    # Override transform for val/test subsets
    val_ds.dataset  = _clone_dataset_with_split(full_dataset, "val")
    test_ds.dataset = _clone_dataset_with_split(full_dataset, "test")

    def _loader(ds, shuffle):
        return DataLoader(
            ds,
            batch_size  = batch_size,
            shuffle     = shuffle,
            num_workers = num_workers,
            pin_memory  = True,
            drop_last   = shuffle,
        )

    return _loader(train_ds, True), _loader(val_ds, False), _loader(test_ds, False)


def _clone_dataset_with_split(ds: MedicalImageDataset, split: str) -> MedicalImageDataset:
    """Return a shallow copy of the dataset with a different split (transform)."""
    clone                = MedicalImageDataset.__new__(MedicalImageDataset)
    clone.__dict__       = ds.__dict__.copy()
    clone.split          = split
    clone.img_transform  = get_transforms(split, ds.image_size)
    clone.sync_aug       = SyncedAugmentation(split)
    return clone
