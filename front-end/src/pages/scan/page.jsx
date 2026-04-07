import React, { useState, useEffect } from 'react';
import { useGlobalData } from '../../context/GlobalContext';
import { Link, useNavigate } from 'react-router-dom';
import ImageUploader from './ImageUploader';
import ImagePreview from './ImagePreview';
import AnalysisResult from './AnalysisResult';
import { motion, AnimatePresence } from 'framer-motion';

import { sendImageToAI } from './aiService';

const ScanPage = () => {
    const [store, setGlobalData] = useGlobalData();
    const navigate = useNavigate();

    // State for the image selection and analysis process
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [structuredResult, setStructuredResult] = useState(null);
    const [selectedOrganHint, setSelectedOrganHint] = useState('brain');
    const [digitalTwinProfile, setDigitalTwinProfile] = useState(store.digitalTwinProfile || null);

    useEffect(() => {
        if (store.digitalTwinProfile) {
            setDigitalTwinProfile(store.digitalTwinProfile);
            return;
        }

        const savedTwin = localStorage.getItem('NeuroGuard_DigitalTwin');
        if (!savedTwin) return;

        try {
            const parsed = JSON.parse(savedTwin);
            setDigitalTwinProfile(parsed);
            setGlobalData('digitalTwinProfile', parsed);
        } catch {
            // Ignore broken local cache.
        }
    }, [store.digitalTwinProfile, setGlobalData]);

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
            const result = await sendImageToAI(selectedFile, modality, organHint, digitalTwinProfile);
            setAnalysisResult(result.text);
            setStructuredResult(result.structured);
            setGlobalData('lastAnalysisBundle', {
                text: result.text,
                structured: result.structured,
                digitalTwinProfile,
            });
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

    const handleVisualize3D = () => {
        if (!structuredResult) return;

        const payload = {
            text: analysisResult,
            structured: structuredResult,
            digitalTwinProfile,
        };

        setGlobalData('lastAnalysisBundle', payload);
        navigate('/treatment-3d', { state: payload });
    };

    if (!digitalTwinProfile) {
        return (
            <div className="min-h-full w-full py-16 px-4 sm:px-6 flex items-center justify-center bg-zinc-950 text-zinc-100">
                <div className="max-w-xl w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Step 2 of 3</p>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Digital Twin Required</h1>
                    <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                        Start by submitting your Digital Twin profile. We use it to personalize treatment recommendations after MRI analysis.
                    </p>
                    <Link
                        to="/digital-twin"
                        className="inline-flex mt-6 px-6 py-3 rounded-xl bg-zinc-100 text-zinc-950 font-semibold hover:bg-white transition-colors"
                    >
                        Go To Digital Twin
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full w-full py-10 px-4 sm:px-6 flex flex-col items-center bg-zinc-950 text-zinc-100 relative">

            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl w-full text-center mb-8 relative z-10"
            >
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Step 2 of 3</p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-100 mb-4 tracking-tight leading-tight">
                    NeuroGuard AI
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
                    Upload your MRI scan and NeuroGuard will generate personalized treatment guidance using your Digital Twin profile.
                </p>

                <p className="text-xs text-zinc-500 mt-3">
                    Digital Twin: age {digitalTwinProfile.age}, grade {digitalTwinProfile.tumor_grade}, prior {digitalTwinProfile.previous_treatment}
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
                        <option value="brain">Brain</option>
                        <option value="liver">Liver</option>
                        <option value="breast">Breast</option>
                        <option value="lung" disabled>Lung (coming soon)</option>
                        <option value="kidney" disabled>Kidney (coming soon)</option>
                        <option value="prostate" disabled>Prostate (coming soon)</option>
                    </select>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        Select the target organ directly. Lung, Kidney, and Prostate are UI placeholders for the upcoming release.
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
                            onVisualize3D={handleVisualize3D}
                            digitalTwinProfile={digitalTwinProfile}
                        />
                    )}
                </AnimatePresence>
            </div>

        </div>
    );
}

export default ScanPage;