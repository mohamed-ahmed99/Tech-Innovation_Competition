import { status } from '../config/constants.js';
import asyncHandler from '../middlewares/asyncHandler.js';
import DigitalTwinRun from '../models/digitalTwinRun.model.js';
import {
    fallbackContractResponse,
    fallbackHealthResponse,
    generateFallbackRecommendation,
} from '../utils/digitalTwin.fallbackEngine.js';
import { computeScoreMargin, rankTreatmentSimulations } from '../utils/digitalTwin.scoring.js';
import { validateDigitalTwinPayload } from '../utils/digitalTwin.validation.js';

const DEFAULT_DEV_AI_SERVICE_URL = 'http://localhost:8000';
const DEFAULT_PROD_AI_SERVICE_URL = 'http://159.89.12.125:8000';
const DIGITAL_TWIN_DISCLAIMER =
    'This recommendation is for clinical decision support and education only. It does not replace physician judgment.';

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

    if (process.env.NODE_ENV !== 'production') {
        return DEFAULT_DEV_AI_SERVICE_URL;
    }

    return DEFAULT_PROD_AI_SERVICE_URL;
}

function getAiRequestTimeoutMs() {
    const timeout = Number(process.env.AI_REQUEST_TIMEOUT_MS || 45000);
    return Number.isFinite(timeout) && timeout > 0 ? timeout : 45000;
}

function extractErrorMessage(errorBody) {
    if (!errorBody) {
        return 'AI service returned an error';
    }

    try {
        const parsed = JSON.parse(errorBody);
        if (typeof parsed.detail === 'string' && parsed.detail.trim() !== '') {
            return parsed.detail;
        }
        if (typeof parsed.message === 'string' && parsed.message.trim() !== '') {
            return parsed.message;
        }
    } catch {
        // Keep raw error body.
    }

    return errorBody;
}

function shouldUseLocalFallback(statusCode, detail = '') {
    if (statusCode === 404) {
        return true;
    }

    return typeof detail === 'string' && /not found/i.test(detail);
}

function createRecommendationPayload(inputProfile, aiResult, savedRun = null) {
    const ranked = rankTreatmentSimulations(aiResult?.simulations || {});
    const scoreMargin = computeScoreMargin(ranked);
    const alternatives = ranked.slice(1);

    return {
        recommendation: {
            recommended_treatment: aiResult?.recommended_treatment,
            confidence: aiResult?.confidence,
            explanation: aiResult?.explanation,
            simulations: aiResult?.simulations,
        },
        alternatives,
        score_margin: scoreMargin,
        engine: aiResult?.engine || 'digital_twin_heuristic_v1',
        mode: aiResult?.mode || 'rule-based',
        disclaimer: DIGITAL_TWIN_DISCLAIMER,
        input_profile: inputProfile,
        saved_run: savedRun
            ? {
                id: String(savedRun._id),
                createdAt: savedRun.createdAt,
              }
            : null,
    };
}

function mapRunToResponse(run) {
    return {
        id: String(run._id),
        createdAt: run.createdAt,
        recommendation: {
            recommended_treatment: run.recommendation.recommended_treatment,
            confidence: run.recommendation.confidence,
            explanation: run.recommendation.explanation,
            simulations: run.simulations,
        },
        alternatives: run.alternatives,
        score_margin: run.scoreMargin,
        disclaimer: run.disclaimer || DIGITAL_TWIN_DISCLAIMER,
        input_profile: run.inputProfile,
        contract_version: run.contractVersion,
        engine: run.contractVersion,
    };
}

async function proxyDigitalTwinGet(path) {
    const aiServiceUrl = resolveAiServiceUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getAiRequestTimeoutMs());

    try {
        const response = await fetch(`${aiServiceUrl}${path}`, {
            method: 'GET',
            signal: controller.signal,
        });

        const bodyText = await response.text();
        let body = null;
        try {
            body = bodyText ? JSON.parse(bodyText) : null;
        } catch {
            body = { detail: bodyText };
        }

        return { ok: response.ok, statusCode: response.status, body };
    } finally {
        clearTimeout(timeoutId);
    }
}

