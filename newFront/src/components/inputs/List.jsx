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
                <label className="form-label ml-1">
                    {label} {required && <span className="text-[var(--status-danger)]">*</span>}
                </label>
            )}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    form-input flex items-center justify-between cursor-pointer select-none
                    ${error ? 'border-[var(--status-danger)]/50' : (isOpen ? 'border-[var(--accent-primary)] shadow-[0_0_0_3px_rgba(0,200,255,0.12)]' : 'border-[var(--border-default)] hover:border-[var(--accent-primary)]')}
                `}
            >
                <span className={!selectedOption ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                >
                    <ChevronDown size={18} className="text-[var(--text-secondary)]" />
                </motion.div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.98 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="absolute top-full left-0 w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[12px] shadow-2xl z-[100] overflow-hidden py-1.5 backdrop-blur-xl"
                    >
                        {options.map((option) => (
                            <motion.li
                                key={option.value}
                                onClick={() => handleSelect(option)}
                                className={`
                                    px-4 py-2.5 text-[var(--text-primary)] cursor-pointer text-sm
                                    hover:bg-[var(--accent-glow)] transition-all
                                    ${value === option.value ? 'bg-[var(--accent-glow-strong)] text-[var(--accent-primary)] font-medium' : ''}
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

