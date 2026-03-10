from __future__ import annotations
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional


class FocalLoss(nn.Module):
    def __init__(
        self,
        alpha: float = 0.25,
        gamma: float = 2.0,
        reduction: str = "mean",
        num_classes: int = 2,
    ):
        super().__init__()
        self.alpha       = alpha
        self.gamma       = gamma
        self.reduction   = reduction
        self.num_classes = num_classes

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        # logits : (B, C), targets : (B,)
        ce_loss = F.cross_entropy(logits, targets, reduction="none")
        pt      = torch.exp(-ce_loss)                          # probability of true class
        focal   = self.alpha * (1 - pt) ** self.gamma * ce_loss

        if self.reduction == "mean":
            return focal.mean()
        elif self.reduction == "sum":
            return focal.sum()
        return focal


class DiceLoss(nn.Module):

    def __init__(self, smooth: float = 1.0):
        super().__init__()
        self.smooth = smooth

    def forward(
        self,
        pred_logits: torch.Tensor,    # (B, 1, H, W)
        targets: torch.Tensor,        # (B, 1, H, W) float in [0, 1]
    ) -> torch.Tensor:
        pred = torch.sigmoid(pred_logits)
        pred    = pred.view(pred.size(0), -1)
        targets = targets.view(targets.size(0), -1)

        intersection = (pred * targets).sum(dim=1)
        dice = (2 * intersection + self.smooth) / (
            pred.sum(dim=1) + targets.sum(dim=1) + self.smooth
        )
        return 1 - dice.mean()


class TverskyLoss(nn.Module):
    def __init__(self, alpha: float = 0.7, beta: float = 0.3, smooth: float = 1.0):
        super().__init__()
        self.alpha  = alpha    # FN weight
        self.beta   = beta     # FP weight
        self.smooth = smooth

    def forward(
        self,
        pred_logits: torch.Tensor,
        targets: torch.Tensor,
    ) -> torch.Tensor:
        pred    = torch.sigmoid(pred_logits)
        pred    = pred.view(pred.size(0), -1)
        targets = targets.view(targets.size(0), -1)

        tp = (pred * targets).sum(dim=1)
        fp = (pred * (1 - targets)).sum(dim=1)
        fn = ((1 - pred) * targets).sum(dim=1)

        tversky = (tp + self.smooth) / (
            tp + self.alpha * fn + self.beta * fp + self.smooth
        )
        return 1 - tversky.mean()


class CombinedLoss(nn.Module):
    def __init__(
        self,
        seg_weight: float = 0.4,
        focal_alpha: float = 0.25,
        focal_gamma: float = 2.0,
        use_tversky: bool = True,
    ):
        super().__init__()
        self.seg_weight = seg_weight
        self.cls_loss   = FocalLoss(alpha=focal_alpha, gamma=focal_gamma)
        self.seg_loss   = TverskyLoss() if use_tversky else DiceLoss()

    def forward(
        self,
        logits: torch.Tensor,         # (B, num_classes)
        cls_targets: torch.Tensor,    # (B,) int
        mask_logits: Optional[torch.Tensor] = None,   # (B, 1, H, W)
        mask_targets: Optional[torch.Tensor] = None,  # (B, 1, H, W)
    ) -> torch.Tensor:

        loss = self.cls_loss(logits, cls_targets)

        if (
            self.seg_weight > 0
            and mask_logits is not None
            and mask_targets is not None
        ):
            loss = loss + self.seg_weight * self.seg_loss(mask_logits, mask_targets)

        return loss