export const createDigitalTwin = asyncHandler(async (req, res) => {
    const { isValid, errors, normalizedPayload } = validateDigitalTwinPayload(req.body || {});

    if (!isValid) {
        return res.status(400).json({
            status: status.FAIL,
            message: 'Invalid digital twin payload',
            data: { errors },
        });
    }

    const aiServiceUrl = resolveAiServiceUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getAiRequestTimeoutMs());
    let aiResult = null;
    let usedFallback = false;

    try {
        const response = await fetch(`${aiServiceUrl}/api/v1/digital-twin/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(normalizedPayload),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errBody = await response.text();
            const detail = extractErrorMessage(errBody);

            if (shouldUseLocalFallback(response.status, detail)) {
                aiResult = generateFallbackRecommendation(normalizedPayload);
                usedFallback = true;
            } else {
                // Map upstream 4xx validation issues to 400 for the frontend contract.
                const mappedStatusCode = response.status >= 400 && response.status < 500 ? 400 : 502;

                return res.status(mappedStatusCode).json({
                    status: status.ERROR,
                    message: 'Digital Twin engine returned an error',
                    detail,
                });
            }
        } else {
            aiResult = await response.json();
        }
        const ranked = rankTreatmentSimulations(aiResult?.simulations || {});
        const scoreMargin = computeScoreMargin(ranked);
        const alternatives = ranked.slice(1);

        let savedRun = null;
        if (req.user && req.user._id) {
            savedRun = await DigitalTwinRun.create({
                userId: req.user._id,
                inputProfile: normalizedPayload,
                recommendation: {
                    recommended_treatment: aiResult.recommended_treatment,
                    confidence: Number(aiResult.confidence || 0),
                    explanation: aiResult.explanation || '',
                },
                simulations: aiResult.simulations,
                alternatives,
                scoreMargin,
                disclaimer: DIGITAL_TWIN_DISCLAIMER,
                contractVersion: aiResult.engine || 'digital_twin_heuristic_v1',
            });
        }

        return res.status(201).json({
            status: status.SUCCESS,
            message: usedFallback
                ? 'Digital twin recommendation generated (fallback engine)'
                : 'Digital twin recommendation generated',
            data: createRecommendationPayload(normalizedPayload, aiResult, savedRun),
        });
    } catch (err) {
        if (err.name === 'AbortError') {
            return res.status(504).json({
                status: status.ERROR,
                message: 'Digital Twin request timed out. Please try again.',
            });
        }

        return res.status(503).json({
            status: status.ERROR,
            message: 'Digital Twin service is unavailable.',
        });
    } finally {
        clearTimeout(timeoutId);
    }
});

export const getDigitalTwinHistory = asyncHandler(async (req, res) => {
    const runs = await DigitalTwinRun.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(30);

    return res.status(200).json({
        status: status.SUCCESS,
        data: {
            history: runs.map(mapRunToResponse),
        },
    });
});

export const getDigitalTwinRunById = asyncHandler(async (req, res) => {
    const run = await DigitalTwinRun.findOne({
        _id: req.params.id,
        userId: req.user._id,
    });

    if (!run) {
        return res.status(404).json({
            status: status.FAIL,
            message: 'Digital Twin run not found',
        });
    }

    return res.status(200).json({
        status: status.SUCCESS,
        data: {
            run: mapRunToResponse(run),
        },
    });
});

export const getDigitalTwinHealth = asyncHandler(async (req, res) => {
    try {
        const proxy = await proxyDigitalTwinGet('/api/v1/digital-twin/health');

        if (proxy.ok) {
            return res.status(proxy.statusCode).json(proxy.body || {});
        }

        const detail = String(proxy?.body?.detail || proxy?.body?.message || '');
        if (shouldUseLocalFallback(proxy.statusCode, detail)) {
            return res.status(200).json(fallbackHealthResponse());
        }

        return res.status(proxy.statusCode).json(proxy.body || {});
    } catch (err) {
        return res.status(200).json(fallbackHealthResponse());
    }
});

export const getDigitalTwinContract = asyncHandler(async (req, res) => {
    try {
        const proxy = await proxyDigitalTwinGet('/api/v1/digital-twin/contract');

        if (proxy.ok) {
            return res.status(proxy.statusCode).json(proxy.body || {});
        }

        const detail = String(proxy?.body?.detail || proxy?.body?.message || '');
        if (shouldUseLocalFallback(proxy.statusCode, detail)) {
            return res.status(200).json(fallbackContractResponse());
        }

        return res.status(proxy.statusCode).json(proxy.body || {});
    } catch (err) {
        return res.status(200).json(fallbackContractResponse());
    }
});