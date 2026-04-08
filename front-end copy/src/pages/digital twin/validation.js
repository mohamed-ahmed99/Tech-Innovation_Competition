import {
    DIGITAL_TWIN_GENDERS,
    DIGITAL_TWIN_GRADES,
    DIGITAL_TWIN_LOCATIONS,
    DIGITAL_TWIN_PREVIOUS_TREATMENTS,
    DIGITAL_TWIN_SYMPTOMS,
} from './contract.js';

/**
 * Contract-aligned validation for Digital Twin payload.
 */
export const validateDigitalTwinData = (data) => {
    const errors = {};

    const age = Number.parseInt(data.age, 10);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
        errors.age = 'Age must be an integer between 1 and 120';
    }

    if (!DIGITAL_TWIN_GENDERS.includes(data.gender)) {
        errors.gender = `Gender must be one of: ${DIGITAL_TWIN_GENDERS.join(', ')}`;
    }

    const tumorSize = Number.parseFloat(data.tumor_size_cm);
    if (!Number.isFinite(tumorSize) || tumorSize <= 0 || tumorSize > 20) {
        errors.tumor_size_cm = 'Tumor size must be greater than 0 and at most 20 cm';
    }

    if (!DIGITAL_TWIN_LOCATIONS.includes(data.tumor_location)) {
        errors.tumor_location = `Tumor location must be one of: ${DIGITAL_TWIN_LOCATIONS.join(', ')}`;
    }

    if (!DIGITAL_TWIN_GRADES.includes(data.tumor_grade)) {
        errors.tumor_grade = `Tumor grade must be one of: ${DIGITAL_TWIN_GRADES.join(', ')}`;
    }

    if (!DIGITAL_TWIN_PREVIOUS_TREATMENTS.includes(data.previous_treatment)) {
        errors.previous_treatment = `Previous treatment must be one of: ${DIGITAL_TWIN_PREVIOUS_TREATMENTS.join(', ')}`;
    }

    const performance = Number.parseInt(data.performance_status, 10);
    if (!Number.isInteger(performance) || performance < 0 || performance > 4) {
        errors.performance_status = 'Performance status must be an integer between 0 and 4';
    }

    if (!Array.isArray(data.symptoms)) {
        errors.symptoms = 'Symptoms must be provided as a list';
    } else {
        const invalid = data.symptoms.filter((item) => !DIGITAL_TWIN_SYMPTOMS.includes(item));
        if (invalid.length > 0) {
            errors.symptoms = `Symptoms must be selected from: ${DIGITAL_TWIN_SYMPTOMS.join(', ')}`;
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};
