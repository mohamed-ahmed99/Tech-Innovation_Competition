import React from 'react';
import { motion } from 'framer-motion';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-zinc-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative flex flex-col items-center">
                {/* Logo "N" Animation */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                    animate={{
                        scale: 1,
                        opacity: 1,
                        rotate: 0,
                        transition: { duration: 0.8, ease: "easeOut" }
                    }}
                    className="relative w-24 h-24 mb-6 flex items-center justify-center"
                >
                    {/* Outer Rings */}
                    <motion.div
                        animate={{
                            rotate: 360,
                            transition: { duration: 8, repeat: Infinity, ease: "linear" }
                        }}
                        className="absolute inset-0 border-2 border-dashed border-zinc-800 rounded-2xl"
                    />
                    <motion.div
                        animate={{
                            rotate: -360,
                            transition: { duration: 12, repeat: Infinity, ease: "linear" }
                        }}
                        className="absolute inset-2 border border-zinc-700/50 rounded-xl"
                    />

                    {/* The "N" */}
                    <span className="text-6xl font-black text-zinc-100 relative z-10 select-none">
                        N
                    </span>

                    {/* Subtle Pulse Glow */}
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-white/5 rounded-2xl blur-xl"
                    />
                </motion.div>

                {/* Text "NeuroAi" Animation */}
                <div className="overflow-hidden flex">
                    {"NeuroAi".split("").map((char, index) => (
                        <motion.span
                            key={index}
                            initial={{ y: 40, opacity: 0 }}
                            animate={{
                                y: 0,
                                opacity: 1,
                                transition: {
                                    delay: 0.5 + (index * 0.08),
                                    duration: 0.5,
                                    ease: "easeOut"
                                }
                            }}
                            className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-wider"
                        >
                            {char}
                        </motion.span>
                    ))}
                </div>

                {/* Bottom Status Bar */}
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{
                        width: 180,
                        opacity: 1,
                        transition: { delay: 1.2, duration: 1 }
                    }}
                    className="h-[2px] bg-gradient-to-r from-transparent via-zinc-600 to-transparent mt-4"
                />
            </div>
        </div>
    );
}
