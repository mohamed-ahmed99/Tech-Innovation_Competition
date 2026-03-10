
import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import AuthNavbar from './AuthNavbar';
import { useGlobalData } from '../../hooks/useGlobalData';

export default function AuthLayout() {
    const [store] = useGlobalData();
    const user = store?.user;

    // If user is already logged in, redirect them away from auth pages
    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
            <AuthNavbar />
            <main className="flex-1 flex justify-center p-4 pt-24 pb-12">
                <Outlet />
            </main>
        </div>
    );
}
