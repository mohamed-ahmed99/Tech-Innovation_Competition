import test from 'node:test';
import assert from 'node:assert/strict';

import { validateDigitalTwinPayload } from '../src/utils/digitalTwin.validation.js';

test('validateDigitalTwinPayload accepts and normalizes valid payload', () => {
    const result = validateDigitalTwinPayload({
        age: '54',
        gender: 'Male',
        tumor_size_cm: '2.73',
        tumor_location: 'Temporal',
        tumor_grade: 'High',
        symptoms: ['headache', 'headache', 'seizures'],
        previous_treatment: 'none',
        performance_status: '1',
    });

    assert.equal(result.isValid, true);
    assert.deepEqual(result.errors, {});
    assert.deepEqual(result.normalizedPayload, {
        age: 54,
        gender: 'male',
        tumor_size_cm: 2.73,
        tumor_location: 'temporal',
        tumor_grade: 'high',
        symptoms: ['headache', 'seizures'],
        previous_treatment: 'none',
        performance_status: 1,
    });
});

test('validateDigitalTwinPayload returns errors for invalid contract fields', () => {
    const result = validateDigitalTwinPayload({
        age: 200,
        gender: 'other',
        tumor_size_cm: -2,
        tumor_location: 'brainstem',
        tumor_grade: 'critical',
        symptoms: ['fatigue'],
        previous_treatment: 'combined',
        performance_status: 6,
    });

    assert.equal(result.isValid, false);
    assert.ok(result.errors.age);
    assert.ok(result.errors.gender);
    assert.ok(result.errors.tumor_size_cm);
    assert.ok(result.errors.tumor_location);
    assert.ok(result.errors.tumor_grade);
    assert.ok(result.errors.symptoms);
    assert.ok(result.errors.previous_treatment);
    assert.ok(result.errors.performance_status);
    assert.equal(result.normalizedPayload, null);
});
