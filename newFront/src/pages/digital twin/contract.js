export const DIGITAL_TWIN_GENDERS = ['male', 'female'];
export const DIGITAL_TWIN_LOCATIONS = ['frontal', 'temporal', 'parietal', 'occipital', 'deep'];
export const DIGITAL_TWIN_GRADES = ['low', 'medium', 'high'];
export const DIGITAL_TWIN_SYMPTOMS = ['headache', 'seizures', 'vision_loss', 'nausea'];
export const DIGITAL_TWIN_PREVIOUS_TREATMENTS = ['none', 'surgery', 'radiation', 'chemo'];

export const TREATMENT_LABELS = {
    surgery: 'Surgery',
    radiation: 'Radiation Therapy',
    chemotherapy: 'Chemotherapy',
    chemo: 'Chemotherapy',
};

export function toTitleCase(value = '') {
    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function treatmentLabel(value = '') {
    return TREATMENT_LABELS[value] || toTitleCase(value);
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function recommendationToSimulationQuery(resultData, fallbackTumorLocation = 'temporal') {
    const recommendation = resultData?.recommendation || {};
    const simulations = recommendation?.simulations || {};
    const treatment = recommendation.recommended_treatment || 'surgery';

    const selectedMetrics = simulations[treatment] || {};
    const confidence = Number(recommendation.confidence || 0);
    const intensity = clamp(
        Math.round((Number(selectedMetrics.success || confidence || 0.65)) * 100),
        20,
        100
    );

    return {
        source: 'digital-twin',
        treatment,
        tumorLocation: resultData?.input_profile?.tumor_location || fallbackTumorLocation || 'temporal',
        intensity: String(intensity),
        confidence: String(Math.round(confidence * 100)),
    };
}
