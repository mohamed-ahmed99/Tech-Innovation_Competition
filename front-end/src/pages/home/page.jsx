import React, { useState, useEffect } from 'react';
import { useGlobalData } from '../../context/GlobalContext';
import ImageUploader from './ImageUploader';
import ImagePreview from './ImagePreview';
import AnalysisResult from './AnalysisResult';
import { motion, AnimatePresence } from 'framer-motion';

const HomePage = () => {
    const [store, setGlobalData] = useGlobalData();
    
    // State for the image selection and analysis process
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);

    // Clean up the object URL when component unmounts or selected file changes
    useEffect(() => {
        if (selectedFile) {
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreviewUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            setPreviewUrl(null);
        }
    }, [selectedFile]);

    const handleImageSelect = (file) => {
        setSelectedFile(file);
        setAnalysisResult(null);
    };

    const handleClearImage = () => {
        setSelectedFile(null);
        setAnalysisResult(null);
    };

    const handleAnalyze = async () => {
        if (!selectedFile) return;
        
        setIsAnalyzing(true);
        
        try {
            // Frontend simulation:
            // const formData = new FormData();
            // formData.append("image", selectedFile);
            // const response = await fetch("YOUR_BACKEND_ENDPOINT/analyze", { method: "POST", body: formData });
            // const data = await response.json();
            
            // Simulating API delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Simulating AI response matching ChatGPT style
            const simulatedResponse = `I've analyzed your image carefully. Here are the main details and observations I could detect:

🔍 Overview: 
The image contains several distinct elements that blend well together in terms of colors and contrast. The resolution indicates that the lighting was very well balanced.

🎨 Colors & Details:
• The use of consistent color tones is pleasing to the eye.
• The primary focus in the center is very clear and draws attention.
• There is no significant noise, reflecting high source quality.

💡 Technical Conclusion:
This is an excellent image that can be used as a prime example for pattern recognition.

---

[ Note 👨‍💻 ] : This text is purely a simulated AI response to demonstrate the typing effect used by ChatGPT. To integrate the real AI, map the \`handleAnalyze\` function to the actual backend endpoint, and any output returned will be typed out here seamlessly!`;
            
            setAnalysisResult(simulatedResponse);
            
        } catch (error) {
            console.error("Error analyzing image:", error);
            setAnalysisResult("Sorry, an error occurred while analyzing the image. Please try again later.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setAnalysisResult(null);
    };

    return (
        <div className="min-h-full w-full py-10 px-4 sm:px-6 flex flex-col items-center bg-zinc-950 text-zinc-100 relative">

            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl w-full text-center mb-8 relative z-10"
            >
                <div className="inline-block mb-3 px-3 py-1 rounded-full bg-zinc-900 text-zinc-300 font-semibold text-xs tracking-widest uppercase border border-zinc-800">
                    AI Visual Core
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-100 mb-4 tracking-tight leading-tight">
                    Image Analysis AI
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
                    Upload any image and the AI engine will describe its contents, interpret the objects, and extract key details with high precision.
                </p>
            </motion.div>

            <div className="w-full max-w-4xl flex-1 flex flex-col justify-start relative z-10">
                <AnimatePresence mode="wait">
                    {!selectedFile && (
                        <ImageUploader key="uploader" onImageSelect={handleImageSelect} />
                    )}

                    {selectedFile && !analysisResult && (
                        <ImagePreview 
                            key="preview"
                            previewUrl={previewUrl} 
                            onClear={handleClearImage}
                            onAnalyze={handleAnalyze}
                            isAnalyzing={isAnalyzing}
                        />
                    )}

                    {analysisResult && (
                        <AnalysisResult 
                            key="result"
                            result={analysisResult} 
                            onReset={handleReset} 
                        />
                    )}
                </AnimatePresence>
            </div>
            
        </div>
    );
}

export default HomePage;