import React, { useState, useEffect } from 'react';
import { useGlobalData } from '../../context/GlobalContext';
import ImageUploader from './ImageUploader';
import ImagePreview from './ImagePreview';
import AnalysisResult from './AnalysisResult';
import { motion, AnimatePresence } from 'framer-motion';

import { sendImageToAI } from './aiService';

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
            // Send the image and its generated source URL via the external service
            const resultMsg = await sendImageToAI(selectedFile, previewUrl);
            setAnalysisResult(resultMsg);
            
        } catch (error) {
            console.error("Error analyzing image:", error);
            setAnalysisResult("Sorry, an error occurred while connecting to the server. Please check your backend is running.");
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
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-100 mb-4 tracking-tight leading-tight">
                    NeuroAI
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
                    Upload your image here, and the NeuroAI model will analyze it and provide you with the result.
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