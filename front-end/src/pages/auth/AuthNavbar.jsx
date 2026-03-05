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
        <nav className="w-full h-16 px-6 md:px-12 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 fixed top-0 left-0 z-50">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
                    <span className="text-zinc-900 font-bold text-lg">N</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-zinc-100">NeuroAi</span>
            </Link>

            {/* Dynamic Action Button */}
            <div className="flex items-center gap-4">
                <span className="hidden sm:block text-sm text-zinc-400 font-medium">
                    {helperText}
                </span>
                <Link
                    to={buttonLink}
                    className="px-5 py-2 rounded-full bg-zinc-100 text-zinc-900 text-sm font-semibold transition-all hover:bg-zinc-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95 shadow-sm"
                >
                    {buttonText}
                </Link>
            </div>
        </nav>
    );
}



export default AuthNavbar;
