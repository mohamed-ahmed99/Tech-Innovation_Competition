/**
 * Validation utility for Authentication pages
 */

export const validateSignUp = (data) => {
    const errors = {};

    // First Name Validation
    if (!data.firstName || data.firstName.trim().length < 2) {
        errors.firstName = "First name must be at least 2 characters";
    }

    // Last Name Validation
    if (!data.lastName || data.lastName.trim().length < 2) {
        errors.lastName = "Last name must be at least 2 characters";
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        errors.email = "Please enter a valid email address";
    }

    // Phone Number Validation (Mandatory for all fields)
    const phoneRegex = /^(\+20|0)?1[0125]\d{8}$/;
    if (!data.phoneNumber || !data.phoneNumber.trim()) {
        errors.phoneNumber = "Phone number is required";
    } else if (!phoneRegex.test(data.phoneNumber)) {
        errors.phoneNumber = "Please enter a valid Egyptian phone number";
    }

    // Password Validation
    if (!data.password || data.password.length < 8) {
        errors.password = "Password must be at least 8 characters long";
    } else {
        // Optional: Check for complexity
        const hasNumber = /\d/.test(data.password);
        if (!hasNumber) {
            errors.password = "Password should contain at least one number";
        }
    }

    // Address Validation
    if (!data.address || data.address.trim().length < 5) {
        errors.address = "Please enter a full address (min 5 characters)";
    }

    // Gender Validation
    if (!data.gender) {
        errors.gender = "Please select your gender";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

export const validateLogin = (data) => {
    const errors = {};

    if (!data.email) {
        errors.email = "Email is required";
    }

    if (!data.password) {
        errors.password = "Password is required";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
