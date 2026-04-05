import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Plus,
    Clock,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Settings,
    MoreVertical
} from 'lucide-react';
import { useGlobalData } from '../../hooks/useGlobalData';
import { getHistory, deleteHistoryItem } from './aiService';

const Sidebar = ({ isMobileOpen, onClose, onSelectHistory, onNewChat }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [user] = useGlobalData('user');
    const [history, setHistory] = useState([]);
    const [activeMenu, setActiveMenu] = useState(null);

    // Fetch real history on mount and when user changes
    useEffect(() => {
        if (user) {
            loadHistory();
        } else {
            setHistory([]);
        }
    }, [user]);

    const loadHistory = async () => {
        try {
            const items = await getHistory();
            setHistory(items);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        setActiveMenu(null);
        const success = await deleteHistoryItem(id);
        if (success) {
            setHistory(prev => prev.filter(item => item._id !== id));
        }
    };

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    if (!user) return null;

    return (
        <>
            {/* Backdrop Overlay for Mobile */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[60] sm:hidden"
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={{
                    width: isCollapsed ? '80px' : '280px',
                    x: isMobileOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 640 ? -280 : 0)
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`flex flex-col bg-zinc-950 border-r border-zinc-900 z-[70] 
                    fixed sm:relative top-0 sm:top-0 h-full sm:h-[calc(100vh-70px)]
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
                    transition-transform duration-200 sm:transition-none
                `}
            >
                {/* Close Button for Mobile */}
                <div className="flex sm:hidden p-4 border-b border-zinc-900 items-center justify-between">
                    <span className="font-bold text-zinc-100">History</span>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-100">
                        <ChevronLeft size={20} />
                    </button>
                </div>

                {/* Collapse Toggle Button (Desktop Only) */}
                <button
                    onClick={toggleSidebar}
                    className="hidden sm:flex absolute -right-3 top-6 w-6 h-6 bg-zinc-900 border border-zinc-800 rounded-full items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors z-50 shadow-lg"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Top Section: New Chat */}
                <div className="p-4">
                    <button
                        onClick={() => {
                            onNewChat && onNewChat();
                            if (window.innerWidth < 640) onClose();
                        }}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all group overflow-hidden ${isCollapsed ? 'px-0' : 'px-4'}`}
                    >
                        <Plus size={20} className="text-zinc-100 shrink-0" />
                        {!isCollapsed && (
                            <span className="text-sm font-semibold text-zinc-100 whitespace-nowrap">New Analysis</span>
                        )}
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
                    {!isCollapsed && (
                        <div className="px-2 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={12} />
                            Analysis History
                        </div>
                    )}

                    {history.length === 0 && !isCollapsed && (
                        <p className="text-xs text-zinc-600 px-2 py-4 text-center">
                            No analyses yet. Upload a scan to get started.
                        </p>
                    )}

                    {history.map((item) => (
                        <motion.div
                            key={item._id}
                            layout
                            onClick={() => {
                                onSelectHistory && onSelectHistory(item);
                                if (window.innerWidth < 640) onClose();
                            }}
                            className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-900/80 cursor-pointer transition-all relative"
                        >
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 group-hover:border-zinc-700">
                                <MessageSquare size={16} className="text-zinc-400 group-hover:text-zinc-100" />
                            </div>

                            {!isCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-zinc-300 group-hover:text-zinc-100 truncate font-medium">
                                        {item.title}
                                    </p>
                                    <p className="text-[11px] text-zinc-600 group-hover:text-zinc-500 transition-colors">
                                        {formatDate(item.createdAt)}
                                    </p>
                                </div>
                            )}

                            {!isCollapsed && (
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === item._id ? null : item._id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-zinc-100 transition-all"
                                    >
                                        <MoreVertical size={14} />
                                    </button>

                                    {/* Dropdown menu */}
                                    <AnimatePresence>
                                        {activeMenu === item._id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute right-0 top-8 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1 min-w-[140px]"
                                            >
                                                <button
                                                    onClick={(e) => handleDelete(e, item._id)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Bottom Section: User / Settings */}
                <div className="p-4 border-t border-zinc-900">
                    <div className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isCollapsed ? 'justify-center' : 'bg-zinc-900/30'}`}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 flex items-center justify-center text-zinc-100 font-bold shrink-0 shadow-inner">
                            {user?.personalInfo?.firstName ? user.personalInfo.firstName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-zinc-100 truncate">
                                    {user?.personalInfo?.firstName || 'User'}
                                </p>
                                <p className="text-[11px] text-zinc-500 truncate">{user?.personalInfo?.email || 'Free Plan'}</p>
                            </div>
                        )}
                        {!isCollapsed && (
                            <Settings size={18} className="text-zinc-500 hover:text-zinc-100 cursor-pointer transition-colors" />
                        )}
                    </div>
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;