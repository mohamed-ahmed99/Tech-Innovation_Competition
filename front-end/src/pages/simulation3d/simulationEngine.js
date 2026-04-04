export const TREATMENTS = {
    surgery: {
        label: 'Surgery',
        color: '#22d3ee',
        reductionBase: 0.62,
        reductionRange: [0.4, 0.7],
        riskBase: 0.28,
        successBase: 0.76,
    },
    radiation: {
        label: 'Radiation Therapy',
        color: '#f59e0b',
        reductionBase: 0.44,
        reductionRange: [0.3, 0.5],
        riskBase: 0.24,
        successBase: 0.62,
    },
    chemotherapy: {
        label: 'Chemotherapy',
        color: '#84cc16',
        reductionBase: 0.24,
        reductionRange: [0.1, 0.3],
        riskBase: 0.34,
        successBase: 0.55,
    },
};

export const TIMELINE_EVENTS = [
    { at: 15, title: 'Initial Exposure' },
    { at: 45, title: 'Peak Dose' },
    { at: 70, title: 'Response Shift' },
    { at: 92, title: 'Stabilization' },
];

export const TUMOR_LOCATIONS = ['frontal', 'temporal', 'parietal', 'occipital', 'deep'];

export const LOBE_LABELS_3D = [
    { key: 'left-frontal', label: 'L Frontal', position: [-0.95, 0.55, 0.35] },
    { key: 'right-frontal', label: 'R Frontal', position: [0.95, 0.55, 0.35] },
    { key: 'left-temporal', label: 'L Temporal', position: [-1.15, -0.25, 0.25] },
    { key: 'right-temporal', label: 'R Temporal', position: [1.15, -0.25, 0.25] },
    { key: 'left-parietal', label: 'L Parietal', position: [-0.85, 0.25, -0.15] },
    { key: 'right-parietal', label: 'R Parietal', position: [0.85, 0.25, -0.15] },
    { key: 'left-occipital', label: 'L Occipital', position: [-1.0, 0.15, -0.65] },
    { key: 'right-occipital', label: 'R Occipital', position: [1.0, 0.15, -0.65] },
    { key: 'deep-core', label: 'Deep Core', position: [0, 0.1, -0.1] },
];

const LOCATION_3D_MAP = {
    frontal: {
        left: [-0.55, 0.42, 0.35],
        right: [0.55, 0.42, 0.35],
    },
    temporal: {
        left: [-0.72, -0.15, 0.25],
        right: [0.72, -0.15, 0.25],
    },
    parietal: {
        left: [-0.48, 0.24, -0.08],
        right: [0.48, 0.24, -0.08],
    },
    occipital: {
        left: [-0.62, 0.14, -0.55],
        right: [0.62, 0.14, -0.55],
    },
    deep: {
        left: [0, 0.04, -0.16],
        right: [0, 0.04, -0.16],
    },
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function computeSimulation(treatmentKey, intensity) {
    const t = TREATMENTS[treatmentKey];
    const i = intensity / 100;

    const reductionRaw = t.reductionBase * (0.74 + i * 0.56);
    const reduction = clamp(reductionRaw, t.reductionRange[0], t.reductionRange[1]);

    const risk = clamp(t.riskBase * (0.9 + i * 0.42), 0.05, 0.95);

    const success = clamp(
        t.successBase + (i - 0.5) * 0.09 - (risk - t.riskBase) * 0.18,
        0.05,
        0.98
    );

    const score = success * 0.6 + reduction * 0.3 - risk * 0.1;

    return {
        reduction,
        risk,
        success,
        score,
    };
}

export function getAllSimulations(intensity) {
    return {
        surgery: computeSimulation('surgery', intensity),
        radiation: computeSimulation('radiation', intensity),
        chemotherapy: computeSimulation('chemotherapy', intensity),
    };
}

export function rankTreatments(simulations) {
    return Object.entries(simulations)
        .map(([key, metrics]) => ({ key, ...metrics }))
        .sort((a, b) => b.score - a.score);
}

export function computeConfidence(simulations) {
    const ranked = rankTreatments(simulations);
    if (!ranked.length) return 0.5;

    const best = ranked[0].score;
    const second = ranked[1] ? ranked[1].score : best;
    const margin = best - second;

    return clamp(0.56 + (best - 0.45) * 0.5 + margin * 1.25, 0, 1);
}

export function getTumorPosition(location, laterality) {
    const entry = LOCATION_3D_MAP[location] || LOCATION_3D_MAP.temporal;
    return entry[location === 'deep' ? 'left' : laterality] || entry.right;
}

export function getActiveLobeKey(location, laterality) {
    if (location === 'deep') return 'deep-core';
    return `${laterality}-${location}`;
}

export function toPercent(value) {
    return `${Math.round(value * 100)}%`;
}
