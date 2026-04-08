import { Outlet, Navigate } from 'react-router-dom';
import AuthNavbar from './AuthNavbar';
import { useGlobalData } from '../../hooks/useGlobalData';

export default function AuthLayout() {
    const [user] = useGlobalData('user');

    // If user is already logged in, redirect them away from auth pages
    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col relative overflow-hidden">
            <div className="hero-grid-bg" />
            <AuthNavbar />
            <main className="flex-1 flex justify-center p-4 pt-24 pb-12 relative z-10">
                <Outlet />
            </main>
        </div>
    );
}
