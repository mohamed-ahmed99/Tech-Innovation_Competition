# Liver and Spinal Cord Tumor Dataset Plan

This guide matches the new organ-first routing code (organ -> tumor model).

## 1) Liver Tumor (High Priority, public and reliable)

## LiTS - Liver Tumor Segmentation Challenge
- Modality: CT
- Labels: Liver mask + tumor mask
- Use for: liver organ localization + liver tumor segmentation/detection
- Notes: Strong baseline dataset for liver tumor modeling.

## MSD Task03 Liver (Medical Segmentation Decathlon)
- Modality: CT
- Labels: Liver + tumor segmentation masks
- Use for: robust liver tumor segmentation training and validation
- Notes: Good companion dataset for cross-dataset validation.

## 3D-IRCADb-01
- Modality: CT
- Labels: Liver and lesions
- Use for: improving generalization on different scanners/protocols

## Optional liver additions
- CHAOS challenge data (for liver anatomy pretraining)
- TCGA-LIHC imaging cohorts (for weakly-supervised classification workflows)

## 2) Spinal Cord Tumor (Lower availability, build carefully)

Public spinal cord tumor datasets are smaller and less standardized than liver.
Use a combined strategy:

## TCIA collections (recommended search path)
- Source: The Cancer Imaging Archive (TCIA)
- Search keywords: spinal tumor, spinal cord tumor, intramedullary, ependymoma, astrocytoma, spine metastasis MRI
- Use for: collecting MRI/CT spine cases with lesion labels or radiology reports

## Institutional/consortium data (recommended)
- If possible, curate local or partner-hospital spinal cord tumor MRI data with expert labels.
- Target labels:
  - organ mask (spinal cord)
  - tumor mask or bounding box
  - class label (tumor / no-tumor)

## Pretraining support data (non-tumor anatomy)
- Use spinal MRI anatomy datasets for organ detection pretraining, then fine-tune on tumor-labeled spinal data.

## 3) Recommended download order

1. LiTS
2. MSD Task03 Liver
3. 3D-IRCADb-01
4. TCIA spinal tumor/spine collections
5. Any institutional spinal cord tumor MRI with annotations

## 4) Folder structure to prepare

Use one folder per organ dataset group.

```text
datasets/
  liver/
    images/
    masks/
    labels.csv
  spinal_cord/
    images/
    masks/
    labels.csv
```

`labels.csv` minimum columns:

```csv
filename,label
scan_001.png,1
scan_002.png,0
```

- `label=1` tumor present, `label=0` no tumor
- Keep filenames aligned between `images/` and `masks/`.

## 5) What to train after download

1. Organ classifier (brain vs liver vs spinal_cord)
- Save checkpoint to `ORGAN_CLASSIFIER_CHECKPOINT`

2. Organ-specific tumor models
- Brain checkpoint env: `TUMOR_CHECKPOINT_BRAIN` (or `TUMOR_CHECKPOINT`)
- Liver checkpoint env: `TUMOR_CHECKPOINT_LIVER`
- Spinal cord checkpoint env: `TUMOR_CHECKPOINT_SPINAL_CORD`

## 6) Current behavior in code

- If `organ_hint` is provided, router uses it directly.
- If `ORGAN_CLASSIFIER_CHECKPOINT` exists, organ is auto-detected.
- If classifier is not configured, router falls back to brain with warning.
- Liver/spinal requests require their checkpoints to be configured.
