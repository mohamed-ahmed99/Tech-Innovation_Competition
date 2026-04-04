from __future__ import annotations

from enum import Enum
from typing import List

from pydantic import BaseModel, Field, field_validator


class Gender(str, Enum):
    male = "male"
    female = "female"


class TumorLocation(str, Enum):
    frontal = "frontal"
    temporal = "temporal"
    parietal = "parietal"
    occipital = "occipital"
    deep = "deep"


class TumorGrade(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Symptom(str, Enum):
    headache = "headache"
    seizures = "seizures"
    vision_loss = "vision_loss"
    nausea = "nausea"


class PreviousTreatment(str, Enum):
    none = "none"
    surgery = "surgery"
    radiation = "radiation"
    chemo = "chemo"


class PatientProfile(BaseModel):
    age: int = Field(..., ge=1, le=120)
    gender: Gender
    tumor_size_cm: float = Field(..., gt=0.0, le=20.0)
    tumor_location: TumorLocation
    tumor_grade: TumorGrade
    symptoms: List[Symptom] = Field(default_factory=list)
    previous_treatment: PreviousTreatment = PreviousTreatment.none
    performance_status: int = Field(..., ge=0, le=4)

    @field_validator("symptoms")
    @classmethod
    def unique_symptoms(cls, symptoms: List[Symptom]) -> List[Symptom]:
        # Keep deterministic order while removing duplicates.
        return list(dict.fromkeys(symptoms))


class SimulationMetrics(BaseModel):
    tumor_reduction: float = Field(..., ge=0.0, le=1.0)
    risk: float = Field(..., ge=0.0, le=1.0)
    success: float = Field(..., ge=0.0, le=1.0)


class SimulationBundle(BaseModel):
    surgery: SimulationMetrics
    radiation: SimulationMetrics
    chemotherapy: SimulationMetrics


class RecommendationResponse(BaseModel):
    recommended_treatment: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    explanation: str
    simulations: SimulationBundle
