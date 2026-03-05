import React from 'react';

const Input = ({
    label,
    type = "text",
    placeholder,
    value,
    onChange,
    name,
    required = false,
    error,
    className = ""
}) => {
    return (
        <div className={`flex flex-col gap-1.5 w-full ${className}`}>
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
                required={required}
                className={`
                    w-full px-4 py-3 rounded-xl bg-zinc-800/50 border transition-all duration-200
                    text-zinc-100 placeholder:text-zinc-500 outline-none
                    ${error ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-700 focus:border-zinc-500 focus:bg-zinc-800/80'}
                    ${className}
                `}
            />
            {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
        </div>
    );
};

export default Input;
