import { status } from '../config/constants.js';
import asyncHandler from '../middlewares/asyncHandler.js';
import Analysis from '../models/analysis.model.js';

// URL of the Python AI service (set via env var, default to localhost for dev)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Format the raw model JSON into a human-readable medical report.
 */
function formatReport(result) {
    const { tumor_detected, confidence, location, bounding_box, raw_scores } = result;
    const confPct = (confidence * 100).toFixed(1);

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
This is an automated screening result. Please consult with a qualified radiologist for a comprehensive diagnosis.

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
The model has identified a region of concern in the ${location}. This is an automated screening result and should be reviewed by a qualified medical professional for further evaluation.

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
        const formattedReport = formatReport(aiResult);

        // Save to history if user is authenticated
        if (req.user && req.user._id) {
            const title = aiResult.tumor_detected
                ? `⚠️ Tumor detected — ${aiResult.location}`
                : '✅ No tumor detected';

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
            });
        }

        return res.status(200).json({
            status: status.SUCCESS,
            message: 'Image analyzed successfully',
            data: {
                analysis: formattedReport,
                structured: aiResult,
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
        .select('title tumorDetected confidence location modality formattedReport createdAt');

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
