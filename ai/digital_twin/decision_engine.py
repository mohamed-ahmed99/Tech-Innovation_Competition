from __future__ import annotations

from typing import Dict, Tuple

from .models import PatientProfile, RecommendationResponse, SimulationBundle, SimulationMetrics
from .simulator import SimulationResult


SUCCESS_WEIGHT = 0.6
REDUCTION_WEIGHT = 0.3
RISK_WEIGHT = 0.1


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def compute_final_score(simulation: SimulationResult) -> float:
    return (
        simulation.success_probability * SUCCESS_WEIGHT
        + simulation.tumor_reduction * REDUCTION_WEIGHT
        - simulation.risk_score * RISK_WEIGHT
    )


def _confidence_from_scores(best_score: float, second_score: float) -> float:
    # Confidence is tied to both absolute quality and score margin.
    margin = best_score - second_score
    confidence = 0.55 + (best_score - 0.45) * 0.50 + margin * 1.20
    return _clamp01(confidence)


def _build_explanation(
    treatment_name: str,
    simulation: SimulationResult,
    best_score: float,
    second_score: float,
) -> str:
    margin = best_score - second_score
    key_factors = simulation.rationale[:3]
    factors_text = " ".join(key_factors) if key_factors else "No major modifiers were triggered beyond baseline assumptions."

    return (
        f"{treatment_name.title()} is recommended because it achieved the highest composite score "
        f"using score = (success * 0.6) + (tumor_reduction * 0.3) - (risk * 0.1). "
        f"Predicted tumor reduction is {simulation.tumor_reduction:.2f}, success probability is "
        f"{simulation.success_probability:.2f}, and risk is {simulation.risk_score:.2f}. "
        f"Score margin versus the next best option is {margin:.3f}. "
        f"Key clinical factors: {factors_text}"
    )


def _as_metrics(simulation: SimulationResult) -> SimulationMetrics:
    return SimulationMetrics(
        tumor_reduction=round(simulation.tumor_reduction, 2),
        risk=round(simulation.risk_score, 2),
        success=round(simulation.success_probability, 2),
    )


def generate_recommendation(
    profile: PatientProfile,
    simulations: Dict[str, SimulationResult],
) -> RecommendationResponse:
    del profile  # Reserved for future personalized explainability enrichments.

    scored = {name: compute_final_score(sim) for name, sim in simulations.items()}
    ranked = sorted(scored.items(), key=lambda item: item[1], reverse=True)

    best_treatment, best_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else ranked[0][1]

    return RecommendationResponse(
        recommended_treatment=best_treatment,
        confidence=round(_confidence_from_scores(best_score, second_score), 2),
        explanation=_build_explanation(
            treatment_name=best_treatment,
            simulation=simulations[best_treatment],
            best_score=best_score,
            second_score=second_score,
        ),
        simulations=SimulationBundle(
            surgery=_as_metrics(simulations["surgery"]),
            radiation=_as_metrics(simulations["radiation"]),
            chemotherapy=_as_metrics(simulations["chemotherapy"]),
        ),
    )
