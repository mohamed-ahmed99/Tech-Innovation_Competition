import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AnalysisResult = ({ result, structured, onReset }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        let i = 0;
        setDisplayedText('');
        setIsTyping(true);
        
        const baseSpeed = 20; 
        const speed = result.length > 500 ? 10 : baseSpeed;

        const typingInterval = setInterval(() => {
            if (i < result.length) {
                setDisplayedText(prev => prev + result.charAt(i));
                i++;
                if (containerRef.current) {
                    containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
            } else {
                clearInterval(typingInterval);
                setIsTyping(false);
            }
        }, speed);
        
        return () => clearInterval(typingInterval);
    }, [result]);

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const tumorDetected =
        structured?.tumor_detected ?? structured?.tumorDetected ?? null;

    const location = structured?.location || structured?.bodyRegion || structured?.body_region || 'brain';

    const findings = structured?.advice?.findings ||
        (tumorDetected === null
            ? 'Analysis details are unavailable for this record.'
            : tumorDetected
                ? `Potential tumor-like finding detected in ${location}.`
                : 'No tumor-like finding detected by the current model.');

    const confidenceValue =
        typeof structured?.confidence === 'number'
            ? `${(structured.confidence * 100).toFixed(1)}%`
            : 'Not available';

    const nextSteps =
        structured?.next_steps ||
        structured?.nextSteps ||
        structured?.advice?.recommendedNextSteps ||
        [];

    const redFlags =
        structured?.red_flags ||
        structured?.redFlags ||
        structured?.advice?.urgentCareFlags ||
        [];

    const disclaimer =
        structured?.disclaimer ||
        structured?.advice?.disclaimer ||
        'This AI output is a screening aid and not a diagnosis. Please consult a licensed clinician.';

    const urgencyLevel =
        structured?.urgency_level ||
        structured?.urgencyLevel ||
        structured?.advice?.urgencyLevel ||
        'routine';

    const urgencyClass =
        urgencyLevel === 'urgent'
            ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
            : urgencyLevel === 'priority'
                ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-3xl mx-auto mt-4"
        >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
                
                {/* Header */}
                <div className="bg-zinc-950/50 px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-zinc-100">
                        <Sparkles size={18} className="text-zinc-400" />
                        <h3 className="text-base font-semibold">AI Analysis</h3>
                    </div>

                    {!isTyping && (
                        <button 
                            onClick={handleCopy}
                            className={`p-1.5 rounded-md transition-colors flex items-center gap-2 text-xs font-medium ${isCopied ? 'bg-zinc-800 text-green-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                        >
                            {isCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy Text'}</span>
                        </button>
                    )}
                </div>
                
                {/* Content */}
                <div 
                    ref={containerRef}
                    className="p-5 sm:p-6"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Findings</p>
                            <p className="text-sm text-zinc-200 leading-relaxed">{findings}</p>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Confidence</p>
                            <p className="text-sm text-zinc-100 font-semibold">{confidenceValue}</p>
                            <div className={`inline-flex items-center mt-3 px-2.5 py-1 text-xs border rounded-full ${urgencyClass}`}>
                                Urgency: {urgencyLevel}
                            </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Recommended Next Steps</p>
                            {nextSteps.length > 0 ? (
                                <ul className="space-y-1.5 text-sm text-zinc-200">
                                    {nextSteps.map((item, idx) => (
                                        <li key={`next-step-${idx}`} className="leading-relaxed">- {item}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-zinc-400">No follow-up guidance available for this record.</p>
                            )}
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">When to seek urgent care</p>
                            {redFlags.length > 0 ? (
                                <ul className="space-y-1.5 text-sm text-zinc-200">
                                    {redFlags.map((item, idx) => (
                                        <li key={`red-flag-${idx}`} className="leading-relaxed">- {item}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-zinc-400">No urgent warning signs available for this record.</p>
                            )}
                        </div>
                    </div>

                    <div className="prose prose-sm sm:prose-base prose-invert max-w-none text-zinc-300">
                        <p className="whitespace-pre-wrap leading-relaxed">
                            {displayedText}
                            {isTyping && <span className="inline-block w-1.5 sm:w-2 h-4 sm:h-5 ml-1 bg-zinc-300 animate-pulse align-middle rounded-sm"></span>}
                        </p>
                    </div>

                    <p className="mt-4 text-xs text-zinc-500 leading-relaxed">{disclaimer}</p>
                </div>
                
                {/* Footer Actions */}
                <AnimatePresence>
                    {!isTyping && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-5 pt-0 border-t border-zinc-800/50 mt-2"
                        >
                            <button
                                onClick={onReset}
                                className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 border border-zinc-700/50 group"
                            >
                                <RefreshCw size={16} className="group-hover:-rotate-180 transition-transform duration-500" />
                                <span>Analyze another image</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default AnalysisResult;
