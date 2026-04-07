import { useState } from "react";


export const usePostMethod = () => {

    // state
    const [data, setData] = useState(null);
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);


    // post data
    const postData = async (url, options = {}, body) => {

        // check body
        if (!body) return null;

        // reset state for new request
        setStatus("idle");
        setMessage("");
        setData(null);

        // get token
        const token = localStorage.getItem("NeuroAi_Token");
        setLoading(true); // set loading

        const isFormData = body instanceof FormData;
        const headers = {
            ...options.headers,
        };

        if (!isFormData && !headers["Content-Type"] && !headers["content-type"]) {
            headers["Content-Type"] = "application/json";
        }

        if (token) {
            headers.authorization = `Bearer ${token}`;
        }

        try {
            // fetch 
            const response = await fetch(url, {
                method: "POST",
                headers,
                credentials: "include",
                body: isFormData ? body : JSON.stringify(body)
            });

            let result = null;
            try {
                result = await response.json();
            } catch {
                result = { message: `Request completed with HTTP ${response.status}.` };
            }

            // check response
            if (!response.ok) {
                setStatus("fail");
                setData(null);
                setMessage(result.message || "Failed to fetch data.");
            } else {
                setStatus("success");
                setData(result.data);
                setMessage(result.message || "Data fetched successfully.");
            }

            return result;

        }
        // catch error
        catch (error) {
            console.error("Error fetching from server:", error);
            setStatus("fail");
            setData(null);
            setMessage(error.message);
            return null;
        } finally {
            setLoading(false); // finish loading
        }
    }

    // return data
    return { postData, status_p: status, message_p: message, data_p: data, loading_p: loading };
}