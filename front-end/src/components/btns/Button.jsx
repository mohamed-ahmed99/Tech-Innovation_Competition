import React from 'react';
import { motion } from 'framer-motion';

const Button = ({
    children,
    onClick,
    type = "button",
    variant = "primary", // primary, secondary, outline, ghost, danger
    size = "md", // sm, md, lg (controls padding/font)
    width = "fit", // fit, full, or custom class like 'w-48'
    className = "",
    disabled = false,
    isLoading = false,
    style = {}, // Custom inline styles
    ...props
}) => {

    // Base styles
    const baseStyles = "inline-flex cursor-pointer items-center justify-center font-semibold transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none rounded-xl overflow-hidden";

    // Variant styles
    const variants = {
        primary: "bg-zinc-100 text-zinc-900",
        secondary: "bg-zinc-800 text-zinc-100",
        outline: "bg-transparent border border-zinc-700 text-zinc-100",
        ghost: "bg-transparent text-zinc-400 hover:text-zinc-100",
        danger: "bg-red-500/10 text-red-500 border border-red-500/20"
    };

    // Size styles (Padding & Font Size only)
    const sizes = {
        vsm: "px-4 py-1 text-sm",
        sm: "px-6 py-2 text-base",
        vmd: "px-7 py-2.5 text-base",
        md: "px-8 py-3 text-lg",
        lg: "px-10 py-4 text-xl",
    };

    // Width styles
    const widthStyles = width === "full" ? "w-full" : (width === "fit" ? "w-fit" : width);

    return (
        <motion.button
            whileHover={{
                scale: 1.02,
                boxShadow: variant === 'primary' ? "0 0 20px rgba(255,255,255,0.15)" : "0 0 15px rgba(0,0,0,0.3)"
            }}
            whileTap={{ scale: 0.98 }}
            type={type}
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`
                ${baseStyles}
                ${variants[variant] || variants.primary}
                ${sizes[size] || sizes.md}
                ${widthStyles}
                ${className}
            `}
            style={style}
            {...props}
        >
            {isLoading ? (
                <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : children}
        </motion.button>
    );
};

export default Button;
