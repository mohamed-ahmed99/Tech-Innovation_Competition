# 🧠 Tumor Detection AI — PyTorch

A production-grade deep learning pipeline for medical image tumor detection.
Supports Brain MRI, CT scans, and X-ray images.

---

## Architecture

```
Input Image (224×224×3)
        │
  ┌─────▼──────────────────────────────────────┐
  │   EfficientNet-B3 Encoder (pretrained)      │
  │   8 stages → 1536-dim bottleneck features  │
  └─────┬───────────────────────┬──────────────┘
        │                       │
  ┌─────▼──────────┐     ┌──────▼──────────────┐
  │ Classification │     │  U-Net Decoder       │
  │     Head       │     │  (skip connections)  │
  │  FC → 2 logits │     │  → (1, H, W) mask    │
  └─────┬──────────┘     └──────┬───────────────┘
        │                       │
  tumor_prob: 0.91        binary_mask: [[0,1,...]]
  location: "left         bounding_box: {x,y,w,h}
   temporal lobe"
```

**Why EfficientNet-B3 + U-Net decoder?**
- EfficientNet-B3 delivers ResNet-50 accuracy with 40% fewer parameters
- Pre-trained on ImageNet → powerful low-level feature detection from day 1
- U-Net skip connections preserve fine spatial details needed for precise segmentation
- Dual-head design means one forward pass gives you both the classification verdict AND the tumour location

---

## Project Structure

```
tumor_detection/
├── config.py               ← All hyperparameters in one place
├── train.py                ← Full training pipeline (run this)
├── inference.py            ← Single-image prediction + Grad-CAM
├── api_adapter.py          ← FastAPI router (mount on your backend)
├── requirements.txt
├── models/
│   └── tumor_detector.py   ← Model architectures (EfficientNet+UNet, UNet, ResNet)
├── data/
│   └── dataset.py          ← Dataset loading, preprocessing, augmentation
└── utils/
    ├── losses.py           ← FocalLoss, DiceLoss, TverskyLoss, CombinedLoss
    └── metrics.py          ← Accuracy, Precision, Recall, F1, AUC, Dice, IoU
```

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Prepare your dataset

```
dataset/
  images/
    scan_001.png
    scan_002.png
    ...
  masks/          ← optional (for segmentation)
    scan_001.png
    ...
  labels.csv      ← filename,label  (label: 0=no tumor, 1=tumor)
```

