"use client";

import { useState } from 'react';
import GlassCard from '@/components/GlassCard';
import { useRouter } from 'next/navigation';
import { FaCloudUploadAlt, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

interface UploadStatus {
    file: File;
    progress: number;
    status: 'queued' | 'uploading' | 'processing' | 'done' | 'error';
    uploadId?: string;
    error?: string;
}

export default function UploadPage() {
    const [uploads, setUploads] = useState<UploadStatus[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const router = useRouter();

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);

        const startIndex = uploads.length; // Index where new uploads will start in the `uploads` array

        // Add all files to upload state with 'queued' status initially
        const newUploads: UploadStatus[] = fileArray.map((file, index) => ({
            file,
            progress: 0,
            // If this is the very first file overall, it starts as 'uploading'.
            // Otherwise, it starts as 'queued'.
            status: (startIndex === 0 && index === 0) ? ('uploading' as const) : ('queued' as const)
        }));

        setUploads(prev => [...prev, ...newUploads]);

        // Upload files serially (one after another)
        for (let i = 0; i < fileArray.length; i++) {
            // Ensure the status is 'uploading' when its turn comes
            setUploads(prev => {
                const updated = [...prev];
                if (updated[startIndex + i].status === 'queued') {
                    updated[startIndex + i] = {
                        ...updated[startIndex + i],
                        status: 'uploading'
                    };
                }
                return updated;
            });
            await uploadFile(fileArray[i], startIndex + i);
        }
    };

    const uploadFile = (file: File, uploadIndex: number): Promise<void> => {
        return new Promise((resolve, reject) => {
            // Update status to uploading
            setUploads(prev => {
                const updated = [...prev];
                updated[uploadIndex] = {
                    ...updated[uploadIndex],
                    status: 'uploading'
                };
                return updated;
            });

            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `/api/upload`);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    setUploads(prev => {
                        const updated = [...prev];
                        updated[uploadIndex] = {
                            ...updated[uploadIndex],
                            progress: percentComplete
                        };
                        return updated;
                    });
                }
            };

            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    setUploads(prev => {
                        const updated = [...prev];
                        updated[uploadIndex] = {
                            ...updated[uploadIndex],
                            progress: 100,
                            status: 'processing',
                            uploadId: data.upload_id
                        };
                        return updated;
                    });

                    // Wait a bit then mark as done
                    setTimeout(() => {
                        setUploads(prev => {
                            const updated = [...prev];
                            updated[uploadIndex] = {
                                ...updated[uploadIndex],
                                status: 'done'
                            };
                            return updated;
                        });
                        resolve();
                    }, 2000);
                } else {
                    setUploads(prev => {
                        const updated = [...prev];
                        updated[uploadIndex] = {
                            ...updated[uploadIndex],
                            status: 'error',
                            error: 'Upload failed'
                        };
                        return updated;
                    });
                    resolve(); // Continue with next file even on error
                }
            };

            xhr.onerror = () => {
                setUploads(prev => {
                    const updated = [...prev];
                    updated[uploadIndex] = {
                        ...updated[uploadIndex],
                        status: 'error',
                        error: 'Network error'
                    };
                    return updated;
                });
                resolve(); // Continue with next file even on error
            };

            xhr.send(formData);
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e.dataTransfer.files);
    };

    const allDone = uploads.length > 0 && uploads.every(u => u.status === 'done' || u.status === 'error');

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
            <GlassCard className="w-full max-w-3xl">
                <h1 className="text-4xl font-bold mb-8 text-cyan-400 text-center">Hey Mark! Upload</h1>

                {/* Upload Zone */}
                <div
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 mb-6 transition-all ${isDragging
                        ? 'border-cyan-400 bg-cyan-400/10'
                        : 'border-white/20 hover:border-cyan-400/50'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <FaCloudUploadAlt className="text-6xl mb-4 text-white/50" />
                    <p className="mb-4 text-lg">Drag & Drop mehrere MP3 oder WAV Dateien hier</p>
                    <input
                        type="file"
                        accept=".mp3,.wav"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        className="hidden"
                        id="file-upload"
                        multiple
                    />
                    <label
                        htmlFor="file-upload"
                        className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 rounded-full font-bold cursor-pointer transition-all"
                    >
                        Dateien auswählen
                    </label>
                </div>

                {/* Upload Progress List */}
                {uploads.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-xl font-semibold mb-4">
                            Uploads ({uploads.filter(u => u.status === 'done').length}/{uploads.length})
                        </h2>

                        {uploads.map((upload, index) => (
                            <div key={index} className="bg-white/5 rounded-lg p-4 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {upload.status === 'queued' && <FaCloudUploadAlt className="text-white/30 flex-shrink-0" />}
                                        {upload.status === 'uploading' && <FaSpinner className="text-cyan-400 animate-spin flex-shrink-0" />}
                                        {upload.status === 'processing' && <FaSpinner className="text-yellow-400 animate-spin flex-shrink-0" />}
                                        {upload.status === 'done' && <FaCheckCircle className="text-green-400 flex-shrink-0" />}
                                        {upload.status === 'error' && <FaTimesCircle className="text-red-400 flex-shrink-0" />}

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{upload.file.name}</p>
                                            <p className="text-xs text-white/50">{formatFileSize(upload.file.size)}</p>
                                        </div>
                                    </div>

                                    <div className="text-sm text-white/70 ml-4">
                                        {upload.status === 'queued' && 'Wartet...'}
                                        {upload.status === 'uploading' && `${Math.round(upload.progress)}%`}
                                        {upload.status === 'processing' && 'Verarbeite...'}
                                        {upload.status === 'done' && 'Fertig!'}
                                        {upload.status === 'error' && upload.error}
                                    </div>
                                </div>

                                {(upload.status === 'uploading') && (
                                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-cyan-400 h-full transition-all duration-200"
                                            style={{ width: `${upload.progress}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {allDone && (
                            <button
                                onClick={() => router.push('/')}
                                className="w-full mt-6 px-6 py-3 bg-green-500 hover:bg-green-400 rounded-full font-bold transition-all"
                            >
                                Zum Dashboard
                            </button>
                        )}
                    </div>
                )}
            </GlassCard>
        </main>
    );
}
