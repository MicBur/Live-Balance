"use client";

import { useState } from 'react';

export default function NanoBananaButton({
    children,
    onClick,
    variant = 'primary',
    disabled = false,
    loading = false,
    className = '',
    type = 'button',
    ...props
}) {
    const [ripples, setRipples] = useState([]);

    const variants = {
        primary: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-[0_0_20px_rgba(255,215,0,0.4)] hover:shadow-[0_0_30px_rgba(255,215,0,0.6)]',
        secondary: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]',
        danger: 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]',
        success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]',
        ghost: 'bg-transparent border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/40'
    };

    const handleClick = (e) => {
        if (disabled || loading) return;

        // Create ripple effect
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRipple = {
            x,
            y,
            id: Date.now()
        };

        setRipples(prev => [...prev, newRipple]);

        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== newRipple.id));
        }, 600);

        if (onClick) onClick(e);
    };

    return (
        <button
            type={type}
            onClick={handleClick}
            disabled={disabled || loading}
            className={`
                relative overflow-hidden
                px-6 py-3 rounded-full
                font-semibold
                transition-all duration-300
                transform hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${variants[variant]}
                ${className}
            `}
            {...props}
        >
            {/* Ripple effects */}
            {ripples.map(ripple => (
                <span
                    key={ripple.id}
                    className="absolute rounded-full bg-white/30 animate-ripple"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: 0,
                        height: 0,
                    }}
                />
            ))}

            {/* Content */}
            <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                    <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Lädt...</span>
                    </>
                ) : (
                    children
                )}
            </span>
        </button>
    );
}
