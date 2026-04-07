import { status } from '../config/constants.js';
import asyncHandler from '../middlewares/asyncHandler.js';
import Analysis from '../models/analysis.model.js';

const DEFAULT_DEV_AI_SERVICE_URL = 'http://localhost:8000';
const DEFAULT_PROD_AI_SERVICE_URL = 'http://159.89.12.125:8000';

function normalizeBaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
}

function resolveAiServiceUrl() {
    const configuredUrl =
        process.env.AI_SERVICE_URL ||
        process.env.AI_BASE_URL ||
        process.env.PYTHON_AI_URL;

    if (configuredUrl) {
        return normalizeBaseUrl(configuredUrl);
    }

    // Keep localhost fallback for local development only.
    if (process.env.NODE_ENV !== 'production') {
        return DEFAULT_DEV_AI_SERVICE_URL;
    }

    // Production safety fallback for current hosted AI service.
    return DEFAULT_PROD_AI_SERVICE_URL;
}

function getAiRequestTimeoutMs() {
    const timeout = Number(process.env.AI_REQUEST_TIMEOUT_MS || 45000);
    return Number.isFinite(timeout) && timeout > 0 ? timeout : 45000;
}

function buildAdvice(result, modality = 'mri') {
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
        expectedOutlook,
        recommendedNextSteps: nextSteps,
        urgentCareFlags: redFlags,
        disclaimer,
    };
}

/**
 * Format the raw model JSON into a human-readable medical report.
 */
function formatReport(result) {
    const { tumor_detected, confidence, location, bounding_box, raw_scores, modality } = result;
    const confPct = (confidence * 100).toFixed(1);
    const advice = buildAdvice(result, modality || 'mri');

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

    const aiServiceUrl = resolveAiServiceUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getAiRequestTimeoutMs());

    try {
        const response = await fetch(`${aiServiceUrl}/api/v1/tumor/analyze`, {
            method: 'POST',
            body: form,
            signal: controller.signal,
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
        const advice = buildAdvice(aiResult, modality);
        const aiResultWithAdvice = {
            ...aiResult,
            advice,
        };
        const formattedReport = formatReport({ ...aiResult, modality });

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
        if (err.name === 'AbortError') {
            return res.status(504).json({
                status: status.ERROR,
                message: 'AI service request timed out. Please try again.',
            });
        }

        console.error('Failed to reach AI service:', err.message);
        return res.status(503).json({
            status: status.ERROR,
            message: 'AI service is unavailable. Please ensure the AI model server is running.',
        });
    } finally {
        clearTimeout(timeoutId);
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
