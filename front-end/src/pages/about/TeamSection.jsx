import React from 'react';
import { motion } from 'framer-motion';
import { Github, Linkedin, Mail, Facebook } from 'lucide-react';

const TeamSection = () => {
    const team = [
        // Engy Kaoud
        {
            name: "Engy Kaoud",
            role: "Researcher",
            image: "./team_photos/Injy.jpg",
            socials: [
                {
                    name: "email",
                    icon: <Mail size={18} strokeWidth={1.5} />,
                    url: "angykaoud@gmail.com"
                },
                {
                    name: "Facebook",
                    icon: <Facebook size={18} strokeWidth={1.5} />,
                    url: "https://www.facebook.com/profile.php?id=61575308375504"
                }
            ],
            description: "Leader and researcher passionate about science and technology, working on developing innovative ideas and transforming them into real-world solutions through research and teamwork, while leading teams to create real impact."
        },


        // Youssef Mohamed
        {
            name: "Youssef Mohamed",
            role: "AI Developer",
            image: "./team_photos/Yussef.jpg",
            socials: [
                {
                    name: "Github",
                    icon: <Github size={18} strokeWidth={1.5} />,
                    url: "https://github.com/YusufMohamed-tech"
                }
            ],
            description: "A high school student interested in AI and programming, passionate about learning new things in the world of technology."
        },
        {
            name: "Mohamed Ahmed",
            role: "Full-Stack Web Developer",
            image: "./team_photos/Mohamed.jpg",
            socials: [
                {
                    name: "Github",
                    icon: <Github size={18} strokeWidth={1.5} />,
                    url: "https://github.com/mohamed-ahmed99"
                },
                {
                    name: "Facebook",
                    icon: <Facebook size={18} strokeWidth={1.5} />,
                    url: "https://www.facebook.com/mohamed.ahmed.459624/"
                }
            ],
            description: "A high school student passionate about programming and scientific research, specializing in web development and problem-solving, always striving to transform ideas into innovative technological solutions."
        },

        {
            name: "Reda",
            role: "Full-Stack Web Developer",
            image: "./team_photos/Reda.jpg",
            socials: [
                {
                    name: "Github",
                    icon: <Github size={18} strokeWidth={1.5} />,
                    url: "https://github.com/reda445566"
                }
            ],
            description: "A high school student passionate about web development, focused on back-end, and enjoys participating in volunteer work."
        },
        {
            name: "Jana Mohamed",
            role: "Mobile Application Developer",
            image: "./team_photos/Jana.jpg",
            socials: [
                {
                    name: "linkedin",
                    icon: <Linkedin size={18} strokeWidth={1.5} />,
                    url: "https://www.linkedin.com/in/jana-mohamed-832199373?utm_source=share_via&utm_content=profile&utm_medium=member_android"
                },
                {
                    name: "Facebook",
                    icon: <Facebook size={18} strokeWidth={1.5} />,
                    url: "https://www.facebook.com/share/1BSU9nBmtU/"
                }
            ],
            description: "A high school girl interested in mobile app development, passionate about volunteering and helping students."
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
                            <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-900 mb-4 border border-zinc-800 transition-all duration-500 group-hover:border-zinc-500 flex items-center justify-center shadow-lg shadow-gray-700">
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
                                            {social.icon}
                                        </a>
                                    ))}
                                </div>

                                {/* Description */}
                                <p className="text-sm text-zinc-200">
                                    {member.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};



export default TeamSection;
