import React, { useState, useEffect } from 'react';
import { useGlobalData } from '../../context/GlobalContext';
import ImageUploader from './ImageUploader';
import ImagePreview from './ImagePreview';
import AnalysisResult from './AnalysisResult';
import { motion, AnimatePresence } from 'framer-motion';

import { sendImageToAI } from './aiService';

const ScanPage = () => {
    const [store, setGlobalData] = useGlobalData();

    // State for the image selection and analysis process
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [structuredResult, setStructuredResult] = useState(null);
    const [selectedOrganHint, setSelectedOrganHint] = useState('brain');

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
            const organHint = selectedOrganHint;
            const modalityByOrgan = {
                brain: 'mri',
                liver: 'ct',
                breast: 'xray',
            };
            const modality = modalityByOrgan[organHint] || 'mri';
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
        <div className="min-h-[calc(100vh-64px)] w-full container-padding flex flex-col items-center bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden">
            <div className="hero-grid-bg" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-3xl w-full text-center mb-12 relative z-10"
            >
                <h1 className="hero-title-redesign text-4xl lg:text-6xl mb-6">
                    NeuroGaurd
                </h1>
                <p className="hero-subtitle-redesign max-w-xl mx-auto">
                    Upload your medical scan and the NeuroGaurd model will analyze it for tumor detection, providing a detailed report with confidence scores and anatomical location.
                </p>

                <div className="mt-10 max-w-2xl mx-auto">
                    <label className="form-label mb-4 block text-center">Target Organ Routing</label>
                    <div className="pill-tabs-container justify-center flex-wrap">
                        {['brain', 'liver', 'breast', 'lung', 'kidney', 'prostate'].map((organ) => (
                            <button
                                key={organ}
                                onClick={() => setSelectedOrganHint(organ)}
                                disabled={isAnalyzing || ['lung', 'kidney', 'prostate'].includes(organ)}
                                className={`pill-tab ${selectedOrganHint === organ ? 'active' : ''} ${['lung', 'kidney', 'prostate'].includes(organ) ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                                {organ.charAt(0).toUpperCase() + organ.slice(1)}
                                {['lung', 'kidney', 'prostate'].includes(organ) && <span className="text-[8px] ml-1 opacity-60">(Soon)</span>}
                            </button>
                        ))}
                    </div>
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

export default ScanPage;