
import React from 'react';
import { Outlet } from 'react-router-dom';
import AuthNavbar from './AuthNavbar';

export default function AuthLayout() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
            <AuthNavbar />
            <main className="flex-1 flex items-center justify-center p-4 pt-20">
                <Outlet />
            </main>
        </div>


    );
}
