import { useState } from "react";

export const useGetMethod = () => {
    // state
    const [data, setData] = useState(null);
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    // get data
    const getData = async (url, options = {}) => {
        // reset state for new request
        setStatus("idle");
        setMessage("");
        setData(null);

        // get token
        const token = localStorage.getItem("NeuroAi_Token");
        setLoading(true); // set loading

        try {
            // fetch 
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers,
                    "authorization": `Bearer ${token}`
                },
                credentials: "include"
            });
            const result = await response.json(); // get result

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

        }
        // catch error
        catch (error) {
            console.error("Error fetching from server:", error);
            setStatus("fail");
            setData(null);
            setMessage(error.message);
        } finally {
            setLoading(false); // finish loading
        }
    }

    // return data
    return { getData, status_g: status, message_g: message, data_g: data, loading_g: loading };
}
