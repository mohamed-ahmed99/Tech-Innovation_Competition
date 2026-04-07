import React from 'react';
import { motion } from 'framer-motion';
import { Scan, Cpu, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';

const ProjectVision = () => {
    return (
        <section className="py-12 px-6 md:px-12 bg-zinc-950 text-white relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-30"></div>
                <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-30"></div>
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

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="mt-8"
                    >
                        <Link
                            to="/digital-twin"
                            className="inline-flex items-center justify-center px-7 py-3 rounded-xl bg-zinc-100 text-zinc-950 font-bold tracking-wide hover:bg-white transition-colors"
                        >
                            Try Our Model
                        </Link>
                    </motion.div>
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
                        <p className="text-xl md:text-2xl font-light leading-snug text-zinc-300 max-w-5xl italic border-l-4 border-white pl-6 md:pl-8">
                            "Our project focuses on using <span className="text-white font-medium">Artificial Intelligence</span> to assist in the analysis of medical images related to tumor screening across brain, liver, spinal cord, and breast studies. The platform allows users to upload a medical image, after which the AI system analyzes the image to help identify suspicious patterns."
                        </p>
                    </motion.div>

                    {/* Detailed Breakdowns */}
                    <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 md:mt-10">
                        
                        {/* Box 1 */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl relative group overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Cpu size={80} />
                            </div>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                                <Scan size={20} className="text-zinc-500" />
                                Image Analysis
                            </h3>
                            <p className="text-zinc-400 leading-relaxed text-base">
                                The AI system supports multi-organ tumor screening workflows and routes scans to the appropriate model profile. By leveraging modern AI techniques, the platform can process uploaded medical images and provide structured insights that help research teams review tumor-related patterns faster.
                            </p>
                        </motion.div>

                        {/* Box 2 */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="p-8 bg-white text-black rounded-3xl relative group overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <Lightbulb size={80} />
                            </div>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                                <Activity size={20} className="text-zinc-400" />
                                Our Primary Goal
                            </h3>
                            <p className="text-zinc-700 leading-relaxed text-base font-medium">
                                Our goal is to explore how AI technologies can contribute to medical image analysis, making the process faster and more efficient for research and educational purposes.
                            </p>
                            <div className="mt-6 flex items-center gap-4">
                                <div className="h-px flex-1 bg-black/10"></div>
                                <span className="text-[9px] font-mono tracking-widest text-black/40 uppercase">Efficiency & Research</span>
                            </div>
                        </motion.div>

                    </div>
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
