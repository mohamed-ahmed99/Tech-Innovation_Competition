import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, LogIn } from 'lucide-react';

export default function MobileMenu({ navLinks, currentPath, isOpen, onClose, isUserAuthenticated, onLogout }) {
    const isLinkActive = (to) => {
        if (to === '/about-us') {
            return currentPath === '/' || currentPath === '/about-us';
        }

        if (to === '/scan') {
            return currentPath === '/scan' || currentPath === '/model';
        }

        if (to === '/simulation-3d') {
            return currentPath === '/simulation-3d' || currentPath === '/treatment-3d';
        }

        return currentPath === to;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 top-[70px] left-0 w-full h-[calc(100vh-70px)] bg-zinc-950/95 backdrop-blur-md z-40 flex flex-col p-6"
                >
                    <div className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={onClose}
                                className={`flex items-center gap-3 text-base font-medium p-3 rounded-xl border transition-colors ${
                                    isLinkActive(link.to)
                                        ? 'text-zinc-100 bg-zinc-900 border-zinc-700'
                                        : 'text-zinc-300 border-transparent hover:bg-zinc-900 hover:text-zinc-100'
                                }`}
                            >
                                {link.icon}
                                {link.label}
                            </Link>
                        ))}

                        <div className="mt-2 pt-4 border-t border-zinc-900">
                            {isUserAuthenticated ? (
                                <button
                                    onClick={onLogout}
                                    className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold active:scale-95 transition-transform"
                                >
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            ) : (
                                <Link
                                    to="/auth/login"
                                    onClick={onClose}
                                    className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-zinc-100 text-zinc-950 text-sm font-bold active:scale-95 transition-transform"
                                >
                                    <LogIn size={18} />
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="mt-auto pb-6 text-center">
                        <p className="text-zinc-600 text-xs">
                            &copy; {new Date().getFullYear()} NeuroAi Innovation.
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
