import { computeTreatmentScore } from './digitalTwin.scoring.js';

const SUCCESS_WEIGHT = 0.6;
const REDUCTION_WEIGHT = 0.3;
const RISK_WEIGHT = 0.1;

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function clampRange(value, low, high) {
    return Math.max(low, Math.min(high, value));
}

function round2(value) {
    return Number(value.toFixed(2));
}

function normalizeSimulationMetrics(simulation) {
    return {
        tumor_reduction: round2(clamp01(simulation.tumor_reduction)),
        risk: round2(clamp01(simulation.risk)),
        success: round2(clamp01(simulation.success)),
    };
}

function simulateSurgery(profile) {
    let reduction = 0.55;
    let risk = 0.32;
    let success = 0.64;
    const rationale = [];

    if (profile.tumor_size_cm < 3.0) {
        reduction += 0.08;
        success += 0.07;
        rationale.push('Small tumor size favors more complete resection.');
    } else if (profile.tumor_size_cm > 5.0) {
        reduction -= 0.06;
        success -= 0.07;
        risk += 0.05;
        rationale.push('Large tumor size makes full resection less likely.');
    }

    if (profile.tumor_location === 'frontal' || profile.tumor_location === 'temporal') {
        reduction += 0.06;
        success += 0.06;
        risk -= 0.03;
        rationale.push('Tumor location is relatively accessible for surgery.');
    } else if (profile.tumor_location === 'deep') {
        reduction -= 0.1;
        success -= 0.12;
        risk += 0.12;
        rationale.push('Deep tumor location increases surgical complexity and risk.');
    }

    if (profile.age < 60) {
        reduction += 0.05;
        success += 0.05;
        risk -= 0.04;
        rationale.push('Younger age generally improves postoperative recovery.');
    } else if (profile.age >= 70) {
        reduction -= 0.06;
        success -= 0.07;
        risk += 0.08;
        rationale.push('Older age increases peri-operative risk in this model.');
    }

    if (profile.performance_status <= 1) {
        success += 0.03;
        risk -= 0.03;
    } else if (profile.performance_status >= 3) {
        reduction -= 0.05;
        success -= 0.1;
        risk += 0.12;
        rationale.push('Poor performance status penalizes surgical candidacy.');
    }

    if (profile.tumor_grade === 'low') {
        reduction += 0.02;
        success += 0.03;
    } else if (profile.tumor_grade === 'high') {
        success -= 0.05;
        risk += 0.03;
        rationale.push('High grade tumor may reduce durable surgical control.');
    }

    if (profile.previous_treatment === 'surgery') {
        risk += 0.05;
        success -= 0.03;
        rationale.push('Prior surgery can increase complexity of repeat operations.');
    }

    reduction = clampRange(reduction, 0.4, 0.7);

    return {
        ...normalizeSimulationMetrics({ tumor_reduction: reduction, risk, success }),
        rationale,
    };
}

function simulateRadiation(profile) {
    let reduction = 0.4;
    let risk = 0.24;
    let success = 0.58;
    const rationale = [];

    if (profile.tumor_size_cm >= 3.0) {
        reduction += 0.06;
        success += 0.03;
        rationale.push('Medium to large tumors are often managed with radiation.');
    }
    if (profile.tumor_size_cm > 5.0) {
        reduction += 0.03;
        risk += 0.02;
    }

    if (profile.tumor_location === 'deep') {
        reduction += 0.05;
        success += 0.07;
        rationale.push('Deep location favors non-surgical local treatment.');
    }

    if (profile.age >= 60) {
        reduction += 0.03;
        success += 0.05;
        rationale.push('Older age can shift preference toward less invasive options.');
    }
    if (profile.age >= 75) {
        risk += 0.04;
    }

    if (profile.performance_status >= 3) {
        risk += 0.04;
        success += 0.02;
        rationale.push('Poor performance status reduces surgical feasibility.');
    }

    if (profile.tumor_grade === 'high') {
        success -= 0.05;
        rationale.push('High grade biology may limit standalone radiation durability.');
    }

    if (profile.previous_treatment === 'radiation') {
        risk += 0.1;
        success -= 0.06;
        rationale.push('Prior radiation increases re-irradiation toxicity risk.');
    }

    reduction = clampRange(reduction, 0.3, 0.5);

    return {
        ...normalizeSimulationMetrics({ tumor_reduction: reduction, risk, success }),
        rationale,
    };
}

