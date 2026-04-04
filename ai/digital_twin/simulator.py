from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Protocol

from .models import PatientProfile, PreviousTreatment, Symptom, TumorGrade, TumorLocation


@dataclass
class SimulationResult:
    tumor_reduction: float
    risk_score: float
    success_probability: float
    rationale: List[str]


class TreatmentSimulator(Protocol):
    def simulate(self, profile: PatientProfile) -> Dict[str, SimulationResult]:
        ...


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _clamp_range(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


class HeuristicTreatmentSimulator:
    """
    Rule-based simulator for treatment outcomes.

    The implementation is intentionally modular so it can be replaced by
    an ML model later without changing API schemas.
    """

    def simulate(self, profile: PatientProfile) -> Dict[str, SimulationResult]:
        return {
            "surgery": self._simulate_surgery(profile),
            "radiation": self._simulate_radiation(profile),
            "chemotherapy": self._simulate_chemotherapy(profile),
        }

    def _simulate_surgery(self, profile: PatientProfile) -> SimulationResult:
        # Base assumptions for surgery in this simplified model.
        reduction = 0.55
        risk = 0.32
        success = 0.64
        rationale: List[str] = []

        if profile.tumor_size_cm < 3.0:
            reduction += 0.08
            success += 0.07
            rationale.append("Small tumor size favors more complete resection.")
        elif profile.tumor_size_cm > 5.0:
            reduction -= 0.06
            success -= 0.07
            risk += 0.05
            rationale.append("Large tumor size makes full resection less likely.")

        if profile.tumor_location in (TumorLocation.frontal, TumorLocation.temporal):
            reduction += 0.06
            success += 0.06
            risk -= 0.03
            rationale.append("Tumor location is relatively accessible for surgery.")
        elif profile.tumor_location == TumorLocation.deep:
            reduction -= 0.10
            success -= 0.12
            risk += 0.12
            rationale.append("Deep tumor location increases surgical complexity and risk.")

        if profile.age < 60:
            reduction += 0.05
            success += 0.05
            risk -= 0.04
            rationale.append("Younger age generally improves postoperative recovery.")
        elif profile.age >= 70:
            reduction -= 0.06
            success -= 0.07
            risk += 0.08
            rationale.append("Older age increases peri-operative risk in this model.")

        if profile.performance_status <= 1:
            success += 0.03
            risk -= 0.03
        elif profile.performance_status >= 3:
            reduction -= 0.05
            success -= 0.10
            risk += 0.12
            rationale.append("Poor performance status penalizes surgical candidacy.")

        if profile.tumor_grade == TumorGrade.low:
            reduction += 0.02
            success += 0.03
        elif profile.tumor_grade == TumorGrade.high:
            success -= 0.05
            risk += 0.03
            rationale.append("High grade tumor may reduce durable surgical control.")

        if profile.previous_treatment == PreviousTreatment.surgery:
            risk += 0.05
            success -= 0.03
            rationale.append("Prior surgery can increase complexity of repeat operations.")

        # Heuristic range requested for surgery in this design: 0.4..0.7
        reduction = _clamp_range(reduction, 0.40, 0.70)

        return SimulationResult(
            tumor_reduction=_clamp01(reduction),
            risk_score=_clamp01(risk),
            success_probability=_clamp01(success),
            rationale=rationale,
        )

    def _simulate_radiation(self, profile: PatientProfile) -> SimulationResult:
        # Base assumptions for radiation therapy in this simplified model.
        reduction = 0.40
        risk = 0.24
        success = 0.58
        rationale: List[str] = []

        if profile.tumor_size_cm >= 3.0:
            reduction += 0.06
            success += 0.03
            rationale.append("Medium to large tumors are often managed with radiation.")
        if profile.tumor_size_cm > 5.0:
            reduction += 0.03
            risk += 0.02

        if profile.tumor_location == TumorLocation.deep:
            reduction += 0.05
            success += 0.07
            rationale.append("Deep location favors non-surgical local treatment.")

        if profile.age >= 60:
            reduction += 0.03
            success += 0.05
            rationale.append("Older age can shift preference toward less invasive options.")
        if profile.age >= 75:
            risk += 0.04

        if profile.performance_status >= 3:
            risk += 0.04
            success += 0.02
            rationale.append("Poor performance status reduces surgical feasibility.")

        if profile.tumor_grade == TumorGrade.high:
            success -= 0.05
            rationale.append("High grade biology may limit standalone radiation durability.")

        if profile.previous_treatment == PreviousTreatment.radiation:
            risk += 0.10
            success -= 0.06
            rationale.append("Prior radiation increases re-irradiation toxicity risk.")

        # Heuristic range requested for radiation in this design: 0.3..0.5
        reduction = _clamp_range(reduction, 0.30, 0.50)

        return SimulationResult(
            tumor_reduction=_clamp01(reduction),
            risk_score=_clamp01(risk),
            success_probability=_clamp01(success),
            rationale=rationale,
        )

    def _simulate_chemotherapy(self, profile: PatientProfile) -> SimulationResult:
        # Base assumptions for chemotherapy in this simplified model.
        reduction = 0.20
        risk = 0.30
        success = 0.45
        rationale: List[str] = []

        recurrent = profile.previous_treatment != PreviousTreatment.none
        surgery_feasible = (
            profile.tumor_location in (TumorLocation.frontal, TumorLocation.temporal)
            and profile.performance_status <= 2
            and profile.tumor_size_cm < 5.5
        )

        if profile.tumor_grade == TumorGrade.high:
            reduction += 0.08
            success += 0.12
            rationale.append("High grade tumor increases expected chemotherapy benefit.")
        elif profile.tumor_grade == TumorGrade.low:
            reduction -= 0.04
            success -= 0.08

        if recurrent:
            reduction += 0.03
            success += 0.07
            rationale.append("Prior treatment history suggests possible recurrent disease setting.")

        if not surgery_feasible:
            success += 0.05
            rationale.append("Chemotherapy gains relative value when surgery is less feasible.")

        if profile.age >= 70:
            risk += 0.08
            success -= 0.05

        if profile.performance_status >= 3:
            risk += 0.07
            success -= 0.06

        if Symptom.nausea in profile.symptoms:
            risk += 0.03

        if profile.previous_treatment == PreviousTreatment.chemo:
            risk += 0.08
            success -= 0.07
            rationale.append("Previous chemotherapy exposure may reduce response likelihood.")

        # Heuristic range requested for chemotherapy in this design: 0.1..0.3
        reduction = _clamp_range(reduction, 0.10, 0.30)

        return SimulationResult(
            tumor_reduction=_clamp01(reduction),
            risk_score=_clamp01(risk),
            success_probability=_clamp01(success),
            rationale=rationale,
        )
