import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, LogIn, Info, Cpu } from 'lucide-react';

export default function MobileMenu({ navLinks, isOpen, onClose, isUserAuthenticated, onLogout }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-y-0 right-0 w-[280px] bg-[var(--bg-elevated)] border-l border-[var(--border-subtle)] z-[1000] flex flex-col p-8 backdrop-blur-xl shadow-2xl"
                >
                    <div className="flex flex-col gap-6">
                        <div className="mb-4">
                             <span className="text-[10px] text-[var(--accent-primary)] font-normal uppercase tracking-[0.2em] block mb-2">Navigation</span>
                             <div className="h-px w-full bg-[var(--border-subtle)]"></div>
                        </div>
                        
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={onClose}
                                className="flex items-center gap-3 text-base font-medium text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors group"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-active)] group-hover:bg-[var(--accent-primary)] transition-colors"></span>
                                {link.label}
                            </Link>
                        ))}

                        <div className="mt-4 pt-6 border-t border-[var(--border-subtle)]">
                            {!isUserAuthenticated && (
                                <Link
                                    to="/auth/login"
                                    onClick={onClose}
                                    className="btn-primary w-full"
                                >
                                    <LogIn size={18} className="mr-2" />
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="mt-auto pb-4 text-center">
                        <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest">
                            &copy; {new Date().getFullYear()} NEUROAI
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
