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

    const navLinks = location.pathname === '/' ? [] : [
        { to: "/digital-twin", label: "Digital Twin", icon: <Cpu size={16} /> },
        { to: "/scan", label: "Scan", icon: <Scan size={16} /> },
        { to: "/simulation-3d", label: "3D Lab", icon: <Cpu size={16} /> },
        { to: "/about-us", label: "About Us", icon: <Info size={16} /> },
    ];

    return (
        <nav className="navbar-redesign">
            {/* Left side: Logo & Sidebar toggle on mobile */}
            <div className="flex items-center gap-4">
                {isUserAuthenticated && location.pathname !== "/about-us" ? (
                    <button
                        onClick={onToggleSidebar}
                        className="sm:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-glow)] rounded-xl transition-all"
                        aria-label="Toggle Sidebar"
                    >
                        <PanelLeft size={22} />
                    </button>
                ) : null}

                <Link to="/" className="flex items-center gap-3 group">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-10 h-10 flex items-center justify-center bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] shadow-xl overflow-hidden p-1.5"
                    >
                        <img src="/assets/images/logo1.png" alt="NeuroGaurd Logo" className="w-full h-full object-contain" />
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold tracking-tight text-[var(--text-primary)] leading-tight heading-font">NeuroGaurd</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-normal uppercase tracking-[0.2em]">PRECISION AI</span>
                    </div>
                </Link>
            </div>


            {/* Desktop: Right side */}
            <div className="flex items-center gap-4 md:gap-2 h-full">

                {navLinks.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className={`nav-link-redesign h-full hidden lg:flex ${location.pathname === link.to ? 'active' : ''}`}
                    >
                        {link.label}
                    </Link>
                ))}

                {!isUserAuthenticated && (
                    <Link
                        to="/auth/login"
                        className="btn-secondary h-10 ml-4 px-6 text-xs flex items-center gap-2"
                    >
                        <LogIn size={15} />
                        Sign In
                    </Link>
                )}

                {/* Mobile Menu Toggle Button */}
                <button
                    onClick={toggleMenu}
                    className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--accent-primary)] p-2 hover:bg-[var(--accent-glow)] rounded-lg transition-colors z-50"
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