**Recommended datasets:**
| Dataset | Modality | Size | Link |
|---------|----------|------|------|
| Kaggle Brain MRI | MRI | 3,064 scans | [Kaggle](https://www.kaggle.com/datasets/mateuszbuda/lgg-mri-segmentation) |
| BraTS 2021 | MRI (4 modalities) | 1,251 cases | [Synapse](https://www.synapse.org/#!Synapse:syn25829067) |
| RSNA Hemorrhage | CT | 25,000+ | [Kaggle](https://www.kaggle.com/competitions/rsna-intracranial-hemorrhage-detection) |
| NIH ChestX-ray14 | X-ray | 112,120 | [NIH](https://www.nih.gov) |

### 3. Train the model

```bash
python train.py \
  --data_dir  /path/to/dataset \
  --modality  mri \
  --epochs    50 \
  --has_masks          # remove flag if you don't have segmentation masks
```

Training produces:
- `checkpoints/best_model.pth` — best validation F1
- `checkpoints/last_model.pth` — most recent epoch

### 4. Run inference on a single image

```bash
python inference.py \
  --image      scan.png \
  --checkpoint checkpoints/best_model.pth \
  --modality   mri
```

**Output:**
```json
{
  "tumor_detected": true,
  "confidence": 0.91,
  "location": "left temporal lobe",
  "bounding_box": {"x": 84, "y": 112, "w": 60, "h": 48},
  "raw_scores": {"no_tumor": 0.09, "tumor": 0.91}
}
```

### 5. Connect to your backend API

```python
# In your existing FastAPI main.py:
from api_adapter import router as tumor_router

app.include_router(tumor_router, prefix="/api/v1/tumor")
```

Set environment variables for model checkpoints:
```bash
export TUMOR_CHECKPOINT_BRAIN=/path/to/brain_best_model.pth
export TUMOR_CHECKPOINT_LIVER=/path/to/liver_best_model.pth
export TUMOR_CHECKPOINT_BREAST=/path/to/breast_best_model.pth
export TUMOR_MODALITY=mri
```

Then POST to `/api/v1/tumor/analyze` with a multipart file upload.

For Docker Compose production, map checkpoints like this:
```yaml
environment:
  - TUMOR_CHECKPOINT_BRAIN=/app/checkpoints/brain_best_model.pth
  - TUMOR_CHECKPOINT_LIVER=/app/checkpoints/liver_best_model.pth
  - TUMOR_CHECKPOINT_BREAST=/app/checkpoints/breast_best_model.pth
volumes:
  - ./ai/checkpoints:/app/checkpoints
```

### 6. Train a breast model checkpoint

Use breast/mammography-style datasets with X-ray preprocessing and save output directly as `breast_best_model.pth`:

```bash
python train.py \
  --organ breast \
  --data_dir /path/to/breast_dataset \
  --modality xray \
  --architecture efficientnet \
  --no_masks \
  --checkpoint_dir checkpoints \
  --best_checkpoint_name breast_best_model.pth \
  --last_checkpoint_name breast_last_model.pth
```

If your breast dataset follows the common MRI folder layout with `train/Healthy`, `train/Sick`,
`validation/Healthy`, and `validation/Sick`, prepare it first with:

```bash
python prepare_breast_dataset.py \
  --source_dir "/path/to/Breast Cancer Patients MRI's" \
  --output_dir /path/to/breast_prepared
```

Then train with MRI preprocessing:

```bash
python train.py \
  --organ breast \
  --data_dir /path/to/breast_prepared \
  --modality mri \
  --architecture efficientnet \
  --no_masks \
  --checkpoint_dir checkpoints \
  --best_checkpoint_name breast_best_model.pth \
  --last_checkpoint_name breast_last_model.pth
```

---

## Preprocessing Pipeline

| Modality | Steps |
|----------|-------|
| **MRI** | Z-score normalisation → percentile clip (1st–99th) → resize → RGB repeat → ImageNet normalise |
| **CT** | HU windowing (center=40, width=400) → [0,1] scale → resize → RGB repeat → ImageNet normalise |
| **X-ray** | Z-score normalise → min-max scale → resize → RGB repeat → ImageNet normalise |

**Training augmentations:**
- Random horizontal/vertical flip
- Random rotation ±15°
- Color jitter (brightness/contrast ±20%)
- Random affine translation/scale
- All augmentations applied *synchronously* to image + mask

---

## Training Details

| Hyperparameter | Value | Rationale |
|----------------|-------|-----------|
| Optimizer | AdamW | Better generalisation than Adam via decoupled weight decay |
| LR | 1e-4 | Conservative start for fine-tuning pre-trained backbone |
| Scheduler | Cosine + 5-epoch warmup | Avoids early instability |
| Loss | FocalLoss + TverskyLoss | Handles class imbalance; TverskyLoss penalises missed tumours |
| Seg loss weight | 0.4 | Prevents segmentation from overwhelming classification |
| Grad clipping | max_norm=1.0 | Stabilises pre-trained backbone fine-tuning |
| Mixed precision | AMP (fp16) | 2× faster training on GPU with same accuracy |
| Early stopping | patience=10 | Stops on validation F1 plateau |

---

## Evaluation Metrics

| Metric | What it measures |
|--------|-----------------|
| **Accuracy** | Overall correct predictions |
| **Precision** | Of predicted tumours, how many are real |
| **Recall (Sensitivity)** | Of real tumours, how many are detected ← most critical |
| **Specificity** | Of healthy scans, how many are correctly cleared |
| **F1** | Harmonic mean of precision and recall |
| **AUC-ROC** | Discrimination ability across all thresholds |
| **Dice** | Segmentation mask overlap |
| **IoU (Jaccard)** | Stricter segmentation overlap |

> ⚠️ **For medical AI, recall is the most important metric.** A missed tumour (false negative) is far more dangerous than a false alarm. Monitor sensitivity closely and tune the threshold in `config.py → InferenceConfig.confidence_threshold`.

---

## Architecture Alternatives

| Architecture | Use case | Pros |
|---|---|---|
| `efficientnet_unet` ✅ | Both detection + segmentation | Best overall |
| `unet` | Segmentation only (BraTS) | Simpler, faster |
| `efficientnet` | Classification only | Smallest model |

---

## Disclaimer

> This is a research prototype. It has **not** been validated for clinical use, cleared by any regulatory authority (FDA/CE), or tested on representative clinical populations. Do not use for medical diagnosis. Always involve qualified medical professionals in clinical decisions.
