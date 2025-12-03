"use client";

import { useEffect, useState } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            if (onClose) onClose();
        }, 300);
    };

    if (!isVisible) return null;

    const types = {
        success: {
            bg: 'bg-green-500/90',
            icon: <FaCheckCircle className="text-2xl" />,
            border: 'border-green-400'
        },
        error: {
            bg: 'bg-red-500/90',
            icon: <FaExclamationCircle className="text-2xl" />,
            border: 'border-red-400'
        },
        info: {
            bg: 'bg-cyan-500/90',
            icon: <FaInfoCircle className="text-2xl" />,
            border: 'border-cyan-400'
        }
    };

    const config = types[type] || types.info;

    return (
        <div className={`
            fixed top-4 right-4 z-[9999]
            ${isExiting ? 'toast-exit' : 'toast-enter'}
        `}>
            <div className={`
                ${config.bg} ${config.border}
                backdrop-blur-md
                border-2
                rounded-lg
                shadow-2xl
                p-4
                flex items-center gap-3
                min-w-[300px]
                text-white
            `}>
                {config.icon}
                <span className="flex-1 font-medium">{message}</span>
                <button
                    onClick={handleClose}
                    className="hover:bg-white/20 rounded-full p-1 transition-colors"
                >
                    <FaTimes />
                </button>
            </div>
        </div>
    );
}
