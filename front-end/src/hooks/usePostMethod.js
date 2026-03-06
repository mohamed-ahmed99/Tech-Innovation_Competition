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
        if (!body) return null

        // reset state for new request
        setStatus("idle");
        setMessage("");
        setData(null);

        // get token
        const token = localStorage.getItem("myToken");
        setLoading(true); // set loading

        try {
            // fetch 
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers,
                    "authorization": `Bearer ${token}`
                },
                credentials: "include",
                body: JSON.stringify(body)
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
    return { postData, status_p: status, message_p: message, data_p: data, loading_p: loading };
}