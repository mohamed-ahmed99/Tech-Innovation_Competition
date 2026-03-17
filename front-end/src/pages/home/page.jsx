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
    const [structuredResult, setStructuredResult] = useState(null);
    const [selectedOrganHint, setSelectedOrganHint] = useState('auto');

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

    // Listen for history selection from Sidebar
    useEffect(() => {
        if (store.selectedAnalysis) {
            setSelectedFile(null);
            setAnalysisResult(store.selectedAnalysis.formattedReport);
            setStructuredResult(store.selectedAnalysis);
            // Clear it so it doesn't re-trigger
            setGlobalData('selectedAnalysis', null);
        }
    }, [store.selectedAnalysis]);

    // Listen for "New Analysis" from Sidebar
    useEffect(() => {
        if (store.triggerNewChat) {
            setSelectedFile(null);
            setAnalysisResult(null);
            setStructuredResult(null);
            setGlobalData('triggerNewChat', null);
        }
    }, [store.triggerNewChat]);

    const handleImageSelect = (file) => {
        setSelectedFile(file);
        setAnalysisResult(null);
        setStructuredResult(null);
    };

    const handleClearImage = () => {
        setSelectedFile(null);
        setAnalysisResult(null);
        setStructuredResult(null);
    };

    const handleAnalyze = async () => {
        if (!selectedFile) return;
        
        setIsAnalyzing(true);
        
        try {
            const organHint = selectedOrganHint === 'auto' ? '' : selectedOrganHint;
            const modalityByOrgan = {
                brain: 'mri',
                liver: 'ct',
                breast: 'xray',
            };
            const modality = organHint ? (modalityByOrgan[organHint] || 'mri') : 'mri';
            const result = await sendImageToAI(selectedFile, modality, organHint);
            setAnalysisResult(result.text);
            setStructuredResult(result.structured);
        } catch (error) {
            console.error("Error analyzing image:", error);
            const msg = error?.message || "Unknown error while analyzing the image.";
            setAnalysisResult(`Analysis failed: ${msg}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setAnalysisResult(null);
        setStructuredResult(null);
    };

    return (
        <div className="min-h-full w-full py-10 px-4 sm:px-6 flex flex-col items-center bg-zinc-950 text-zinc-100 relative">

            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl w-full text-center mb-8 relative z-10"
            >
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-100 mb-4 tracking-tight leading-tight">
                    NeuroGuard AI
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
                    Upload your medical scan and the NeuroGuard model will analyze it for tumor detection, providing a detailed report with confidence scores and anatomical location.
                </p>

                <div className="mt-6 max-w-md mx-auto rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-left">
                    <label htmlFor="organ-hint" className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">
                        Target Organ Routing
                    </label>
                    <select
                        id="organ-hint"
                        value={selectedOrganHint}
                        onChange={(event) => setSelectedOrganHint(event.target.value)}
                        disabled={isAnalyzing}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-60"
                    >
                        <option value="auto">Auto detect (recommended)</option>
                        <option value="brain">Brain</option>
                        <option value="liver">Liver</option>
                        <option value="breast">Breast</option>
                    </select>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        Choose Auto detect for automatic routing, or force Brain/Liver/Breast when you already know the scan type.
                    </p>
                </div>
            </motion.div>

            <div className="w-full max-w-4xl flex-1 flex flex-col justify-start relative z-10">
                <AnimatePresence mode="wait">
                    {!selectedFile && !analysisResult && (
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
                            structured={structuredResult}
                            onReset={handleReset} 
                        />
                    )}
                </AnimatePresence>
            </div>
            
        </div>
    );
}

export default HomePage;