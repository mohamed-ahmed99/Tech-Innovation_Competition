import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AnalysisResult = ({ result, onReset }) => {
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
                    <div className="prose prose-sm sm:prose-base prose-invert max-w-none text-zinc-300">
                        <p className="whitespace-pre-wrap leading-relaxed">
                            {displayedText}
                            {isTyping && <span className="inline-block w-1.5 sm:w-2 h-4 sm:h-5 ml-1 bg-zinc-300 animate-pulse align-middle rounded-sm"></span>}
                        </p>
                    </div>
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
