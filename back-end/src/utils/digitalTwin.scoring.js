export const SUCCESS_WEIGHT = 0.6;
export const REDUCTION_WEIGHT = 0.3;
export const RISK_WEIGHT = 0.1;

const SUPPORTED_TREATMENTS = ['surgery', 'radiation', 'chemotherapy'];

function toFiniteNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

export function computeTreatmentScore(metrics = {}) {
    const success = toFiniteNumber(metrics.success);
    const reduction = toFiniteNumber(metrics.tumor_reduction);
    const risk = toFiniteNumber(metrics.risk);

    return success * SUCCESS_WEIGHT + reduction * REDUCTION_WEIGHT - risk * RISK_WEIGHT;
}

export function rankTreatmentSimulations(simulations = {}) {
    return SUPPORTED_TREATMENTS
        .filter((treatment) => simulations[treatment])
        .map((treatment) => {
            const metrics = simulations[treatment];
            const score = computeTreatmentScore(metrics);

            return {
                treatment,
                score: Number(score.toFixed(3)),
                tumor_reduction: toFiniteNumber(metrics.tumor_reduction),
                risk: toFiniteNumber(metrics.risk),
                success: toFiniteNumber(metrics.success),
            };
        })
        .sort((a, b) => b.score - a.score);
}

export function computeScoreMargin(rankedTreatments = []) {
    if (rankedTreatments.length < 2) {
        return 0;
    }

    return Number((rankedTreatments[0].score - rankedTreatments[1].score).toFixed(3));
}
