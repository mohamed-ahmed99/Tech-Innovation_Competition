import { status } from '../config/constants.js';
import asyncHandler from '../middlewares/asyncHandler.js';
import Analysis from '../models/analysis.model.js';

// URL of the Python AI service.
// Priority: explicit env -> public fallback host -> localhost for local dev.
const AI_SERVICE_URL =
    process.env.AI_SERVICE_URL ||
    process.env.PUBLIC_AI_SERVICE_URL ||
    'http://159.89.12.125:8000';

function parseDigitalTwinProfile(rawDigitalTwin) {
    if (!rawDigitalTwin) return null;

    if (typeof rawDigitalTwin === 'object') {
        return rawDigitalTwin;
    }

    if (typeof rawDigitalTwin === 'string') {
        try {
            return JSON.parse(rawDigitalTwin);
        } catch {
            return null;
        }
    }

    return null;
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function buildTwinAwareTreatmentComparison(treatmentOptions = [], digitalTwin = null, detected = false) {
    if (!digitalTwin || !Array.isArray(treatmentOptions) || treatmentOptions.length === 0) {
        return treatmentOptions.slice(0, 3).map((name, index) => ({
            rank: index + 1,
            name,
            suitabilityScore: Math.max(50, 85 - index * 10),
            rationale: 'Baseline ranking from current AI findings.',
        }));
    }

    const tumorGrade = String(digitalTwin.tumor_grade || '').toLowerCase();
    const previousTreatment = String(digitalTwin.previous_treatment || '').toLowerCase();
    const performanceStatus = toNumber(digitalTwin.performance_status, 0);
    const tumorSizeCm = toNumber(digitalTwin.tumor_size_cm, 0);
    const symptoms = Array.isArray(digitalTwin.symptoms)
        ? digitalTwin.symptoms.map((item) => String(item).toLowerCase())
        : [];

    const redFlagKeywords = ['seizure', 'weakness', 'vomit', 'headache', 'vision'];
    const hasRedFlagSymptoms = symptoms.some((symptom) =>
        redFlagKeywords.some((keyword) => symptom.includes(keyword))
    );

    const ranked = treatmentOptions.slice(0, 3).map((option, index) => {
        const optionName = String(option || 'Treatment option');
        const lowerOption = optionName.toLowerCase();
        const rationale = ['Aligned with model findings.'];
        let score = 82 - index * 10;

        if (tumorGrade === 'high') {
            if (/combined|radiation|chemotherapy|systemic/.test(lowerOption)) {
                score += 15;
                rationale.push('High-grade profile favors stronger multi-modality control.');
            } else {
                score -= 10;
                rationale.push('High-grade profile may require escalation beyond conservative options.');
            }
        }

        if (tumorGrade === 'low' && /surgery|targeted|localized/.test(lowerOption)) {
            score += 8;
            rationale.push('Low-grade profile can benefit from localized disease control plans.');
        }

        if (previousTreatment && previousTreatment !== 'none') {
            if (lowerOption.includes(previousTreatment)) {
                score -= 6;
                rationale.push(`Prior ${previousTreatment} suggests re-evaluating repeated single-line strategy.`);
            } else {
                score += 5;
                rationale.push(`Alternative to prior ${previousTreatment} may improve treatment sequencing.`);
            }
        }

        if (performanceStatus >= 3) {
            if (/supportive|palliative|symptom|care/.test(lowerOption)) {
                score += 18;
                rationale.push('Performance status indicates supportive-first planning is important.');
            } else {
                score -= 7;
                rationale.push('High-intensity therapy should be balanced against tolerance limits.');
            }
        }

        if (tumorSizeCm >= 4 && /surgery|combined|debulking/.test(lowerOption)) {
            score += 8;
            rationale.push('Larger lesion size can favor debulking-focused pathways.');
        }

        if (detected && hasRedFlagSymptoms) {
            score += 4;
            rationale.push('Current symptom burden supports expedited specialist action.');
        }

        score = Math.max(1, Math.min(99, score));

        return {
            rank: index + 1,
            name: optionName,
            suitabilityScore: score,
            rationale: rationale.join(' '),
        };
    });

    return ranked
        .sort((a, b) => b.suitabilityScore - a.suitabilityScore)
        .map((item, index) => ({ ...item, rank: index + 1 }));
}

function buildDigitalTwinSummary(digitalTwin) {
    if (!digitalTwin) return null;

    return {
        age: toNumber(digitalTwin.age, 0) || null,
        gender: digitalTwin.gender || 'unspecified',
        tumorGrade: digitalTwin.tumor_grade || 'unknown',
        priorTreatment: digitalTwin.previous_treatment || 'none',
        performanceStatus: toNumber(digitalTwin.performance_status, 0),
        tumorSizeCm: toNumber(digitalTwin.tumor_size_cm, 0) || null,
    };
}

function buildAdvice(result, modality = 'mri', digitalTwin = null) {
    const detected = Boolean(result?.tumor_detected ?? result?.tumorDetected);
    const confidence = Number(result?.confidence || 0);
    const location = result?.location || 'undetermined region';
    const organ = result?.detected_organ || result?.body_region || result?.bodyRegion || 'brain';
    const urgencyLevel = result?.urgency_level || 'routine';

    const findings = detected
        ? `Potential tumor-like finding detected in ${organ} (${location}, ${modality.toUpperCase()} scan).`
        : `No tumor-like finding detected in ${organ} on this ${modality.toUpperCase()} scan by the current model.`;

    const explanation =
        result?.explanation ||
        (detected
            ? `The AI model detected a suspicious pattern in ${organ}. This is a screening signal and requires specialist confirmation.`
            : `The AI model did not detect a suspicious tumor-like pattern in ${organ}. This does not replace clinical diagnosis.`);

    const nextSteps = Array.isArray(result?.next_steps) && result.next_steps.length > 0
        ? result.next_steps
        : detected
            ? [
                'Arrange specialist follow-up and radiology confirmation.',
                'Share prior imaging for comparison during consultation.',
              ]
            : [
                'Continue routine follow-up with your clinician.',
                'If symptoms persist, discuss repeat imaging.',
              ];

        const treatmentOptions = Array.isArray(result?.treatment_options) && result.treatment_options.length > 0
                ? result.treatment_options
                : detected
                        ? [
                                'Confirm diagnosis with specialist imaging/pathology before definitive treatment.',
                                'Discuss surgery, radiotherapy, and/or systemic therapy options with oncology team.',
                                'Add supportive care for symptom control and quality of life.',
                            ]
                        : [
                                'Usually no immediate intervention based on this AI screen alone.',
                                'Continue routine follow-up and symptom-guided care with clinician advice.',
                                'Repeat imaging only when clinically indicated.',
                            ];

        const expectedOutlook =
                result?.expected_outlook ||
                (detected
                        ? 'Outlook depends on confirmed diagnosis, stage, and response to treatment. Early specialist care improves outcomes.'
                        : 'Current AI screening result is reassuring, but prognosis should always be confirmed by clinical evaluation.');

    const treatmentComparison = buildTwinAwareTreatmentComparison(treatmentOptions, digitalTwin, detected);
    const suggestedTreatment = treatmentComparison[0]?.name || treatmentOptions[0] || 'Not available';
    const digitalTwinSummary = buildDigitalTwinSummary(digitalTwin);

    const redFlags = Array.isArray(result?.red_flags) && result.red_flags.length > 0
        ? result.red_flags
        : [
            'New seizures or loss of consciousness',
            'Sudden one-sided weakness or numbness',
            'Severe persistent headache with vomiting',
            'Acute confusion, speech, or vision changes',
          ];

    const disclaimer =
        result?.disclaimer ||
        'This AI output is a screening aid and not a diagnosis. Please consult a licensed clinician.';

    return {
        findings,
        explanation,
        confidencePercent: Number((confidence * 100).toFixed(1)),
        urgencyLevel,
        treatmentOptions,
        suggestedTreatment,
        treatmentComparison,
        digitalTwinSummary,
        expectedOutlook,
        recommendedNextSteps: nextSteps,
        urgentCareFlags: redFlags,
        disclaimer,
    };
}

/**
 * Format the raw model JSON into a human-readable medical report.
 */
function formatReport(result, adviceOverride = null) {
    const { tumor_detected, confidence, location, bounding_box, raw_scores, modality } = result;
    const confPct = (confidence * 100).toFixed(1);
    const advice = adviceOverride || buildAdvice(result, modality || 'mri');
    const topThreePlans = advice.treatmentComparison?.length
        ? advice.treatmentComparison.map((plan) => `- #${plan.rank} ${plan.name} (fit ${plan.suitabilityScore}%)`)
        : ['- No treatment comparison available'];

    const twinSummary = advice.digitalTwinSummary
        ? `🧬 Digital Twin Context:
  • Age: ${advice.digitalTwinSummary.age ?? 'n/a'}
  • Tumor grade: ${advice.digitalTwinSummary.tumorGrade}
  • Previous treatment: ${advice.digitalTwinSummary.priorTreatment}
  • ECOG status: ${advice.digitalTwinSummary.performanceStatus}`
        : '🧬 Digital Twin Context: Not provided';

    if (!tumor_detected) {
        return `🧠 NeuroGuard Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Result: No tumor detected

📊 Confidence: ${confPct}%
The model did not identify any abnormal regions in this scan with the current threshold.

📋 Score Breakdown:
  • Normal: ${(raw_scores.no_tumor * 100).toFixed(1)}%
  • Tumor:  ${(raw_scores.tumor * 100).toFixed(1)}%

💡 Recommendation:
${advice.recommendedNextSteps.join('\n')}

🧾 Explanation:
${advice.explanation}

💊 Treatment discussion points:
${advice.treatmentOptions.map((item) => `- ${item}`).join('\n')}

📈 Expected outlook:
${advice.expectedOutlook}

🎯 Suggested treatment from Digital Twin:
${advice.suggestedTreatment}

🧪 Top 3 personalized treatment paths:
${topThreePlans.join('\n')}

${twinSummary}

⚠️ When to seek urgent care:
${advice.urgentCareFlags.map((item) => `- ${item}`).join('\n')}

📝 Disclaimer:
${advice.disclaimer}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered by NeuroGuard AI`;
    }

    return `🧠 NeuroGuard Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Result: Tumor Detected

📍 Location: ${location}
📊 Confidence: ${confPct}%

🔬 Detected Region:
  • Position: x=${bounding_box.x}, y=${bounding_box.y}
  • Size: ${bounding_box.w} × ${bounding_box.h} pixels

📋 Score Breakdown:
  • Normal: ${(raw_scores.no_tumor * 100).toFixed(1)}%
  • Tumor:  ${(raw_scores.tumor * 100).toFixed(1)}%

💡 Recommendation:
${advice.recommendedNextSteps.join('\n')}

🧾 Explanation:
${advice.explanation}

💊 Treatment discussion points:
${advice.treatmentOptions.map((item) => `- ${item}`).join('\n')}

📈 Expected outlook:
${advice.expectedOutlook}

🎯 Suggested treatment from Digital Twin:
${advice.suggestedTreatment}

🧪 Top 3 personalized treatment paths:
${topThreePlans.join('\n')}

${twinSummary}

⚠️ When to seek urgent care:
${advice.urgentCareFlags.map((item) => `- ${item}`).join('\n')}

📝 Disclaimer:
${advice.disclaimer}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered by NeuroGuard AI`;
}


/**
 * POST /api/ai/analyze
 * Receives an image upload, forwards it to the Python AI service,
 * formats the result, saves to history, and returns the report.
 */
export const analyzeImage = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            status: status.FAIL,
            message: 'No image file provided',
        });
    }

    const modality = req.body.modality || 'mri';
    const digitalTwinProfile = parseDigitalTwinProfile(req.body.digital_twin || req.body.digitalTwin);

    // Build multipart form using Node's native FormData/Blob for undici fetch compatibility.
    const form = new FormData();
    const fileBlob = new Blob([req.file.buffer], {
        type: req.file.mimetype || 'application/octet-stream',
    });

    form.append('file', fileBlob, req.file.originalname || 'scan.png');
    form.append('modality', modality);
    if (req.body.organ_hint || req.body.organHint) {
        form.append('organ_hint', req.body.organ_hint || req.body.organHint);
    }
    form.append('threshold', req.body.threshold || '0.50');
    form.append('return_heatmap', 'false');

    try {
        const response = await fetch(`${AI_SERVICE_URL}/api/v1/tumor/analyze`, {
            method: 'POST',
            body: form,
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('AI service error:', response.status, errBody);
            return res.status(502).json({
                status: status.ERROR,
                message: 'AI service returned an error',
                detail: errBody,
            });
        }

        const aiResult = await response.json();
        const advice = buildAdvice(aiResult, modality, digitalTwinProfile);
        const aiResultWithAdvice = {
            ...aiResult,
            advice,
            digital_twin_profile: digitalTwinProfile,
        };
        const formattedReport = formatReport({ ...aiResult, modality }, advice);

        // Save to history if user is authenticated
        if (req.user && req.user._id) {
            const detectedOrgan = aiResult.detected_organ || aiResult.body_region || 'brain';
            const title = aiResult.tumor_detected
                ? `⚠️ Tumor detected — ${detectedOrgan}`
                : `✅ No tumor detected — ${detectedOrgan}`;

            await Analysis.create({
                userId:          req.user._id,
                title,
                tumorDetected:   aiResult.tumor_detected,
                confidence:      aiResult.confidence,
                location:        aiResult.location,
                boundingBox:     aiResult.bounding_box,
                rawScores:       aiResult.raw_scores,
                formattedReport,
                modality,
                urgencyLevel:    aiResult.urgency_level || advice.urgencyLevel,
                nextSteps:       aiResult.next_steps || advice.recommendedNextSteps,
                explanation:     aiResult.explanation || advice.explanation,
                treatmentOptions: aiResult.treatment_options || advice.treatmentOptions,
                expectedOutlook: aiResult.expected_outlook || advice.expectedOutlook,
                redFlags:        aiResult.red_flags || advice.urgentCareFlags,
                disclaimer:      aiResult.disclaimer || advice.disclaimer,
                bodyRegion:      aiResult.body_region || detectedOrgan,
                detectedOrgan,
                organDetectionConfidence: aiResult.organ_detection_confidence || 0,
                organDetectionSource: aiResult.organ_detection_source || 'unknown',
                organDetectionWarning: aiResult.organ_detection_warning || '',
            });
        }

        return res.status(200).json({
            status: status.SUCCESS,
            message: 'Image analyzed successfully',
            data: {
                analysis: formattedReport,
                structured: aiResultWithAdvice,
            },
        });
    } catch (err) {
        console.error('Failed to reach AI service:', err.message);
        return res.status(503).json({
            status: status.ERROR,
            message: 'AI service is unavailable. Please ensure the AI model server is running.',
        });
    }
});


