"""
train.py
--------
Full training pipeline with:
  • Mixed-precision training (torch.cuda.amp)
  • Cosine annealing LR scheduler with linear warmup
  • Early stopping
  • Best-model checkpointing
  • Epoch-level logging to console + optional W&B
  • Validation after every epoch

Run:
    python train.py --data_dir /path/to/dataset --modality mri --epochs 50
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from pathlib import Path

import torch
import torch.nn as nn
from torch.cuda.amp import GradScaler, autocast
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR, LinearLR, SequentialLR

# ── Local imports ──────────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))
from config import cfg
from models.tumor_detector import build_model
from data.dataset import build_dataloaders
from utils.losses import CombinedLoss
from utils.metrics import MetricAccumulator, print_classification_report

logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt = "%H:%M:%S",
)
log = logging.getLogger(__name__)


# ── Helpers ────────────────────────────────────────────────────────────────────

def set_seed(seed: int = 42):
    import random, numpy as np
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True


def get_device() -> torch.device:
    if torch.cuda.is_available():
        log.info(f"GPU: {torch.cuda.get_device_name(0)}")
        return torch.device("cuda")
    log.warning("No GPU found — training on CPU (will be slow)")
    return torch.device("cpu")


def build_optimizer(model: nn.Module, lr: float, weight_decay: float) -> AdamW:
    """Separate weight-decay groups: no decay on biases / norms."""
    decay, no_decay = [], []
    for name, p in model.named_parameters():
        if not p.requires_grad:
            continue
        if p.ndim <= 1 or "bias" in name:
            no_decay.append(p)
        else:
            decay.append(p)
    return AdamW(
        [
            {"params": decay,    "weight_decay": weight_decay},
            {"params": no_decay, "weight_decay": 0.0},
        ],
        lr = lr,
    )


def build_scheduler(optimizer, warmup_epochs: int, total_epochs: int):
    warmup = LinearLR(optimizer, start_factor=0.1, end_factor=1.0, total_iters=warmup_epochs)
    cosine = CosineAnnealingLR(optimizer, T_max=total_epochs - warmup_epochs, eta_min=1e-7)
    return SequentialLR(optimizer, schedulers=[warmup, cosine], milestones=[warmup_epochs])


def save_checkpoint(
    model: nn.Module,
    optimizer,
    epoch: int,
    metrics: dict,
    path: str,
):
    torch.save(
        {
            "epoch":      epoch,
            "model":      model.state_dict(),
            "optimizer":  optimizer.state_dict(),
            "metrics":    metrics,
            "config":     cfg,
        },
        path,
    )
    log.info(f"  ✔ Checkpoint saved → {path}")


# ── Training / validation steps ────────────────────────────────────────────────

def train_one_epoch(
    model:     nn.Module,
    loader,
    criterion: nn.Module,
    optimizer: AdamW,
    scaler:    GradScaler,
    device:    torch.device,
    epoch:     int,
) -> dict:
    model.train()
    acc = MetricAccumulator()
    t0  = time.time()

    for step, batch in enumerate(loader, 1):
        images  = batch["image"].to(device, non_blocking=True)
        labels  = batch["label"].to(device, non_blocking=True)
        masks   = batch["mask"].to(device,  non_blocking=True)

        optimizer.zero_grad(set_to_none=True)

        with autocast(enabled=device.type == "cuda"):
            out  = model(images)
            loss = criterion(
                logits       = out["logits"],
                cls_targets  = labels,
                mask_logits  = out.get("mask_logits"),
                mask_targets = masks,
            )

        scaler.scale(loss).backward()
        # Gradient clipping prevents exploding gradients with pre-trained backbones
        scaler.unscale_(optimizer)
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        scaler.step(optimizer)
        scaler.update()

        preds = out["probabilities"].argmax(dim=1)
        probs = out["probabilities"][:, 1]        # positive-class probability

        acc.update(
            labels    = labels,
            preds     = preds,
            probs     = probs,
            mask_pred = out.get("mask_logits"),
            mask_true = masks,
            loss      = loss.item(),
        )

        if step % 20 == 0 or step == len(loader):
            log.info(
                f"  Epoch {epoch:03d}  step {step:04d}/{len(loader):04d}"
                f"  loss={loss.item():.4f}"
            )

    metrics = acc.compute()
    metrics["epoch_time"] = time.time() - t0
    return metrics


@torch.no_grad()
def validate(
    model:     nn.Module,
    loader,
    criterion: nn.Module,
    device:    torch.device,
) -> dict:
    model.eval()
    acc = MetricAccumulator()

    for batch in loader:
        images = batch["image"].to(device, non_blocking=True)
        labels = batch["label"].to(device, non_blocking=True)
        masks  = batch["mask"].to(device,  non_blocking=True)

        with autocast(enabled=device.type == "cuda"):
            out  = model(images)
            loss = criterion(
                logits       = out["logits"],
                cls_targets  = labels,
                mask_logits  = out.get("mask_logits"),
                mask_targets = masks,
            )

        preds = out["probabilities"].argmax(dim=1)
        probs = out["probabilities"][:, 1]
        acc.update(labels, preds, probs, out.get("mask_logits"), masks, loss.item())

    return acc.compute()


# ── Main training loop ─────────────────────────────────────────────────────────

def train(args):
    set_seed(cfg.seed)
    device = get_device()

    # ── Data ──────────────────────────────────────────────────────────────────
    log.info("Building dataloaders …")
    train_loader, val_loader, test_loader = build_dataloaders(
        root_dir     = args.data_dir,
        modality     = args.modality,
        file_format  = args.file_format,
        image_size   = tuple(cfg.data.image_size),
        has_masks    = args.has_masks,
        batch_size   = cfg.training.batch_size,
        num_workers  = cfg.training.num_workers,
    )
    log.info(
        f"  train={len(train_loader.dataset)}  "
        f"val={len(val_loader.dataset)}  "
        f"test={len(test_loader.dataset)}"
    )

    # ── Model ─────────────────────────────────────────────────────────────────
    log.info(f"Building model: {args.architecture} …")
    model = build_model(
        architecture = args.architecture,
        num_classes  = cfg.model.num_classes,
        pretrained   = cfg.model.pretrained,
    ).to(device)

    params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    log.info(f"  Trainable parameters: {params:,}")

    # ── Loss, optimizer, scheduler ────────────────────────────────────────────
    criterion = CombinedLoss(
        seg_weight  = cfg.training.seg_loss_weight,
        focal_alpha = cfg.training.focal_alpha,
        focal_gamma = cfg.training.focal_gamma,
    )

    optimizer = build_optimizer(
        model,
        lr           = cfg.training.learning_rate,
        weight_decay = cfg.training.weight_decay,
    )
    scheduler = build_scheduler(
        optimizer,
        warmup_epochs = cfg.training.warmup_epochs,
        total_epochs  = cfg.training.epochs,
    )
    scaler = GradScaler(enabled=device.type == "cuda")

    # ── Checkpoint directory ──────────────────────────────────────────────────
    ckpt_dir = Path(cfg.training.checkpoint_dir)
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    # ── Training loop ─────────────────────────────────────────────────────────
    best_f1       = 0.0
    patience_ctr  = 0
    history       = []

    for epoch in range(1, cfg.training.epochs + 1):
        log.info(f"\n{'─'*60}")
        log.info(f"Epoch {epoch}/{cfg.training.epochs}  |  LR={scheduler.get_last_lr()[0]:.2e}")

        train_metrics = train_one_epoch(
            model, train_loader, criterion, optimizer, scaler, device, epoch
        )
        val_metrics = validate(model, val_loader, criterion, device)

        scheduler.step()

        # ── Logging ───────────────────────────────────────────────────────────
        log.info(
            f"  [TRAIN] loss={train_metrics['loss']:.4f} "
            f"acc={train_metrics['accuracy']:.4f} "
            f"f1={train_metrics['f1']:.4f} "
            f"dice={train_metrics.get('dice', 0.0):.4f}"
        )
        log.info(
            f"  [VAL]   loss={val_metrics['loss']:.4f} "
            f"acc={val_metrics['accuracy']:.4f} "
            f"f1={val_metrics['f1']:.4f} "
            f"auc={val_metrics.get('auc_roc', 0.0):.4f} "
            f"dice={val_metrics.get('dice', 0.0):.4f}"
        )

        history.append({"epoch": epoch, "train": train_metrics, "val": val_metrics})

        # ── Checkpointing ─────────────────────────────────────────────────────
        val_f1 = val_metrics["f1"]
        if val_f1 > best_f1:
            best_f1      = val_f1
            patience_ctr = 0
            save_checkpoint(
                model, optimizer, epoch, val_metrics,
                path=str(ckpt_dir / "best_model.pth"),
            )
        else:
            patience_ctr += 1
            save_checkpoint(
                model, optimizer, epoch, val_metrics,
                path=str(ckpt_dir / "last_model.pth"),
            )

        # ── Early stopping ────────────────────────────────────────────────────
        if patience_ctr >= cfg.training.early_stopping_patience:
            log.info(
                f"\n⚠  Early stopping triggered after {epoch} epochs "
                f"(no improvement in {patience_ctr} epochs)."
            )
            break

    # ── Final test evaluation ─────────────────────────────────────────────────
    log.info("\n" + "═"*60)
    log.info("Loading best checkpoint for final test evaluation …")
    best_ckpt = torch.load(ckpt_dir / "best_model.pth", map_location=device, weights_only=False)
    model.load_state_dict(best_ckpt["model"])

    test_metrics = validate(model, test_loader, criterion, device)
    log.info("TEST RESULTS:")
    for k, v in test_metrics.items():
        if isinstance(v, float):
            log.info(f"  {k:>15s} = {v:.4f}")

    return model, history


# ── CLI ────────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Train the tumour detection model")
    p.add_argument("--data_dir",     required=True, help="Path to dataset root directory")
    p.add_argument("--modality",     default="mri", choices=["mri", "ct", "xray"])
    p.add_argument("--file_format",  default="png", choices=["png", "jpg", "nifti"])
    p.add_argument("--architecture", default="efficientnet_unet",
                   choices=["efficientnet_unet", "unet", "efficientnet"])
    p.add_argument("--epochs",       type=int, default=None)
    p.add_argument("--batch_size",   type=int, default=None)
    p.add_argument("--lr",           type=float, default=None)
    p.add_argument("--has_masks",    action="store_true", default=True)
    p.add_argument("--no_masks",     action="store_false", dest="has_masks")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()

    # Allow CLI overrides of config defaults
    if args.epochs:     cfg.training.epochs = args.epochs
    if args.batch_size: cfg.training.batch_size = args.batch_size
    if args.lr:         cfg.training.learning_rate = args.lr

    train(args)