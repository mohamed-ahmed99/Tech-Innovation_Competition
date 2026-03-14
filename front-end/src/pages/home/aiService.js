// Base URL for the backend — change for production
// http://localhost:5150
// https://neuro-gaurd-ai-backend.vercel.app
const API_BASE = import.meta.env.VITE_API_BASE || "https://neuro-gaurd-ai-backend.vercel.app";

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
export const sendImageToAI = async (imageFile, modality = "mri") => {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("modality", modality);

    const response = await fetch(`${API_BASE}/api/ai/analyze`, {
        method: "POST",
        body: formData,
        headers: authHeaders(),
    });

    if (!response.ok) {
        throw new Error("Failed to analyze image from backend");
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
    const response = await fetch(`${API_BASE}/api/ai/history`, {
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
    const response = await fetch(`${API_BASE}/api/ai/history/${id}`, {
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
    const response = await fetch(`${API_BASE}/api/ai/history/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    return response.ok;
};