/**
 * GET /api/ai/history
 * Fetch the current user's past analyses.
 */
export const getHistory = asyncHandler(async (req, res) => {
    const analyses = await Analysis.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('title tumorDetected confidence location modality formattedReport urgencyLevel nextSteps explanation treatmentOptions expectedOutlook redFlags disclaimer bodyRegion detectedOrgan organDetectionConfidence organDetectionSource organDetectionWarning createdAt');

    return res.status(200).json({
        status: status.SUCCESS,
        data: { history: analyses },
    });
});


/**
 * GET /api/ai/history/:id
 * Fetch a single analysis by ID.
 */
export const getAnalysisById = asyncHandler(async (req, res) => {
    const analysis = await Analysis.findOne({
        _id: req.params.id,
        userId: req.user._id,
    });

    if (!analysis) {
        return res.status(404).json({
            status: status.FAIL,
            message: 'Analysis not found',
        });
    }

    return res.status(200).json({
        status: status.SUCCESS,
        data: { analysis },
    });
});


/**
 * DELETE /api/ai/history/:id
 * Delete a specific history entry.
 */
export const deleteAnalysis = asyncHandler(async (req, res) => {
    const result = await Analysis.findOneAndDelete({
        _id: req.params.id,
        userId: req.user._id,
    });

    if (!result) {
        return res.status(404).json({
            status: status.FAIL,
            message: 'Analysis not found',
        });
    }

    return res.status(200).json({
        status: status.SUCCESS,
        message: 'Analysis deleted',
    });
});
