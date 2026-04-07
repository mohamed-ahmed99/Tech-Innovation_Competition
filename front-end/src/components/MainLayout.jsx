import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useGlobalData } from '../hooks/useGlobalData';
import Navbar from './navbar/Navbar';
import Sidebar from '../pages/scan/Sidebar';
import { useLocation } from 'react-router-dom';
import ChatbotWidget from './ChatbotWidget';

export default function MainLayout() {
    const [user] = useGlobalData('user');
    const [, setGlobalData] = useGlobalData();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const location = useLocation();

    const handleSelectHistory = (analysis) => {
        setGlobalData('selectedAnalysis', analysis);
    };

    const handleNewChat = () => {
        setGlobalData('selectedAnalysis', null);
        setGlobalData('triggerNewChat', Date.now());
    };


    const pagesHasSidebar = ['/', '/scan', '/digital-twin'];

    return (
        <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">

            {/* Navbar */}
            <Navbar
                isUserAuthenticated={user ? true : false}
                onToggleSidebar={toggleSidebar}
            />

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden relative">
                {(user && (location.pathname === '/scan' || location.pathname === '/model')) && (
                    <Sidebar
                        isMobileOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        onSelectHistory={handleSelectHistory}
                        onNewChat={handleNewChat}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto relative bg-zinc-950">
                    <Outlet />
                </main>

                <ChatbotWidget />
            </div>
        </div>
    );
}
