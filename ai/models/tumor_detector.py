from __future__ import annotations
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models
from torchvision.models import (
    EfficientNet_B3_Weights,
    ResNet50_Weights,
)
from typing import Dict, Tuple, Optional


class SEBlock(nn.Module):
    def __init__(self, channels: int, reduction: int = 16):
        super().__init__()
        self.se = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(channels, channels // reduction, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(channels // reduction, channels, bias=False),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        scale = self.se(x).view(x.size(0), x.size(1), 1, 1)
        return x * scale



class DecoderBlock(nn.Module):
    def __init__(self, in_ch: int, skip_ch: int, out_ch: int):
        super().__init__()
        self.up   = nn.ConvTranspose2d(in_ch, out_ch, kernel_size=2, stride=2)
        self.conv = nn.Sequential(
            nn.Conv2d(out_ch + skip_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )
        self.se = SEBlock(out_ch)

    def forward(self, x: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        x = self.up(x)
        if x.shape != skip.shape:
            x = F.interpolate(x, size=skip.shape[2:], mode="bilinear", align_corners=False)
        x = torch.cat([x, skip], dim=1)
        return self.se(self.conv(x))



class TumorDetector(nn.Module):


    def __init__(
        self,
        backbone: str = "efficientnet",
        num_classes: int = 2,
        use_segmentation_head: bool = True,
        pretrained: bool = True,
        dropout_rate: float = 0.3,
    ):
        super().__init__()
        self.use_segmentation_head = use_segmentation_head
        self.num_classes = num_classes


        if backbone == "efficientnet":
            weights = EfficientNet_B3_Weights.DEFAULT if pretrained else None
            base    = models.efficientnet_b3(weights=weights)
            self.encoder  = base.features
            encoder_out   = 1536

            self.skip_chs = [24, 32, 48, 96, 136]

        elif backbone == "resnet50":
            weights = ResNet50_Weights.DEFAULT if pretrained else None
            base    = models.resnet50(weights=weights)
            self.encoder = nn.Sequential(
                base.conv1, base.bn1, base.relu, base.maxpool,
                base.layer1, base.layer2, base.layer3, base.layer4,
            )
            encoder_out   = 2048
            self.skip_chs = [64, 256, 512, 1024]

        else:
            raise ValueError(f"Unknown backbone '{backbone}'. Choose 'efficientnet' or 'resnet50'.")

        self.backbone_name = backbone

        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Dropout(dropout_rate),
            nn.Linear(encoder_out, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout_rate / 2),
            nn.Linear(256, num_classes),
        )

        if use_segmentation_head:
            self.decoder = nn.ModuleList([
                DecoderBlock(encoder_out, 0,   256),
                DecoderBlock(256,         0,   128),
                DecoderBlock(128,         0,    64),
                DecoderBlock(64,          0,    32),
            ])
            self.seg_head = nn.Conv2d(32, 1, kernel_size=1)   # binary mask


    def _encode(self, x: torch.Tensor) -> torch.Tensor:
        return self.encoder(x)

    def forward(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        B, C, H, W = x.shape
        features = self._encode(x)

        # Classification
        logits        = self.classifier(features)
        probabilities = F.softmax(logits, dim=1)

        out: Dict[str, torch.Tensor] = {
            "logits":        logits,
            "probabilities": probabilities,
        }

        # Segmentation
        if self.use_segmentation_head:
            d = features
            for decoder_block in self.decoder:
                d = decoder_block.up(d)
                d = decoder_block.conv(
                    torch.cat([d, torch.zeros_like(d)], dim=1)
                    if False else d   # placeholder; use forward_with_skips in training
                )
            mask_logits = self.seg_head(d)
            mask_logits = F.interpolate(
                mask_logits, size=(H, W), mode="bilinear", align_corners=False
            )
            out["mask_logits"] = mask_logits
            out["mask_probs"]  = torch.sigmoid(mask_logits)

        return out


class TumorDetectorUNet(nn.Module):

    def __init__(
        self,
        num_classes: int = 2,
        pretrained: bool = True,
        dropout_rate: float = 0.3,
    ):
        super().__init__()

        weights  = EfficientNet_B3_Weights.DEFAULT if pretrained else None
        backbone = models.efficientnet_b3(weights=weights)


        feats = backbone.features
        self.enc0 = feats[0]
        self.enc1 = feats[1]
        self.enc2 = feats[2]
        self.enc3 = feats[3]
        self.enc4 = feats[4]
        self.enc5 = feats[5]
        self.enc6 = nn.Sequential(feats[6], feats[7], feats[8])

        # ── Decoder ───────────────────────────────────────────────────────────
        self.dec5 = DecoderBlock(1536, 136,  512)
        self.dec4 = DecoderBlock(512,   96,  256)
        self.dec3 = DecoderBlock(256,   48,  128)
        self.dec2 = DecoderBlock(128,   32,   64)
        self.dec1 = DecoderBlock(64,    24,   32)

        # ── Heads ─────────────────────────────────────────────────────────────
        self.seg_head = nn.Conv2d(32, 1, kernel_size=1)

        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Dropout(dropout_rate),
            nn.Linear(1536, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout_rate / 2),
            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        H, W = x.shape[2], x.shape[3]

        # Encoder
        s0 = self.enc0(x)
        s1 = self.enc1(s0)
        s2 = self.enc2(s1)
        s3 = self.enc3(s2)
        s4 = self.enc4(s3)
        s5 = self.enc5(s4)
        bn = self.enc6(s5)

        logits        = self.classifier(bn)
        probabilities = F.softmax(logits, dim=1)

        d = self.dec5(bn, s5)
        d = self.dec4(d,  s4)
        d = self.dec3(d,  s3)
        d = self.dec2(d,  s2)
        d = self.dec1(d,  s1)

        mask_logits = self.seg_head(d)
        mask_logits = F.interpolate(
            mask_logits, size=(H, W), mode="bilinear", align_corners=False
        )

        return {
            "logits":        logits,
            "probabilities": probabilities,
            "mask_logits":   mask_logits,
            "mask_probs":    torch.sigmoid(mask_logits),
        }



class UNet(nn.Module):


    def __init__(self, in_channels: int = 3, out_channels: int = 1, base_ch: int = 64):
        super().__init__()

        def _block(in_c, out_c):
            return nn.Sequential(
                nn.Conv2d(in_c, out_c, 3, padding=1, bias=False),
                nn.BatchNorm2d(out_c),
                nn.ReLU(inplace=True),
                nn.Conv2d(out_c, out_c, 3, padding=1, bias=False),
                nn.BatchNorm2d(out_c),
                nn.ReLU(inplace=True),
            )

        ch = base_ch
        self.enc1 = _block(in_channels, ch)
        self.enc2 = _block(ch,    ch*2)
        self.enc3 = _block(ch*2,  ch*4)
        self.enc4 = _block(ch*4,  ch*8)
        self.pool  = nn.MaxPool2d(2)

        self.bottleneck = _block(ch*8, ch*16)

        self.up4  = nn.ConvTranspose2d(ch*16, ch*8, 2, stride=2)
        self.dec4 = _block(ch*16, ch*8)
        self.up3  = nn.ConvTranspose2d(ch*8,  ch*4, 2, stride=2)
        self.dec3 = _block(ch*8,  ch*4)
        self.up2  = nn.ConvTranspose2d(ch*4,  ch*2, 2, stride=2)
        self.dec2 = _block(ch*4,  ch*2)
        self.up1  = nn.ConvTranspose2d(ch*2,  ch,   2, stride=2)
        self.dec1 = _block(ch*2,  ch)

        self.head = nn.Conv2d(ch, out_channels, 1)

    def forward(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))
        bn = self.bottleneck(self.pool(e4))

        d = self.dec4(torch.cat([self.up4(bn), e4], 1))
        d = self.dec3(torch.cat([self.up3(d),  e3], 1))
        d = self.dec2(torch.cat([self.up2(d),  e2], 1))
        d = self.dec1(torch.cat([self.up1(d),  e1], 1))

        mask_logits = self.head(d)
        return {
            "mask_logits": mask_logits,
            "mask_probs":  torch.sigmoid(mask_logits),
        }


# ── Factory function ───────────────────────────────────────────────────────────

def build_model(
    architecture: str = "efficientnet_unet",
    num_classes: int = 2,
    pretrained: bool = True,
) -> nn.Module:

    if architecture == "efficientnet_unet":
        return TumorDetectorUNet(num_classes=num_classes, pretrained=pretrained)
    elif architecture == "unet":
        return UNet()
    elif architecture == "efficientnet":
        return TumorDetector(
            backbone="efficientnet",
            num_classes=num_classes,
            use_segmentation_head=False,
            pretrained=pretrained,
        )
    else:
        raise ValueError(f"Unknown architecture: {architecture}")


if __name__ == "__main__":
    model = build_model("efficientnet_unet")
    model.eval()
    dummy = torch.randn(2, 3, 224, 224)
    with torch.no_grad():
        out = model(dummy)
    print("logits      :", out["logits"].shape)
    print("probabilities:", out["probabilities"].shape)
    print("mask_logits :", out["mask_logits"].shape)
    print("mask_probs  :", out["mask_probs"].shape)
    params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\nTrainable parameters: {params:,}")
