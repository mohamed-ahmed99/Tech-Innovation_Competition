from __future__ import annotations

from fastapi import APIRouter

from .decision_engine import generate_recommendation
from .models import PatientProfile, RecommendationResponse
from .simulator import HeuristicTreatmentSimulator

router = APIRouter(tags=["Digital Twin Recommendation"])
_simulator = HeuristicTreatmentSimulator()


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "engine": "digital_twin_heuristic_v1",
        "mode": "rule-based",
    }


@router.post("/recommend", response_model=RecommendationResponse)
def recommend_treatment(profile: PatientProfile):
    simulations = _simulator.simulate(profile)
    return generate_recommendation(profile, simulations)


@router.get("/contract")
def contract():
    return {
        "endpoint": "/api/v1/digital-twin/recommend",
        "method": "POST",
        "request_content_type": "application/json",
        "request_schema": PatientProfile.model_json_schema(),
        "response_schema": RecommendationResponse.model_json_schema(),
        "notes": [
            "All probabilities are normalized to [0, 1].",
            "This engine is heuristic and designed to be replaced by ML later.",
            "The recommendation is a decision-support output, not a clinical diagnosis.",
        ],
    }
