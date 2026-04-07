import test from 'node:test';
import assert from 'node:assert/strict';

import {
    computeScoreMargin,
    computeTreatmentScore,
    rankTreatmentSimulations,
} from '../src/utils/digitalTwin.scoring.js';

test('computeTreatmentScore applies weighted formula', () => {
    const score = computeTreatmentScore({
        success: 0.74,
        tumor_reduction: 0.66,
        risk: 0.24,
    });

    assert.equal(Number(score.toFixed(3)), 0.618);
});

test('rankTreatmentSimulations sorts from best to worst and computes margin', () => {
    const ranked = rankTreatmentSimulations({
        surgery: { tumor_reduction: 0.66, risk: 0.24, success: 0.74 },
        radiation: { tumor_reduction: 0.43, risk: 0.24, success: 0.58 },
        chemotherapy: { tumor_reduction: 0.28, risk: 0.3, success: 0.57 },
    });

    assert.equal(ranked[0].treatment, 'surgery');
    assert.equal(ranked[1].treatment, 'radiation');
    assert.equal(ranked[2].treatment, 'chemotherapy');

    const margin = computeScoreMargin(ranked);
    assert.equal(margin, 0.165);
});
