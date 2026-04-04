/**
 * Simple validation for Digital Twin patient data
 * @param {Object} data - The form data object
 * @returns {Object} - An object containing errors, if any
 */
export const validateDigitalTwinData = (data) => {
    const errors = {};

    // Age validation
    if (!data.age) {
        errors.age = "Age is required";
    } else if (data.age <= 0) {
        errors.age = "age must be positive Number";
    }

    // Gender validation
    if (!data.gender) {
        errors.gender = "Gender is required";
    }

    // Tumor Size validation
    if (!data.tumor_size_cm) {
        errors.tumor_size_cm = "Tumor size is required";
    } else if (isNaN(data.tumor_size_cm) || Number(data.tumor_size_cm) <= 0) {
        errors.tumor_size_cm = "Tumor size must be a positive number";
    }

    // Tumor Location validation
    if (!data.tumor_location) {
        errors.tumor_location = "Tumor location is required";
    }

    // Tumor Grade validation
    if (!data.tumor_grade) {
        errors.tumor_grade = "Tumor grade is required";
    }

    // Previous Treatment validation
    if (!data.previous_treatment) {
        errors.previous_treatment = "Previous treatment info is required";
    }

    // Performance Status validation
    if (data.performance_status === undefined || data.performance_status === "") {
        errors.performance_status = "Performance status is required";
    }



    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
