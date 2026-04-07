// Default to same-origin requests so Vercel rewrites can proxy /api/* in production.
// For local dev or custom deployments, set VITE_API_BASE (without trailing slash).
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

function buildApiUrl(path) {
    return `${API_BASE}${path}`;
}

function parseErrorMessageFromResponse(responseBody) {
    if (!responseBody) return null;

    if (typeof responseBody === "string") {
        return responseBody;
    }

    // Backend may wrap AI detail as a JSON string inside `detail`.
    if (typeof responseBody.detail === "string") {
        try {
            const nested = JSON.parse(responseBody.detail);
            if (nested?.detail) return nested.detail;
        } catch {
            // detail is plain text; use it directly.
        }
        return responseBody.detail;
    }

    if (typeof responseBody.message === "string") {
        return responseBody.message;
    }

    return null;
}

/**
 * Get auth headers if a token exists.
 */
function authHeaders() {
    const token = localStorage.getItem("NeuroAi_Token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Send an image to the AI model for analysis.
 * Returns { analysis: string, structured: object }
 */
export const sendImageToAI = async (imageFile, modality = "mri", organHint = "") => {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("modality", modality);
    if (organHint) {
        formData.append("organ_hint", organHint);
    }

    let response;
    try {
        response = await fetch(buildApiUrl('/api/ai/analyze'), {
            method: "POST",
            body: formData,
            headers: authHeaders(),
        });
    } catch {
        throw new Error("Could not reach backend server. Check API URL/rewrite and backend availability.");
    }

    if (!response.ok) {
        let errorBody = null;
        try {
            errorBody = await response.json();
        } catch {
            // Non-JSON error response.
        }

        const message = parseErrorMessageFromResponse(errorBody) || `Image analysis failed (HTTP ${response.status}).`;
        throw new Error(message);
    }

    const resData = await response.json();
    return {
        text:       resData?.data?.analysis || "No analysis result received.",
        structured: resData?.data?.structured || null,
    };
};

/**
 * Fetch the user's analysis history.
 * Returns an array of history items.
 */
export const getHistory = async () => {
    const response = await fetch(buildApiUrl('/api/ai/history'), {
        headers: authHeaders(),
    });

    if (!response.ok) return [];

    const resData = await response.json();
    return resData?.data?.history || [];
};

/**
 * Fetch a single analysis by ID.
 */
export const getAnalysisById = async (id) => {
    const response = await fetch(buildApiUrl(`/api/ai/history/${id}`), {
        headers: authHeaders(),
    });

    if (!response.ok) return null;

    const resData = await response.json();
    return resData?.data?.analysis || null;
};

/**
 * Delete a specific history entry.
 */
export const deleteHistoryItem = async (id) => {
    const response = await fetch(buildApiUrl(`/api/ai/history/${id}`), {
        method: "DELETE",
        headers: authHeaders(),
    });
    return response.ok;
};
