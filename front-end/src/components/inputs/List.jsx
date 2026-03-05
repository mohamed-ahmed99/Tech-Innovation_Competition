import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const List = ({
    label,
    options,
    value,
    onChange,
    name,
    required = false,
    error,
    placeholder = "Select an option",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (option) => {
        onChange({
            target: {
                name,
                value: option.value
            }
        });
        setIsOpen(false);
    };

    return (
        <div className={`flex flex-col gap-1.5 w-full relative ${className}`} ref={containerRef}>
            {label && (
                <label className="text-sm font-medium text-zinc-400 ml-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full px-4 py-3 rounded-xl bg-zinc-800/50 border transition-all duration-150
                    text-zinc-100 flex items-center justify-between cursor-pointer select-none
                    ${error ? 'border-red-500/50' : (isOpen ? 'border-zinc-500 bg-zinc-800/80 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'border-zinc-700 hover:border-zinc-600')}
                `}
            >
                <span className={!selectedOption ? "text-zinc-500/70" : ""}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                >
                    <ChevronDown size={18} className="text-zinc-500" />
                </motion.div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.98 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="absolute top-full left-0 w-full bg-zinc-900/95 border border-zinc-700/50 rounded-xl shadow-2xl z-[100] overflow-hidden py-1.5 backdrop-blur-xl"
                    >
                        {options.map((option) => (
                            <motion.li
                                key={option.value}
                                onClick={() => handleSelect(option)}
                                className={`
                                    px-4 py-2.5 text-zinc-200 cursor-pointer text-sm
                                    hover:bg-zinc-700 transition-none
                                    ${value === option.value ? 'bg-zinc-800 text-white font-medium' : ''}
                                `}
                            >
                                {option.label}
                            </motion.li>
                        ))}

                    </motion.ul>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {error && (
                    <motion.span
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs text-red-500 ml-1 font-medium"
                    >
                        {error}
                    </motion.span>
                )}
            </AnimatePresence>
        </div>
    );
};

export default List;

