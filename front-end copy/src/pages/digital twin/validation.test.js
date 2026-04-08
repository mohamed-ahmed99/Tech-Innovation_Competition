import test from 'node:test';
import assert from 'node:assert/strict';

import { validateDigitalTwinData } from './validation.js';

test('validateDigitalTwinData accepts contract-aligned payload', () => {
    const result = validateDigitalTwinData({
        age: '42',
        gender: 'male',
        tumor_size_cm: '2.4',
        tumor_location: 'temporal',
        tumor_grade: 'medium',
        symptoms: ['headache', 'nausea'],
        previous_treatment: 'none',
        performance_status: '1',
    });

    assert.equal(result.isValid, true);
    assert.deepEqual(result.errors, {});
});

test('validateDigitalTwinData rejects invalid payload', () => {
    const result = validateDigitalTwinData({
        age: '0',
        gender: 'other',
        tumor_size_cm: '-1',
        tumor_location: 'brainstem',
        tumor_grade: 'critical',
        symptoms: ['fatigue'],
        previous_treatment: 'combined',
        performance_status: '8',
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
});
