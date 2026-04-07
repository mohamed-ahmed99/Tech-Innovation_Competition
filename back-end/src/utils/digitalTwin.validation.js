const GENDERS = ['male', 'female'];
const TUMOR_LOCATIONS = ['frontal', 'temporal', 'parietal', 'occipital', 'deep'];
const TUMOR_GRADES = ['low', 'medium', 'high'];
const SYMPTOMS = ['headache', 'seizures', 'vision_loss', 'nausea'];
const PREVIOUS_TREATMENTS = ['none', 'surgery', 'radiation', 'chemo'];

function normalizeText(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function toInteger(value) {
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number.parseInt(value, 10);
        if (Number.isInteger(parsed)) {
            return parsed;
        }
    }

    return Number.NaN;
}

function toFloat(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return Number.NaN;
}

function normalizeSymptoms(rawSymptoms) {
    const list = Array.isArray(rawSymptoms)
        ? rawSymptoms
        : typeof rawSymptoms === 'string' && rawSymptoms.trim() !== ''
            ? rawSymptoms.split(',')
            : [];

    const seen = new Set();
    const normalized = [];

    for (const item of list) {
        const value = normalizeText(item);
        if (!value || seen.has(value)) {
            continue;
        }

        seen.add(value);
        normalized.push(value);
    }

    return normalized;
}

export function validateDigitalTwinPayload(payload = {}) {
    const errors = {};

    const age = toInteger(payload.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
        errors.age = 'age must be an integer between 1 and 120';
    }

    const gender = normalizeText(payload.gender);
    if (!GENDERS.includes(gender)) {
        errors.gender = `gender must be one of: ${GENDERS.join(', ')}`;
    }

    const tumorSizeCm = toFloat(payload.tumor_size_cm);
    if (!Number.isFinite(tumorSizeCm) || tumorSizeCm <= 0 || tumorSizeCm > 20) {
        errors.tumor_size_cm = 'tumor_size_cm must be a number greater than 0 and at most 20';
    }

    const tumorLocation = normalizeText(payload.tumor_location);
    if (!TUMOR_LOCATIONS.includes(tumorLocation)) {
        errors.tumor_location = `tumor_location must be one of: ${TUMOR_LOCATIONS.join(', ')}`;
    }

    const tumorGrade = normalizeText(payload.tumor_grade);
    if (!TUMOR_GRADES.includes(tumorGrade)) {
        errors.tumor_grade = `tumor_grade must be one of: ${TUMOR_GRADES.join(', ')}`;
    }

    const symptoms = normalizeSymptoms(payload.symptoms);
    const invalidSymptoms = symptoms.filter((symptom) => !SYMPTOMS.includes(symptom));
    if (invalidSymptoms.length > 0) {
        errors.symptoms = `symptoms can only include: ${SYMPTOMS.join(', ')}`;
    }

    const previousTreatment = normalizeText(payload.previous_treatment || 'none');
    if (!PREVIOUS_TREATMENTS.includes(previousTreatment)) {
        errors.previous_treatment = `previous_treatment must be one of: ${PREVIOUS_TREATMENTS.join(', ')}`;
    }

    const performanceStatus = toInteger(payload.performance_status);
    if (!Number.isInteger(performanceStatus) || performanceStatus < 0 || performanceStatus > 4) {
        errors.performance_status = 'performance_status must be an integer between 0 and 4';
    }

    if (Object.keys(errors).length > 0) {
        return {
            isValid: false,
            errors,
            normalizedPayload: null,
        };
    }

    return {
        isValid: true,
        errors: {},
        normalizedPayload: {
            age,
            gender,
            tumor_size_cm: Number(tumorSizeCm.toFixed(2)),
            tumor_location: tumorLocation,
            tumor_grade: tumorGrade,
            symptoms,
            previous_treatment: previousTreatment,
            performance_status: performanceStatus,
        },
    };
}

export const DIGITAL_TWIN_CONTRACT_ENUMS = {
    GENDERS,
    TUMOR_LOCATIONS,
    TUMOR_GRADES,
    SYMPTOMS,
    PREVIOUS_TREATMENTS,
};
