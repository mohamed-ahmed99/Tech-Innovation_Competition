import React from 'react';
import { motion } from 'framer-motion';
import { Github, Linkedin, Mail } from 'lucide-react';

const TeamSection = () => {
    const team = [
        {
            name: "Youssef Mohamed",
            role: "AI Developer",
            image: "",
            socials: [
                {
                    name: "Github",
                    url: "https://github.com/youssef-mohamed"
                },
                {
                    name: "Linkedin",
                    url: "https://www.linkedin.com/in/youssef-mohamed/"
                }
            ]
        },
        {
            name: "Mohamed Ahmed",
            role: "Full-Stack Developer",
            image: "",
            socials: [
                {
                    name: "Github",
                    url: "https://github.com/mohamed-ahmed99"
                },
                {
                    name: "Linkedin",
                    url: "https://www.linkedin.com/in/mohamed-ahmed/"
                }
            ]
        },
        {
            name: "Engy Kaoud",
            role: "Researcher",
            image: "",
            socials: [
                {
                    name: "Github",
                    url: "https://github.com/engy-kaoud"
                }
            ]
        },
        {
            name: "Reda",
            role: "Backend Developer",
            image: "",
            socials: [
                {
                    name: "Github",
                    url: "https://github.com/reda"
                },
                {
                    name: "Linkedin",
                    url: "https://www.linkedin.com/in/reda/"
                }
            ]
        },
    ];

    return (
        <section className="py-12 px-6 md:px-12 bg-zinc-950 text-white selection:bg-white selection:text-black">
            <div className="max-w-7xl mx-auto">
                <motion.h2 
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-2xl font-black tracking-widest uppercase mb-10 border-l-4 border-white pl-6"
                >
                    Our Team
                </motion.h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {team.map((member, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex flex-col group"
                        >
                            {/* Image - Top */}
                            <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-900 mb-4 border border-zinc-800 transition-all duration-500 group-hover:border-zinc-500 flex items-center justify-center">
                                {member.image ? (
                                    <img 
                                        src={member.image} 
                                        alt={member.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <span className="text-7xl font-black text-white/80 transition-all duration-500 select-none">
                                        {member.name.charAt(0)}
                                    </span>
                                )}
                            </div>

                            {/* Info - Below Image */}
                            <div className="space-y-2">
                                <div className="space-y-0.5">
                                    <h3 className="text-lg font-bold tracking-tight text-white group-hover:text-zinc-300 transition-colors">
                                        {member.name}
                                    </h3>
                                    <p className="text-zinc-500 text-xs font-mono uppercase tracking-[0.2em]">
                                        {member.role}
                                    </p>
                                </div>

                                {/* Social Icons - Bottom */}
                                <div className="flex gap-4 pt-1">
                                    {member.socials.map((social, sIdx) => (
                                        <a 
                                            key={sIdx}
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-zinc-500 hover:text-white transition-all transform hover:scale-110"
                                            title={social.name}
                                        >
                                            {social.name === 'Github' && <Github size={18} strokeWidth={1.5} />}
                                            {social.name === 'Linkedin' && <Linkedin size={18} strokeWidth={1.5} />}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};



export default TeamSection;
