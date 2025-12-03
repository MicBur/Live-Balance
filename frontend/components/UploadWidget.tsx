"use client";

import React, { useState, useEffect } from 'react';
import { useUpload } from '../contexts/UploadContext';
import { FaCloudUploadAlt, FaSpinner, FaCheckCircle, FaTimesCircle, FaChevronDown, FaChevronUp, FaTimes } from 'react-icons/fa';

export default function UploadWidget() {
    const { uploads, isWidgetOpen, closeWidget } = useUpload();
    const [isMinimized, setIsMinimized] = useState(false);

    if (!isWidgetOpen || uploads.length === 0) return null;

    const totalProgress = uploads.reduce((acc, curr) => acc + curr.progress, 0) / uploads.length;
    const isAllDone = uploads.every(u => u.status === 'done');

    return (
        <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out ${isMinimized ? 'w-64' : 'w-80 sm:w-96'}`}>
            <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-white/5 p-3 flex items-center justify-between cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
                    <div className="flex items-center gap-2">
                        {isAllDone ? (
                            <FaCheckCircle className="text-green-400" />
                        ) : (
                            <FaSpinner className="text-cyan-400 animate-spin" />
                        )}
                        <span className="font-medium text-white text-sm">
                            {isAllDone ? 'Uploads abgeschlossen' : `Upload läuft (${Math.round(totalProgress)}%)`}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-white/50 hover:text-white">
                            {isMinimized ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); closeWidget(); }} className="text-white/50 hover:text-white">
                            <FaTimes size={12} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {!isMinimized && (
                    <div className="max-h-60 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {uploads.map((upload, index) => (
                            <div key={index} className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                            {upload.status === 'queued' && <FaCloudUploadAlt className="text-white/30" />}
                                            {upload.status === 'uploading' && <FaSpinner className="text-cyan-400 animate-spin" />}
                                            {upload.status === 'processing' && <FaSpinner className="text-yellow-400 animate-spin" />}
                                            {upload.status === 'done' && <FaCheckCircle className="text-green-400" />}
                                            {upload.status === 'error' && <FaTimesCircle className="text-red-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-white truncate" title={upload.file.name}>{upload.file.name}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-white/50 ml-2">
                                        {upload.status === 'queued' && 'Wartet'}
                                        {upload.status === 'uploading' && `${Math.round(upload.progress)}%`}
                                        {upload.status === 'processing' && 'Verarbeite'}
                                        {upload.status === 'done' && 'Fertig'}
                                        {upload.status === 'error' && 'Fehler'}
                                    </span>
                                </div>

                                {upload.status === 'uploading' && (
                                    <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                                        <div
                                            className="bg-cyan-400 h-full transition-all duration-300"
                                            style={{ width: `${upload.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
