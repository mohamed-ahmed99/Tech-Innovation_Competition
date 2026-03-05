import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Input = ({
    label,
    type = "text",
    placeholder,
    value,
    onChange,
    name,
    required = false,
    error,
    className = "",
    style = {}, // Custom inline styles supported
    ...props
}) => {
    return (
        <div className={`flex flex-col gap-1.5 w-full ${className}`} style={style}>
            {label && (
                <label className="text-sm font-medium text-zinc-400 ml-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`
                    w-full px-4 py-3 rounded-xl bg-zinc-800/50 border transition-all duration-200
                    placeholder:text-zinc-600 text-zinc-100 outline-none
                    ${error ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-700 focus:border-zinc-500 focus:bg-zinc-800/80'}
                `}
                {...props}
            />
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

export default Input;
