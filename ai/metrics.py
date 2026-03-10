from __future__ import annotations
import numpy as np
import torch
from typing import Dict, Optional, Union
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)


Arraylike = Union[np.ndarray, torch.Tensor]


def _to_numpy(x: Arraylike) -> np.ndarray:
    if isinstance(x, torch.Tensor):
        return x.detach().cpu().numpy()
    return np.asarray(x)


# ── Classification metrics ─────────────────────────────────────────────────────

def compute_classification_metrics(
    y_true: Arraylike,
    y_pred: Arraylike,
    y_prob: Optional[Arraylike] = None,
    threshold: float = 0.5,
) -> Dict[str, float]:

    y_true = _to_numpy(y_true).flatten().astype(int)
    y_pred = _to_numpy(y_pred).flatten().astype(int)

    acc       = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall    = recall_score(y_true, y_pred, zero_division=0)   # = sensitivity
    f1        = f1_score(y_true, y_pred, zero_division=0)

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    specificity = tn / (tn + fp + 1e-8)

    metrics: Dict[str, float] = {
        "accuracy":    float(acc),
        "precision":   float(precision),
        "recall":      float(recall),       # sensitivity
        "specificity": float(specificity),
        "f1":          float(f1),
        "tp":          int(tp),
        "fp":          int(fp),
        "tn":          int(tn),
        "fn":          int(fn),
    }

    if y_prob is not None:
        y_prob = _to_numpy(y_prob).flatten()
        try:
            metrics["auc_roc"] = float(roc_auc_score(y_true, y_prob))
        except ValueError:
            metrics["auc_roc"] = float("nan")   # only one class present in batch

    return metrics


def print_classification_report(y_true: Arraylike, y_pred: Arraylike) -> None:
    y_true = _to_numpy(y_true).astype(int)
    y_pred = _to_numpy(y_pred).astype(int)
    print(classification_report(
        y_true, y_pred,
        target_names=["No Tumor", "Tumor"],
        digits=4,
    ))


# ── Segmentation metrics ───────────────────────────────────────────────────────

def dice_coefficient(
    pred_mask: Arraylike,
    true_mask: Arraylike,
    threshold: float = 0.5,
    smooth: float = 1e-6,
) -> float:

    pred = (_to_numpy(pred_mask).flatten() > threshold).astype(float)
    true = (_to_numpy(true_mask).flatten() > threshold).astype(float)

    intersection = (pred * true).sum()
    return float((2.0 * intersection + smooth) / (pred.sum() + true.sum() + smooth))


def iou_score(
    pred_mask: Arraylike,
    true_mask: Arraylike,
    threshold: float = 0.5,
    smooth: float = 1e-6,
) -> float:
    """Jaccard / IoU = |P ∩ T| / |P ∪ T|"""
    pred = (_to_numpy(pred_mask).flatten() > threshold).astype(float)
    true = (_to_numpy(true_mask).flatten() > threshold).astype(float)

    intersection = (pred * true).sum()
    union        = pred.sum() + true.sum() - intersection
    return float((intersection + smooth) / (union + smooth))


def compute_segmentation_metrics(
    pred_masks: Arraylike,   # (B, 1, H, W) or (B, H, W), probabilities
    true_masks: Arraylike,   # same shape, binary
    threshold: float = 0.5,
) -> Dict[str, float]:
    """Average Dice and IoU over a batch of masks."""
    pred = _to_numpy(pred_masks)
    true = _to_numpy(true_masks)

    dice_scores = []
    iou_scores  = []

    for p, t in zip(pred, true):
        dice_scores.append(dice_coefficient(p, t, threshold))
        iou_scores.append(iou_score(p, t, threshold))

    return {
        "dice": float(np.mean(dice_scores)),
        "iou":  float(np.mean(iou_scores)),
    }


# ── Epoch-level accumulator ────────────────────────────────────────────────────

class MetricAccumulator:
    def __init__(self):
        self.reset()

    def reset(self):
        self._labels    : list = []
        self._preds     : list = []
        self._probs     : list = []   # positive-class probability
        self._mask_pred : list = []
        self._mask_true : list = []
        self.loss_sum   : float = 0.0
        self.n_batches  : int   = 0

    def update(
        self,
        labels:     torch.Tensor,
        preds:      torch.Tensor,
        probs:      torch.Tensor,
        mask_pred:  Optional[torch.Tensor] = None,
        mask_true:  Optional[torch.Tensor] = None,
        loss:       float = 0.0,
    ):
        self._labels.extend(labels.cpu().numpy().tolist())
        self._preds.extend(preds.cpu().numpy().tolist())
        self._probs.extend(probs.cpu().numpy().tolist())
        if mask_pred is not None:
            self._mask_pred.append(mask_pred.detach().cpu())
            self._mask_true.append(mask_true.detach().cpu())
        self.loss_sum  += loss
        self.n_batches += 1

    def compute(self) -> Dict[str, float]:
        cls_metrics = compute_classification_metrics(
            y_true = np.array(self._labels),
            y_pred = np.array(self._preds),
            y_prob = np.array(self._probs),
        )
        cls_metrics["loss"] = self.loss_sum / max(self.n_batches, 1)

        if self._mask_pred:
            all_pred = torch.cat(self._mask_pred, dim=0).sigmoid()
            all_true = torch.cat(self._mask_true, dim=0)
            seg_metrics = compute_segmentation_metrics(all_pred.numpy(), all_true.numpy())
            cls_metrics.update(seg_metrics)

        return cls_metrics
