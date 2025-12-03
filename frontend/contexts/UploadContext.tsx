"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UploadStatus {
    file: File;
    progress: number;
    status: 'queued' | 'uploading' | 'processing' | 'done' | 'error';
    uploadId?: string;
    error?: string;
}

interface UploadContextType {
    uploads: UploadStatus[];
    isWidgetOpen: boolean;
    addUploads: (files: File[]) => void;
    openWidget: () => void;
    closeWidget: () => void;
    updateUploadProgress: (index: number, progress: number) => void;
    updateUploadStatus: (index: number, status: UploadStatus['status'], uploadId?: string, error?: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
    const [uploads, setUploads] = useState<UploadStatus[]>([]);
    const [isWidgetOpen, setIsWidgetOpen] = useState(false);

    const addUploads = (files: File[]) => {
        const newUploads: UploadStatus[] = files.map((file, index) => ({
            file,
            progress: 0,
            status: (uploads.length === 0 && index === 0) ? 'uploading' : 'queued'
        }));
        setUploads(prev => [...prev, ...newUploads]);
        setIsWidgetOpen(true);

        // Start uploading serially
        startSerialUpload(uploads.length, files);
    };

    const startSerialUpload = async (startIndex: number, files: File[]) => {
        for (let i = 0; i < files.length; i++) {
            const currentIndex = startIndex + i;

            // Update to uploading
            setUploads(prev => {
                const updated = [...prev];
                if (updated[currentIndex]) {
                    updated[currentIndex] = { ...updated[currentIndex], status: 'uploading' };
                }
                return updated;
            });

            await uploadFile(files[i], currentIndex);
        }

        // Auto-close widget after all uploads complete
        setTimeout(() => {
            setUploads([]);
            setIsWidgetOpen(false);
        }, 3000);
    };

    const uploadFile = (file: File, uploadIndex: number): Promise<void> => {
        return new Promise((resolve) => {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `/api/upload`);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    updateUploadProgress(uploadIndex, percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    updateUploadStatus(uploadIndex, 'processing', data.upload_id);

                    setTimeout(() => {
                        updateUploadStatus(uploadIndex, 'done');
                        resolve();
                    }, 2000);
                } else {
                    updateUploadStatus(uploadIndex, 'error', undefined, 'Upload failed');
                    resolve();
                }
            };

            xhr.onerror = () => {
                updateUploadStatus(uploadIndex, 'error', undefined, 'Network error');
                resolve();
            };

            xhr.send(formData);
        });
    };

    const updateUploadProgress = (index: number, progress: number) => {
        setUploads(prev => {
            const updated = [...prev];
            if (updated[index]) {
                updated[index] = { ...updated[index], progress };
            }
            return updated;
        });
    };

    const updateUploadStatus = (index: number, status: UploadStatus['status'], uploadId?: string, error?: string) => {
        setUploads(prev => {
            const updated = [...prev];
            if (updated[index]) {
                updated[index] = {
                    ...updated[index],
                    status,
                    ...(uploadId && { uploadId }),
                    ...(error && { error })
                };
            }
            return updated;
        });
    };

    const openWidget = () => setIsWidgetOpen(true);
    const closeWidget = () => setIsWidgetOpen(false);

    return (
        <UploadContext.Provider value={{
            uploads,
            isWidgetOpen,
            addUploads,
            openWidget,
            closeWidget,
            updateUploadProgress,
            updateUploadStatus
        }}>
            {children}
        </UploadContext.Provider>
    );
}

export function useUpload() {
    const context = useContext(UploadContext);
    if (context === undefined) {
        throw new Error('useUpload must be used within UploadProvider');
    }
    return context;
}
