import React from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ImagePreview = ({ previewUrl, onClear, onAnalyze, isAnalyzing }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="w-full max-w-2xl mx-auto flex flex-col gap-6"
        >
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/50 aspect-square sm:aspect-video md:aspect-[16/10] group flex items-center justify-center p-2">
                <div className="w-full h-full relative rounded-xl overflow-hidden bg-zinc-950">
                    <img
                        src={previewUrl}
                        alt="Selected preview"
                        className="w-full h-full object-contain"
                    />

                    {!isAnalyzing && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClear}
                            className="absolute top-4 right-4 p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-700 shadow-lg backdrop-blur-md transition-all z-10"
                            title="Remove Image"
                        >
                            <X size={18} />
                        </motion.button>
                    )}

                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-20">
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center gap-4 text-zinc-100"
                            >
                                <Loader2 size={36} className="animate-spin text-zinc-400" />
                                <p className="font-semibold text-sm tracking-wide text-zinc-300">Analyzing image...</p>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>

            <motion.button
                whileHover={!isAnalyzing ? { scale: 1.01 } : {}}
                whileTap={!isAnalyzing ? { scale: 0.98 } : {}}
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="w-full py-3.5 px-6 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-3 border border-transparent shadow-sm relative overflow-hidden"
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Processing data...</span>
                    </>
                ) : (
                    <>
                        <Sparkles size={20} />
                        <span>Start AI Analysis</span>
                    </>
                )}
            </motion.button>
        </motion.div>
    );
};

export default ImagePreview;
