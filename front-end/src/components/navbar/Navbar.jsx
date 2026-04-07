import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, LogIn, Info, Menu, X, PanelLeft, Cpu, Scan } from 'lucide-react';
import { useGlobalData } from '../../hooks/useGlobalData';


// navbar
import MobileMenu from './MobileMenu';


export default function Navbar({ isUserAuthenticated, onToggleSidebar }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(null);
    const [, setGlobalData] = useGlobalData();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem("NeuroAi_Token");
        setGlobalData("user", null);
        setIsMenuOpen(false);
        navigate("/");
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const navLinks = [
        { to: "/digital-twin", label: "Digital Twin", icon: <Cpu size={16} /> },
        { to: "/scan", label: "Scan", icon: <Scan size={16} /> },
        { to: "/simulation-3d", label: "3D Simulation", icon: <Cpu size={16} /> },
        { to: "/about-us", label: "About Us", icon: <Info size={16} /> },
    ];

    return (
        <nav className="w-full h-[70px] px-6 md:px-12 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 sticky top-0 z-50">
            {/* Left side: Logo & Sidebar toggle on mobile */}
            <div className="flex items-center gap-3">
                {isUserAuthenticated && location.pathname != "/about-us" ? (
                    <button
                        onClick={onToggleSidebar}
                        className="sm:hidden p-2 -ml-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl transition-all"
                        aria-label="Toggle Sidebar"
                    >
                        <PanelLeft size={22} />
                    </button>
                ) : null}

                <Link to="/" className="flex items-center gap-2.5 group">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-10 h-10 bg-gradient-to-br from-zinc-100 to-zinc-300 rounded-xl flex items-center justify-center shadow-lg shadow-white/5"
                    >
                        <span className="text-zinc-950 font-black text-xl">N</span>
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="text-lg font-bold tracking-tight text-zinc-100 leading-tight">NeuroAi</span>
                        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest text-zinc-500">Innovation</span>
                    </div>
                </Link>
            </div>


            {/* Desktop: Right side */}
            <div className="flex items-center gap-6 md:gap-8">

                {navLinks.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className="hidden sm:flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors font-medium"
                    >
                        {link.icon}
                        {link.label}
                    </Link>
                ))}

                {isUserAuthenticated ? null : (
                    <Link
                        to="/auth/login"
                        className="hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 text-sm font-bold transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
                    >
                        <LogIn size={16} />
                        Sign In
                    </Link>
                )}

                {/* Mobile Menu Toggle Button */}
                <button
                    onClick={toggleMenu}
                    className="sm:hidden text-zinc-400 hover:text-zinc-100 p-2 hover:bg-zinc-900 rounded-lg transition-colors z-50"
                >
                    {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
                </button>
            </div>

            {/* Mobile Menu Component (Refined & Smaller) */}
            <MobileMenu
                navLinks={navLinks}
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                isUserAuthenticated={isUserAuthenticated}
                onLogout={handleLogout}
            />
        </nav>
    );
}


