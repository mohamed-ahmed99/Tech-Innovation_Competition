import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function AuthNavbar() {
    const location = useLocation();
    const pathname = location.pathname;

    let buttonText = "";
    let buttonLink = "";

    if (pathname === '/auth/sign-up') {
        buttonText = "Log In";
        buttonLink = "/auth/login";
    } else if (pathname === '/auth/login') {
        buttonText = "Sign Up";
        buttonLink = "/auth/sign-up";
    } else if (pathname === '/auth/verify-email') {
        buttonText = "Log In";
        buttonLink = "/auth/login";
    } else {
        // Fallback or default for other auth-related sub-paths
        buttonText = "Log In";
        buttonLink = "/auth/login";
    }


    let helperText = "Don't have an account?";
    if (pathname === '/auth/sign-up') {
        helperText = "Already have an account?";
    } else if (pathname === '/auth/verify-email') {
        helperText = "Back to safety?";
    }

    return (
        <nav className="w-full h-16 px-6 md:px-12 flex items-center justify-between bg-[var(--bg-elevated)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] fixed top-0 left-0 z-50">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 flex items-center justify-center bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] shadow-xl overflow-hidden p-1.5 transition-transform group-hover:scale-105">
                    <img src="/assets/images/logo1.png" alt="NeuroGaurd Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-bold tracking-tight text-[var(--text-primary)] leading-tight">NeuroGaurd</span>
                    <span className="text-[9px] text-[var(--text-muted)] font-normal uppercase tracking-[0.2em]">AUTH GATEWAY</span>
                </div>
            </Link>

            {/* Dynamic Action Button */}
            <div className="flex items-center gap-4">
                <span className="hidden sm:block text-sm text-[var(--text-muted)] font-medium">
                    {helperText}
                </span>
                <Link
                    to={buttonLink}
                    className="btn-primary px-6 py-2 h-auto text-xs"
                >
                    {buttonText}
                </Link>
            </div>
        </nav>
    );
}



export default AuthNavbar;
