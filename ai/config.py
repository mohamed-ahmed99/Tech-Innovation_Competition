import os
from dataclasses import dataclass, field
from typing import Tuple, List


@dataclass
class ModelConfig:
    backbone: str = "efficientnet"
    efficientnet_variant: str = "efficientnet_b3"
    num_classes: int = 2
    use_segmentation_head: bool = True
    pretrained: bool = True
    dropout_rate: float = 0.3


@dataclass
class DataConfig:
    image_size: Tuple[int, int] = (224, 224)
    num_channels: int = 3
    train_split: float = 0.70
    val_split: float = 0.15
    test_split: float = 0.15
    mean: Tuple[float, ...] = (0.485, 0.456, 0.406)
    std: Tuple[float, ...] = (0.229, 0.224, 0.225)
    # Augmentation
    augment_train: bool = True
    horizontal_flip_prob: float = 0.5
    vertical_flip_prob: float = 0.3
    rotation_degrees: float = 15.0
    brightness_jitter: float = 0.2


@dataclass
class TrainingConfig:
    epochs: int = 3
    batch_size: int = 8
    learning_rate: float = 1e-4
    weight_decay: float = 1e-5
    scheduler: str = "cosine"
    warmup_epochs: int = 5
    # Loss
    use_focal_loss: bool = True
    focal_alpha: float = 0.25
    focal_gamma: float = 2.0
    seg_loss_weight: float = 0.4
    checkpoint_dir: str = "checkpoints"
    save_best_only: bool = True
    early_stopping_patience: int = 10
    num_workers: int = 0
    pin_memory: bool = True


@dataclass
class InferenceConfig:
    confidence_threshold: float = 0.50
    device: str = "cpu"
    use_gradcam: bool = True
    gradcam_target_layer: str = "features.8"
    bbox_min_area: int = 100

@dataclass
class Config:
    model: ModelConfig = field(default_factory=ModelConfig)
    data: DataConfig = field(default_factory=DataConfig)
    training: TrainingConfig = field(default_factory=TrainingConfig)
    inference: InferenceConfig = field(default_factory=InferenceConfig)

    seed: int = 42
    experiment_name: str = "tumor_detection_v1"

cfg = Config()
