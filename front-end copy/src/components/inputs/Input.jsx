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
                <label className="form-label ml-1">
                    {label} {required && <span className="text-[var(--status-danger)]">*</span>}
                </label>
            )}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`
                    form-input
                    ${error ? 'border-[var(--status-danger)]/50 focus:border-[var(--status-danger)]' : ''}
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