function simulateChemotherapy(profile) {
    let reduction = 0.2;
    let risk = 0.3;
    let success = 0.45;
    const rationale = [];

    const recurrent = profile.previous_treatment !== 'none';
    const surgeryFeasible =
        (profile.tumor_location === 'frontal' || profile.tumor_location === 'temporal') &&
        profile.performance_status <= 2 &&
        profile.tumor_size_cm < 5.5;

    if (profile.tumor_grade === 'high') {
        reduction += 0.08;
        success += 0.12;
        rationale.push('High grade tumor increases expected chemotherapy benefit.');
    } else if (profile.tumor_grade === 'low') {
        reduction -= 0.04;
        success -= 0.08;
    }

    if (recurrent) {
        reduction += 0.03;
        success += 0.07;
        rationale.push('Prior treatment history suggests possible recurrent disease setting.');
    }

    if (!surgeryFeasible) {
        success += 0.05;
        rationale.push('Chemotherapy gains relative value when surgery is less feasible.');
    }

    if (profile.age >= 70) {
        risk += 0.08;
        success -= 0.05;
    }

    if (profile.performance_status >= 3) {
        risk += 0.07;
        success -= 0.06;
    }

    if (Array.isArray(profile.symptoms) && profile.symptoms.includes('nausea')) {
        risk += 0.03;
    }

    if (profile.previous_treatment === 'chemo') {
        risk += 0.08;
        success -= 0.07;
        rationale.push('Previous chemotherapy exposure may reduce response likelihood.');
    }

    reduction = clampRange(reduction, 0.1, 0.3);

    return {
        ...normalizeSimulationMetrics({ tumor_reduction: reduction, risk, success }),
        rationale,
    };
}

function confidenceFromScores(bestScore, secondScore) {
    const margin = bestScore - secondScore;
    const confidence = 0.55 + (bestScore - 0.45) * 0.5 + margin * 1.2;
    return round2(clamp01(confidence));
}

function buildExplanation(treatment, simulation, bestScore, secondScore) {
    const margin = bestScore - secondScore;
    const factors = Array.isArray(simulation.rationale) && simulation.rationale.length > 0
        ? simulation.rationale.slice(0, 3).join(' ')
        : 'No major modifiers were triggered beyond baseline assumptions.';

    return (
        `${treatment.charAt(0).toUpperCase()}${treatment.slice(1)} is recommended because it achieved the highest composite score ` +
        `using score = (success * ${SUCCESS_WEIGHT}) + (tumor_reduction * ${REDUCTION_WEIGHT}) - (risk * ${RISK_WEIGHT}). ` +
        `Predicted tumor reduction is ${simulation.tumor_reduction.toFixed(2)}, success probability is ${simulation.success.toFixed(2)}, ` +
        `and risk is ${simulation.risk.toFixed(2)}. Score margin versus the next best option is ${margin.toFixed(3)}. ` +
        `Key clinical factors: ${factors}`
    );
}

export function generateFallbackRecommendation(profile) {
    const simulationsWithRationale = {
        surgery: simulateSurgery(profile),
        radiation: simulateRadiation(profile),
        chemotherapy: simulateChemotherapy(profile),
    };

    const simulations = {
        surgery: normalizeSimulationMetrics(simulationsWithRationale.surgery),
        radiation: normalizeSimulationMetrics(simulationsWithRationale.radiation),
        chemotherapy: normalizeSimulationMetrics(simulationsWithRationale.chemotherapy),
    };

    const scored = Object.entries(simulations)
        .map(([treatment, metrics]) => ({
            treatment,
            score: computeTreatmentScore(metrics),
        }))
        .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const second = scored[1] || scored[0];
    const bestSimulation = simulationsWithRationale[best.treatment];

    return {
        recommended_treatment: best.treatment,
        confidence: confidenceFromScores(best.score, second.score),
        explanation: buildExplanation(best.treatment, bestSimulation, best.score, second.score),
        simulations,
        engine: 'digital_twin_js_fallback_v1',
        mode: 'rule-based-fallback',
    };
}

export function fallbackHealthResponse() {
    return {
        status: 'ok',
        engine: 'digital_twin_js_fallback_v1',
        mode: 'rule-based-fallback',
        source: 'backend-fallback',
    };
}

export function fallbackContractResponse() {
    return {
        endpoint: '/api/ai/digital-twin/recommend',
        method: 'POST',
        request_content_type: 'application/json',
        request_schema: {
            type: 'object',
            required: [
                'age',
                'gender',
                'tumor_size_cm',
                'tumor_location',
                'tumor_grade',
                'performance_status',
            ],
        },
        response_schema: {
            type: 'object',
            required: ['recommended_treatment', 'confidence', 'explanation', 'simulations'],
        },
        notes: [
            'Fallback contract generated by backend when AI digital twin upstream is unavailable.',
            'Values follow the same response keys as the AI digital twin contract.',
        ],
    };
}
