import React from 'react';
import { motion } from 'framer-motion';
import { Scan, Cpu, Lightbulb } from 'lucide-react';

const ProjectVision = () => {
    return (
        <section className="py-20 px-6 md:px-12 bg-background text-text-main relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-30"></div>
                <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-30"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="mb-8">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-3 mb-4"
                    >
                        <span className="w-12 h-px bg-white/40"></span>
                        <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.5em] font-bold">The Innovation</span>
                    </motion.div>
                    <motion.h2 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-black tracking-tighter leading-tight"
                    >
                        PROJECT <br />
                        <span className="text-zinc-800">VISION.</span>
                    </motion.h2>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Side: Large Paragraph */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-12"
                    >
                        <div className="border-l-[3px] border-primary pl-8 md:pl-12 py-3">
                            <p className="text-2xl md:text-3xl font-medium leading-relaxed text-text-main max-w-5xl">
                                An advanced <span className="text-primary font-bold">intelligent system</span> that leverages the latest artificial intelligence technologies to analyze medical imaging with exceptional precision for detecting diseases in the <span className="font-bold underline decoration-primary/20 underline-offset-4">brain, stomach, liver, and breast</span>.
                            </p>
                            
                            <p className="mt-8 text-lg md:text-xl text-white/70 leading-relaxed max-w-4xl font-normal italic">
                                It also creates a sophisticated <span className="text-text-main font-semibold">digital twin</span> of the patient, enabling the simulation of different treatment approaches before real-world application, ensuring faster diagnosis, higher accuracy, and highly personalized treatment for each patient.
                            </p>
                        </div>
                    </motion.div>

                </div>


            </div>
        </section>
    );
};


// Helper to keep Activity icon working if imported correctly, otherwise we can use a generic one
const Activity = ({ size, className }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

export default ProjectVision;
