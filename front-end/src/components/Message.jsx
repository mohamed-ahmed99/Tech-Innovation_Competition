import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    AlertCircle,
    Info,
    X,
    AlertTriangle,
} from 'lucide-react';

/**
 * Message Component
 * Renders via Portal at the bottom-right of the screen.
 */
const Message = ({
    message,
    type = 'info',
    isVisible,
    onClose,
    duration = 5000,
    title
}) => {
    useEffect(() => {
        if (isVisible && duration && onClose) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    const variants = {
        success: {
            icon: <CheckCircle2 className="text-emerald-400 w-5 h-5" />,
            bg: 'bg-[#0a0a0b]/95 border-emerald-500/20 shadow-emerald-500/10',
            accent: 'bg-emerald-500',
            glow: 'shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]'
        },
        error: {
            icon: <AlertCircle className="text-rose-400 w-5 h-5" />,
            bg: 'bg-[#0a0a0b]/95 border-rose-500/20 shadow-rose-500/10',
            accent: 'bg-rose-500',
            glow: 'shadow-[0_0_40px_-10px_rgba(244,63,94,0.3)]'
        },
        warning: {
            icon: <AlertTriangle className="text-amber-400 w-5 h-5" />,
            bg: 'bg-[#0a0a0b]/95 border-amber-500/20 shadow-amber-500/10',
            accent: 'bg-amber-500',
            glow: 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)]'
        },
        info: {
            icon: <Info className="text-sky-400 w-5 h-5" />,
            bg: 'bg-[#0a0a0b]/95 border-sky-500/20 shadow-sky-500/10',
            accent: 'bg-sky-500',
            glow: 'shadow-[0_0_40px_-10px_rgba(14,165,233,0.3)]'
        }
    };

    const style = variants[type] || variants.info;

    // We use portals to ensure the message is attached to the body,
    // preventing parent CSS translations or overflows from clipping it.
    const content = (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 100, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.9, x: 50, filter: 'blur(5px)', transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    className="fixed top-20 right-8 z-[99999] pointer-events-none"
                >
                    <div className={`
                        pointer-events-auto
                        relative flex flex-col gap-0 overflow-hidden
                        min-w-[340px] max-w-[420px] 
                        rounded-[1.25rem] border backdrop-blur-3xl px-6 py-5
                        ${style.bg} ${style.glow}
                    `}>
                        {/* Ambient Background Light - added pointer-events-none */}
                        <div className={`absolute top-10 right-10 w-32 h-32 blur-[60px] opacity-10 rounded-full ${style.accent}`} />

                        <div className="flex items-start gap-4">
                            <div className="mt-0.5 flex-shrink-0">
                                <div className="relative">
                                    <div className={`absolute inset-0 blur-md opacity-20 animate-pulse ${style.accent}`} />
                                    {style.icon}
                                </div>
                            </div>

                            <div className="flex-grow flex flex-col gap-1 pr-2">
                                {title && (
                                    <h4 className="text-[14px] font-bold tracking-tight text-white/95">
                                        {title}
                                    </h4>
                                )}
                                <p className={`text-[13.5px] leading-relaxed text-zinc-300 ${!title && 'font-medium'}`}>
                                    {message}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onClose && onClose();
                                }}
                                className="relative z-50 flex-shrink-0 -mt-1 -mr-2 p-1.5 rounded-full hover:bg-white/5 transition-colors text-zinc-500 hover:text-white pointer-events-auto"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Premium Progress Bar - added pointer-events-none */}
                        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-white/[0.03] pointer-events-none">
                            <motion.div
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: duration / 1000, ease: "linear" }}
                                className={`h-full ${style.accent} shadow-[0_0_10px_0px_rgba(255,255,255,0.1)]`}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return createPortal(content, document.body);
};

export default Message;
