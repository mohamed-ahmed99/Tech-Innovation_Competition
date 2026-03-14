import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useGlobalData } from '../hooks/useGlobalData';
import Navbar from './Navbar';
import Sidebar from '../pages/home/Sidebar';
import { useLocation } from 'react-router-dom';

export default function MainLayout() {
    const [user] = useGlobalData('user');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const location = useLocation();

    return (
        <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">

            {/* Navbar */}
            <Navbar
                isUserAuthenticated={user ? true : false}
                onToggleSidebar={toggleSidebar}
            />

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden relative">
                {user && location.pathname === '/' && (
                    <Sidebar
                        isMobileOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto relative bg-zinc-950">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
