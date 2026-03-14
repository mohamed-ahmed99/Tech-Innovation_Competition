export const sendImageToAI = async (imageFile, imageSrc) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    
    // Append the image src as requested
    if (imageSrc) {
        formData.append("src", imageSrc);
    }

    // Change the port here if your backend is running on a different one

    // http://localhost:5150/api/ai/analyze
    // https://neuro-gaurd-ai-backend.vercel.app/api/ai/analyze
    const response = await fetch("https://neuro-gaurd-ai-backend.vercel.app/api/ai/analyze", { 
        method: "POST", 
        body: formData 
    });

    if (!response.ok) {
        throw new Error("Failed to analyze image from backend");
    }

    const resData = await response.json();
    
    // Return the specific string content from the response
    return resData?.data?.analysis || "No analysis result received.";
};
