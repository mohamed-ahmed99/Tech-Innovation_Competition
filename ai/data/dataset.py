from __future__ import annotations

import os
import csv
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader, Subset
import torchvision.transforms as T
import torchvision.transforms.functional as TF

try:
    from sklearn.model_selection import train_test_split
    SKLEARN_AVAILABLE = True
except Exception:
    SKLEARN_AVAILABLE = False

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
    if n_total == 0:
        raise ValueError(
            "No samples found in dataset. Expected prepared structure with "
            "`images/` and optional `masks/` plus `labels.csv`. "
            "Run `python prepare_dataset.py --source_dir <raw> --output_dir <prepared>` first."
        )

    n_train = int(n_total * train_split)
    n_val   = int(n_total * val_split)
    n_test  = n_total - n_train - n_val

    labels = np.array([int(s["label"]) for s in full_dataset.samples], dtype=np.int64)
    n_train, n_val, n_test = _rebalance_split_sizes(labels, n_train, n_val, n_test)

    train_idx, val_idx, test_idx = _build_split_indices(
        full_dataset=full_dataset,
        n_train=n_train,
        n_val=n_val,
        n_test=n_test,
        seed=42,
    )

    train_ds = Subset(_clone_dataset_with_split(full_dataset, "train"), train_idx)
    val_ds = Subset(_clone_dataset_with_split(full_dataset, "val"), val_idx)
    test_ds = Subset(_clone_dataset_with_split(full_dataset, "test"), test_idx)

    def _loader(ds, shuffle):
        return DataLoader(
            ds,
            batch_size  = batch_size,
            shuffle     = shuffle,
            num_workers = num_workers,
            pin_memory  = True,
            drop_last   = bool(shuffle and len(ds) >= batch_size),
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


def _build_split_indices(
    full_dataset: MedicalImageDataset,
    n_train: int,
    n_val: int,
    n_test: int,
    seed: int,
) -> Tuple[List[int], List[int], List[int]]:
    """
    Build train/val/test indices with stratification when feasible.
    Falls back to deterministic random split for tiny or single-class datasets.
    """
    n_total = len(full_dataset)
    labels = np.array([int(s["label"]) for s in full_dataset.samples], dtype=np.int64)
    all_idx = np.arange(n_total, dtype=np.int64)

    if SKLEARN_AVAILABLE and _can_stratify(labels, n_train, n_val, n_test):
        train_val_idx, test_idx = train_test_split(
            all_idx,
            test_size=n_test,
            random_state=seed,
            stratify=labels,
            shuffle=True,
        )
        if n_val > 0:
            train_val_labels = labels[train_val_idx]
            val_ratio = n_val / float(len(train_val_idx))
            train_idx, val_idx = train_test_split(
                train_val_idx,
                test_size=val_ratio,
                random_state=seed,
                stratify=train_val_labels,
                shuffle=True,
            )
        else:
            train_idx, val_idx = train_val_idx, np.array([], dtype=np.int64)

        return train_idx.tolist(), val_idx.tolist(), test_idx.tolist()

    # Fallback path: deterministic random split
    g = np.random.default_rng(seed)
    shuffled = g.permutation(all_idx)
    train_idx = shuffled[:n_train]
    val_idx = shuffled[n_train:n_train + n_val]
    test_idx = shuffled[n_train + n_val:n_train + n_val + n_test]
    return train_idx.tolist(), val_idx.tolist(), test_idx.tolist()


def _can_stratify(labels: np.ndarray, n_train: int, n_val: int, n_test: int) -> bool:
    if labels.size == 0:
        return False

    unique, counts = np.unique(labels, return_counts=True)
    n_classes = int(unique.size)
    if n_classes < 2:
        return False

    if np.min(counts) < 2:
        return False

    # Each split used for stratification should have room for each class.
    if n_test > 0 and n_test < n_classes:
        return False
    if n_val > 0 and n_val < n_classes:
        return False
    if n_train < n_classes:
        return False

    return True


def _rebalance_split_sizes(
    labels: np.ndarray,
    n_train: int,
    n_val: int,
    n_test: int,
) -> Tuple[int, int, int]:
    """Increase tiny val/test splits so stratification is possible on small datasets."""
    n_total = int(labels.size)
    unique = np.unique(labels)
    n_classes = int(unique.size)

    if n_total == 0 or n_classes < 2:
        return n_train, n_val, n_test

    min_each = n_classes
    n_val = max(n_val, min_each)
    n_test = max(n_test, min_each)
    n_train = n_total - n_val - n_test

    if n_train >= min_each:
        return n_train, n_val, n_test

    # If train becomes too small, borrow samples back from eval splits.
    deficit = min_each - n_train
    borrow = min(deficit, max(0, n_val - min_each))
    n_val -= borrow
    deficit -= borrow

    borrow = min(deficit, max(0, n_test - min_each))
    n_test -= borrow

    n_train = n_total - n_val - n_test
    return n_train, n_val, n_test
