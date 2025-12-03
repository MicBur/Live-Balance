"use client";

import React, { useEffect, useState } from 'react';
import GlassCard from '@/components/GlassCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaMicrophone, FaStop, FaDownload, FaMagic, FaEdit, FaCheck, FaTimes, FaPaperPlane, FaTrash } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useUpload } from '../contexts/UploadContext';
import ParticleBackground from '@/components/ParticleBackground';
import NanoBananaButton from '@/components/NanoBananaButton';
import Toast from '@/components/Toast';
import SkeletonLoader from '@/components/SkeletonLoader';
import { getCategoryColor } from '@/utils/categoryColors';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Home() {
    const { addUploads } = useUpload();
    const [stats, setStats] = useState(null);
    const [processingUploads, setProcessingUploads] = useState([]);
    const [clips, setClips] = useState([]);
    const [selectedClip, setSelectedClip] = useState(null);
    const [suggestion, setSuggestion] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const [dictationRecorder, setDictationRecorder] = useState(null);
    const [editingClipId, setEditingClipId] = useState(null);
    const [editTopicValue, setEditTopicValue] = useState("");
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [playingAudio, setPlayingAudio] = useState(null);
    const [currentAudio, setCurrentAudio] = useState(null);
    const [expandedSuggestions, setExpandedSuggestions] = useState({});
    const [customPrompt, setCustomPrompt] = useState("");
    const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
    const [customTip, setCustomTip] = useState(null);
    const [isDictating, setIsDictating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingSuggestion, setEditingSuggestion] = useState(null); // {id, text}
    const [liveTranscript, setLiveTranscript] = useState("");
    const [toasts, setToasts] = useState([]);

    const router = useRouter();

    // Toast helper
    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/login');
            return;
        }

        const API_URL = '/api';  // Use Next.js API routes instead of proxy

        // Fetch stats from backend
        const fetchStats = () => {
            fetch(`${API_URL}/stats`)
                .then(res => res.json())
                .then(setStats)
                .catch(err => console.error("Failed to fetch stats:", err));
        };

        // Poll for processing uploads
        const pollStatus = () => {
            fetch(`${API_URL}/uploads/status`)
                .then(res => res.json())
                .then(setProcessingUploads)
                .catch(err => console.error("Failed to fetch status:", err));
        };

        // Poll for clips from all processing uploads
        const pollClips = () => {
            fetch(`${API_URL}/segments/all`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setClips(data);
                    }
                })
                .catch(err => console.error("Failed to fetch clips:", err));
        };

        fetchStats();
        pollStatus();
        pollClips();

        const statusInterval = setInterval(pollStatus, 2000);
        const clipsInterval = setInterval(pollClips, 3000);
        const statsInterval = setInterval(fetchStats, 5000);

        return () => {
            clearInterval(statusInterval);
            clearInterval(clipsInterval);
            clearInterval(statsInterval);
        };
    }, []);

    const fetchSuggestion = async () => {
        const API_URL = '/api';
        setIsGenerating(true);
        setSuggestion(null);
        try {
            const res = await fetch(`${API_URL}/suggestions/new-minute`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            console.log("Received suggestions:", data);
            if (!data || (Array.isArray(data) && data.length === 0)) {
                alert("Keine Vorschläge vom Backend erhalten!");
            }
            setSuggestion(data);
        } catch (err) {
            console.error("Failed to fetch suggestion", err);
            alert(`Fehler beim Laden der Vorschläge: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `neue_minute_${new Date().toISOString()}.webm`;
                a.click();
                setAudioChunks([]);
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access denied", err);
            alert("Mikrofon-Zugriff verweigert!");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    const startEditing = (e, clip) => {
        e.stopPropagation();
        setEditingClipId(clip.file_name);
        setEditTopicValue(clip.topic || "");
    };

    const cancelEditing = (e) => {
        e.stopPropagation();
        setEditingClipId(null);
        setEditTopicValue("");
    };

    const handleCustomPromptSubmit = async () => {
        if (!customPrompt.trim()) return;

        const API_URL = '/api';
        setIsGeneratingCustom(true);
        setCustomTip(null);

        try {
            const res = await fetch(`${API_URL}/generate-custom-tip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: customPrompt, style_profile: stats?.style_samples > 0 ? { filler_words: "äh, halt", pace: "schnell", tone: "direkt" } : {} })
            });

            if (!res.ok) throw new Error('Generation failed');

            const data = await res.json();
            setCustomTip({
                id: 'custom-' + Date.now(),
                text: data.text,
                topic: data.topic,
                word_count: data.word_count,
                suggested_topic: "Dein Thema: " + customPrompt
            });

        } catch (error) {
            console.error("Custom prompt error:", error);
            alert("Fehler bei der Generierung!");
        } finally {
            setIsGeneratingCustom(false);
        }
    };

    const startDictation = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Dein Browser unterstützt keine Spracherkennung. Bitte nutze Chrome oder Edge.");
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'de-DE';

        recognition.onstart = () => {
            setIsDictating(true);
            setLiveTranscript("");
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                setCustomPrompt(prev => (prev ? prev + " " : "") + finalTranscript);
            }
            setLiveTranscript(interimTranscript);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsDictating(false);
        };

        recognition.onend = () => {
            setIsDictating(false);
            setLiveTranscript("");
        };

        recognition.start();
        setDictationRecorder(recognition);
    };

    const stopDictation = () => {
        if (dictationRecorder) {
            dictationRecorder.stop();
        }
    };

    const saveTopic = async (e, clipId) => {
        e.stopPropagation();
        const API_URL = '/api';
        try {
            const res = await fetch(`${API_URL}/clips/${clipId}/topic`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: editTopicValue })
            });

            if (res.ok) {
                // Update local state
                setClips(clips.map(c =>
                    c.file_name === clipId ? { ...c, topic: editTopicValue } : c
                ));
                setEditingClipId(null);
            } else {
                alert("Fehler beim Speichern des Themas");
            }
        } catch (err) {
            console.error("Failed to update topic:", err);
            alert("Fehler beim Speichern des Themas");
        }
    };

    const playTTS = async (suggestionId, text) => {
        const API_URL = '/api';

        // Stop current audio if playing
        if (playingAudio === suggestionId) {
            const audioEl = document.getElementById('tts-audio-player');
            if (audioEl) {
                audioEl.pause();
                audioEl.currentTime = 0;
            }
            setPlayingAudio(null);
            return;
        }

        try {
            setPlayingAudio(suggestionId);
            const audioEl = document.getElementById('tts-audio-player');
            if (audioEl) {
                audioEl.src = `${API_URL}/tts?text=${encodeURIComponent(text)}`;
                await audioEl.play();
            }
        } catch (err) {
            console.error("TTS Error:", err);
            alert("Fehler beim Abspielen des Audios");
            setPlayingAudio(null);
        }
    };

    const deleteClip = async (e, clip) => {
        e.stopPropagation();

        // Confirmation dialog
        if (!confirm(`Clip "${clip.topic || 'Unbekannt'}" wirklich löschen?`)) {
            return;
        }

        const API_URL = '/api';
        try {
            console.log(`Attempting to delete clip: ${clip.file_name}`);
            const res = await fetch(`${API_URL}/clips/${encodeURIComponent(clip.file_name)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Remove from UI
                setClips(clips.filter(c => c.file_name !== clip.file_name));

                // Refresh stats to update theme counts
                fetch(`${API_URL}/stats`)
                    .then(res => res.json())
                    .then(setStats)
                    .catch(err => console.error("Failed to refresh stats:", err));

                showToast("Clip erfolgreich gelöscht!", "success");
            } else {
                const errorText = await res.text();
                console.error(`Delete failed: ${res.status} ${res.statusText}`, errorText);
                showToast(`Fehler beim Löschen: ${res.status}`, "error");
            }
        } catch (err) {
            console.error("Failed to delete clip:", err);
            showToast(`Fehler beim Löschen: ${err.message}`, "error");
        }
    };

    return (
        <>
            <ParticleBackground />
            <div className="min-h-screen p-8 relative z-10">
                <header className="flex justify-between items-center mb-12">
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                        Hey Mark!
                    </h1>
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        multiple
                        accept="audio/*"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                addUploads(Array.from(e.target.files));
                                // Reset input value to allow selecting same files again if needed
                                e.target.value = '';
                            }
                        }}
                    />
                    <button
                        onClick={() => document.getElementById('file-upload').click()}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all border border-white/10"
                    >
                        <span className="text-xl">☁️</span> Upload
                    </button>
                </header>

                {/* Hidden Audio Player for TTS */}
                <audio
                    id="tts-audio-player"
                    className="hidden"
                    onEnded={() => setPlayingAudio(null)}
                    onError={() => {
                        alert("Fehler beim Abspielen (Audio-Element)");
                        setPlayingAudio(null);
                    }}
                />

                {/* Processing Status Section */}
                {/* Processing Status Section - Replaced by Global Widget */}
                {/* 
                processingUploads.length > 0 && (
                    <div className="mb-8 grid grid-cols-1 gap-4">
                        {processingUploads.map((upload) => (
                            <GlassCard key={upload.upload_id} className="border-cyan-500/30">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-lg">{upload.filename}</h3>
                                    <span className="text-xs text-cyan-300 animate-pulse">{upload.stage || 'Processing...'}</span>
                                </div>
                                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-cyan-400 h-full transition-all duration-500"
                                        style={{ width: `${upload.progress || 0}%` }}
                                    ></div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )
            */
                    null
                }

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <GlassCard className="lg:col-span-2">
                        <h2 className="text-2xl font-bold mb-4">Themen-Verteilung</h2>
                        {stats?.topics ? (
                            <div className="h-64 w-full flex items-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={stats.topics}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={150}
                                            tick={{ fill: '#fff', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                                        />
                                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                            {stats.topics.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={selectedTopic === entry.name ? '#fff' : COLORS[index % COLORS.length]}
                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => {
                                                        if (selectedTopic === entry.name) {
                                                            setSelectedTopic(null);
                                                        } else {
                                                            setSelectedTopic(entry.name);
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="ml-8">
                                    <p className="text-white/70 mb-2">Gesamt: <span className="font-bold text-white">{stats.total_clips}</span> Clips</p>
                                    <p className="text-white/70 mb-2">Gesamt: <span className="font-bold text-white">{stats.total_clips}</span> Clips</p>
                                    <p className="text-white/50 text-sm">
                                        {selectedTopic ? (
                                            <>Filter: <span className="text-cyan-300 font-bold">{selectedTopic}</span> <button onClick={() => setSelectedTopic(null)} className="text-xs underline ml-1">(Reset)</button></>
                                        ) : (
                                            <>Top Thema: {stats.topics[0]?.name}</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-white/50">Lade Statistiken...</p>
                        )}
                    </GlassCard>

                    {/* Style Progress Card */}
                    <GlassCard>
                        <h2 className="text-2xl font-bold mb-4">Mark's Style-Gedächtnis</h2>
                        <div className="flex flex-col items-center justify-center h-full pb-8">
                            <div className="relative w-32 h-32 mb-4">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                    <path
                                        d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#444"
                                        strokeWidth="3"
                                    />
                                    <path
                                        d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#00C49F"
                                        strokeWidth="3"
                                        strokeDasharray={`${Math.min((stats?.style_samples || 0) * 5, 100)}, 100`}
                                        className="animate-[dash_1s_ease-out]"
                                    />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                    <span className="text-2xl font-bold text-white">{stats?.style_samples || 0}</span>
                                    <span className="block text-[10px] text-white/50">SAMPLES</span>
                                </div>
                            </div>
                            <p className="text-center text-sm text-white/70">
                                {(stats?.style_samples || 0) < 5 ? "Lerne noch..." :
                                    (stats?.style_samples || 0) < 20 ? "Gute Basis" : "Mark-Profi!"}
                            </p>
                            <p className="text-xs text-white/30 mt-2 text-center">Je mehr Clips, desto besser die Vorschläge.</p>
                        </div>
                    </GlassCard>

                    {/* Suggestion & Recording Card */}
                    <GlassCard>
                        <h2 className="text-2xl font-bold mb-4">KI-Mark's Vorschläge</h2>

                        {/* Custom Prompt Input */}
                        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                            <label className="block text-sm text-cyan-300 mb-2 font-bold">Eigenes Thema oder Frage:</label>
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <input
                                        type="text"
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="z.B. 'Sag was zu Work-Life-Balance' oder diktieren..."
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 pr-16"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCustomPromptSubmit()}
                                    />

                                    {/* Live Transcript Overlay */}
                                    {isDictating && liveTranscript && (
                                        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-black/80 backdrop-blur-md border border-cyan-500/50 rounded-lg z-50 shadow-xl animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                <span className="text-xs text-cyan-300 uppercase tracking-wider font-bold">Live Transkription</span>
                                            </div>
                                            <p className="text-white text-lg font-medium leading-relaxed">
                                                {liveTranscript}
                                                <span className="inline-block w-1.5 h-5 ml-1 bg-cyan-400 animate-pulse align-middle"></span>
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={isDictating ? stopDictation : startDictation}
                                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 z-10 ${isDictating
                                            ? 'bg-yellow-400 shadow-[0_0_20px_rgba(255,215,0,0.6)] scale-110'
                                            : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white hover:scale-105'
                                            }`}
                                        style={isDictating ? {
                                            animation: 'pulse-glow 2s infinite',
                                            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                            color: 'black'
                                        } : {}}
                                        title={isDictating ? "Stopp Aufnahme" : "Diktieren"}
                                    >
                                        {isDictating ? (
                                            <div className="flex gap-1 items-center justify-center h-5">
                                                <div className="w-1.5 h-full bg-black rounded-full animate-[wave_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-1.5 h-full bg-black rounded-full animate-[wave_1s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }}></div>
                                                <div className="w-1.5 h-full bg-black rounded-full animate-[wave_1s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }}></div>
                                            </div>
                                        ) : (
                                            <FaMicrophone className="text-xl" />
                                        )}
                                    </button>
                                </div>
                                <NanoBananaButton
                                    onClick={handleCustomPromptSubmit}
                                    disabled={isGeneratingCustom || !customPrompt.trim()}
                                    loading={isGeneratingCustom}
                                    variant="secondary"
                                >
                                    <FaPaperPlane />
                                </NanoBananaButton>
                            </div>
                        </div>

                        {/* Custom Tip Result */}
                        {customTip && (
                            <div className="mb-8 animate-fadeIn">
                                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                    <span className="text-purple-400">✨ Dein Ergebnis:</span>
                                    <span className="text-sm font-normal text-white/50">({customTip.word_count} Wörter)</span>
                                </h3>
                                <div className="bg-white/5 rounded-lg border border-purple-500/30 p-4">
                                    <div className="p-3 bg-black/20 rounded-lg mb-4">
                                        <p className="text-sm text-white/90 italic whitespace-pre-wrap leading-relaxed">"{customTip.text}"</p>
                                    </div>

                                    <div className="flex justify-center gap-3 flex-wrap">
                                        {/* Play Button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); playTTS(customTip.id, customTip.text); }}
                                            className={`px-6 py-2 rounded-full transition-all flex items-center gap-2 ${playingAudio === customTip.id
                                                ? 'bg-cyan-500 text-white animate-pulse'
                                                : 'bg-white/10 hover:bg-white/20 text-cyan-300'
                                                }`}
                                        >
                                            {playingAudio === customTip.id ? (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg> Stopp
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg> Vorlesen
                                                </>
                                            )}
                                        </button>

                                        {/* Save Button */}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const btn = e.currentTarget;
                                                const originalText = btn.innerHTML;
                                                try {
                                                    btn.disabled = true;
                                                    btn.innerHTML = '<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Speichere...';

                                                    const API_URL = '/api';
                                                    const response = await fetch(`${API_URL}/save-tts-clip`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ text: customTip.text, topic: customTip.topic })
                                                    });

                                                    if (!response.ok) throw new Error('Save failed');

                                                    btn.innerHTML = '<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> Gespeichert!';
                                                    setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
                                                } catch (error) {
                                                    console.error('Save error:', error);
                                                    btn.innerHTML = '<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg> Fehler!';
                                                    setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
                                                }
                                            }}
                                            className="px-6 py-2 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-300 transition-all flex items-center gap-2 border border-green-500/30 disabled:opacity-50"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Übernehmen
                                        </button>

                                        {/* Download Button */}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const btn = e.currentTarget;
                                                const originalText = btn.innerHTML;
                                                try {
                                                    btn.disabled = true;
                                                    btn.innerHTML = '<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Lade...';

                                                    const API_URL = '/api';
                                                    const response = await fetch(`${API_URL}/tts?text=${encodeURIComponent(customTip.text)}`);
                                                    if (!response.ok) throw new Error('TTS failed');

                                                    const blob = await response.blob();
                                                    const url = window.URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `ki-mark-${customTip.topic.toLowerCase().replace(/\s+/g, '-')}.mp3`;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    window.URL.revokeObjectURL(url);
                                                    document.body.removeChild(a);

                                                    btn.innerHTML = '<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> Geladen!';
                                                    setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
                                                } catch (error) {
                                                    console.error('Download error:', error);
                                                    btn.innerHTML = '<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg> Fehler!';
                                                    setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
                                                }
                                            }}
                                            className="px-6 py-2 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-all flex items-center gap-2 border border-purple-500/30 disabled:opacity-50"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg> Download
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {!suggestion && !isGenerating ? (
                            <div className="text-center py-8">
                                <p className="text-white/50 mb-4">Brauchst du Inspiration?</p>
                                <NanoBananaButton
                                    onClick={fetchSuggestion}
                                    variant="primary"
                                    className="mx-auto"
                                >
                                    <FaMagic /> 4 Vorschläge generieren
                                </NanoBananaButton>
                            </div>
                        ) : isGenerating ? (
                            <div className="text-center py-8">
                                <p className="text-cyan-300 mb-4 animate-pulse">Generiere kreative Ideen...</p>
                                <div className="w-full max-w-xs mx-auto bg-white/10 h-2 rounded-full overflow-hidden">
                                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full w-full animate-[progress_2s_ease-in-out_infinite] origin-left"></div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fadeIn relative">
                                <button
                                    onClick={() => setSuggestion(null)}
                                    className="absolute -top-2 -right-2 p-2 text-white/30 hover:text-white transition-colors z-10"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                {/* Grid Layout for Suggestions */}
                                <div className="grid grid-cols-1 gap-6">
                                    {Array.isArray(suggestion) ? suggestion.map((s, i) => {
                                        const isExpanded = expandedSuggestions[s.id] || false;
                                        const toggleExpand = () => {
                                            setExpandedSuggestions(prev => ({
                                                ...prev,
                                                [s.id]: !prev[s.id]
                                            }));
                                        };

                                        return (
                                            <div key={s.id || i} className="bg-white/5 rounded-lg border border-white/10 hover:border-cyan-500/30 transition-all">
                                                {/* Card Header - Always Visible */}
                                                <div
                                                    className="p-4 cursor-pointer flex justify-between items-center"
                                                    onClick={toggleExpand}
                                                >
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <h3 className="font-bold text-cyan-300 text-lg">{s.topic || 'Vorschlag'}</h3>
                                                        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                            {s.word_count} Wörter
                                                        </span>
                                                    </div>

                                                    {/* Expand/Collapse Icon */}
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className={`h-5 w-5 text-white/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 border-t border-white/10">
                                                        <div className="mt-3 p-3 bg-black/20 rounded-lg">
                                                            {editingSuggestion?.id === s.id ? (
                                                                <textarea
                                                                    value={editingSuggestion.text}
                                                                    onChange={(e) => setEditingSuggestion({ id: s.id, text: e.target.value })}
                                                                    className="w-full bg-white/10 border border-cyan-400/50 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400 min-h-[150px]"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <p className="text-sm text-white/80 italic whitespace-pre-wrap leading-relaxed">"{editingSuggestion?.id === s.id ? editingSuggestion.text : s.text}"</p>
                                                            )}
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="mt-3 flex justify-center gap-3 flex-wrap">{editingSuggestion?.id === s.id && (
                                                            <button
                                                                onClick={() => {
                                                                    // Update the suggestion in the array
                                                                    setSuggestion(prev => prev.map(item =>
                                                                        item.id === s.id ? { ...item, text: editingSuggestion.text } : item
                                                                    ));
                                                                    setEditingSuggestion(null);
                                                                }}
                                                                className="px-6 py-2 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-300 transition-all flex items-center gap-2 border border-green-500/30"
                                                            >
                                                                <FaCheck />
                                                                Speichern
                                                            </button>
                                                        )}
                                                            {!editingSuggestion && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setEditingSuggestion({ id: s.id, text: s.text }); }}
                                                                    className="px-6 py-2 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-all flex items-center gap-2 border border-purple-500/30"
                                                                >
                                                                    <FaEdit />
                                                                    Bearbeiten
                                                                </button>
                                                            )}
                                                            {/* Play Button */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); playTTS(s.id, s.text); }}
                                                                className={`px-6 py-2 rounded-full transition-all flex items-center gap-2 ${playingAudio === s.id
                                                                    ? 'bg-cyan-500 text-white animate-pulse'
                                                                    : 'bg-white/10 hover:bg-white/20 text-cyan-300'
                                                                    }`}
                                                                title="Mit Mark's Stimme vorlesen"
                                                            >
                                                                {playingAudio === s.id ? (
                                                                    <>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                        </svg>
                                                                        Stopp
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                                        </svg>
                                                                        Vorlesen
                                                                    </>
                                                                )}
                                                            </button>

                                                            {/* Save Button */}
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const btn = e.currentTarget;
                                                                    const originalText = btn.innerHTML;
                                                                    try {
                                                                        btn.disabled = true;
                                                                        btn.innerHTML = '<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Speichere...';

                                                                        const API_URL = '/api';
                                                                        const response = await fetch(`${API_URL}/save-tts-clip`, {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ text: s.text, topic: s.topic })
                                                                        });

                                                                        if (!response.ok) throw new Error('Save failed');

                                                                        const data = await response.json();
                                                                        btn.innerHTML = '<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> Gespeichert!';
                                                                        setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
                                                                    } catch (error) {
                                                                        console.error('Save error:', error);
                                                                        btn.innerHTML = '<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg> Fehler!';
                                                                        setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
                                                                    }
                                                                }}
                                                                className="px-6 py-2 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-300 transition-all flex items-center gap-2 border border-green-500/30 disabled:opacity-50"
                                                                title="Als KI-Mark Clip übernehmen"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                                Übernehmen
                                                            </button>

                                                            {/* Download Button */}
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const btn = e.currentTarget;
                                                                    const originalText = btn.innerHTML;
                                                                    try {
                                                                        btn.disabled = true;
                                                                        btn.innerHTML = '<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Lade...';

                                                                        const API_URL = '/api';
                                                                        const response = await fetch(`${API_URL}/tts?text=${encodeURIComponent(s.text)}`);
                                                                        if (!response.ok) throw new Error('TTS failed');

                                                                        const blob = await response.blob();
                                                                        const url = window.URL.createObjectURL(blob);
                                                                        const a = document.createElement('a');
                                                                        a.href = url;
                                                                        a.download = `ki-mark-${s.topic.toLowerCase().replace(/\s+/g, '-')}.mp3`;
                                                                        document.body.appendChild(a);
                                                                        a.click();
                                                                        window.URL.revokeObjectURL(url);
                                                                        document.body.removeChild(a);

                                                                        btn.innerHTML = '<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> Geladen!';
                                                                        setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
                                                                    } catch (error) {
                                                                        console.error('Download error:', error);
                                                                        btn.innerHTML = '<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg> Fehler!';
                                                                        setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
                                                                    }
                                                                }}
                                                                className="px-6 py-2 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-all flex items-center gap-2 border border-purple-500/30 disabled:opacity-50"
                                                                title="Als MP3 herunterladen"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                </svg>
                                                                Download
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }) : (
                                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                            <h3 className="font-bold text-cyan-300">{suggestion.suggested_topic}</h3>
                                            <p className="text-xs text-white/50 mt-1">{suggestion.reason}</p>
                                            <div className="mt-2 p-3 bg-black/20 rounded-lg">
                                                <p className="text-sm font-mono text-white/80 italic">"{suggestion.script}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-center pt-4 border-t border-white/10">
                                    {!isRecording ? (
                                        <button
                                            onClick={startRecording}
                                            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                                        >
                                            <FaMicrophone className="text-2xl text-white" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopRecording}
                                            className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:bg-gray-200 transition-colors animate-pulse"
                                        >
                                            <FaStop className="text-2xl text-red-500" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-center text-xs text-white/30">
                                    {isRecording ? "Aufnahme läuft..." : "Klicken zum Aufnehmen & Downloaden"}
                                </p>
                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* Clips Grid */}
                <div className="mt-12">
                    <h2 className="text-2xl font-bold mb-6">Clips ({clips.length})</h2>
                    {clips.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {clips.map((clip, index) => {
                                const categoryColor = getCategoryColor(clip.topic);
                                const isAI = clip.source === 'KI-Mark';

                                return (
                                    <div
                                        key={index}
                                        onClick={() => setSelectedClip(clip)}
                                        className={`cursor-pointer transition-all duration-500 hover:scale-105 ${selectedTopic && clip.topic !== selectedTopic ? 'opacity-30 grayscale' : 'opacity-100'}`}
                                    >
                                        {isAI ? (
                                            <div className="ai-border">
                                                <div className="ai-border-content p-6 card-3d">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex flex-col flex-grow mr-2">
                                                            {editingClipId === clip.file_name ? (
                                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                                    <input
                                                                        type="text"
                                                                        value={editTopicValue}
                                                                        onChange={(e) => setEditTopicValue(e.target.value)}
                                                                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:border-cyan-400"
                                                                        autoFocus
                                                                    />
                                                                    <button onClick={(e) => saveTopic(e, clip.file_name)} className="text-green-400 hover:text-green-300 p-1">
                                                                        <FaCheck />
                                                                    </button>
                                                                    <button onClick={cancelEditing} className="text-red-400 hover:text-red-300 p-1">
                                                                        <FaTimes />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 group">
                                                                    <h3 className="font-bold text-lg text-white leading-tight">
                                                                        {clip.source === 'KI-Mark' && <span className="text-cyan-400 mr-1">*</span>}
                                                                        {clip.topic || 'Unbekannt'}
                                                                    </h3>
                                                                    <button
                                                                        onClick={(e) => startEditing(e, clip)}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white p-1"
                                                                        title="Thema bearbeiten"
                                                                    >
                                                                        <FaEdit />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => deleteClip(e, clip)}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400/50 hover:text-red-400 p-1"
                                                                        title="Clip löschen"
                                                                    >
                                                                        <FaTrash />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {clip.category && (
                                                                <span className="text-[10px] text-cyan-300 uppercase tracking-wider mt-1">{clip.category}</span>
                                                            )}
                                                        </div>
                                                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${clip.importance === 'wichtig' ? 'bg-red-500/20 text-red-300' :
                                                            clip.importance === 'mittel' ? 'bg-yellow-500/20 text-yellow-300' :
                                                                'bg-white/10 text-white/50'
                                                            }`}>
                                                            {clip.importance || 'unwichtig'}
                                                        </span>
                                                    </div>

                                                    <p className="text-sm text-white/70 mb-4 line-clamp-3">{clip.one_sentence_summary || 'Keine Zusammenfassung'}</p>

                                                    {clip.mark_nörgel && (
                                                        <div className="mt-auto p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                                            <p className="text-xs text-cyan-300 italic">Mark: "{clip.mark_nörgel}"</p>
                                                        </div>
                                                    )}
                                                </GlassCard>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                            <p className="text-white/50 text-center">Warte auf Clips...</p>
                    )}
                        </div>

                {/* Detail Modal */}
                    {
                        selectedClip && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedClip(null)}>
                                <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white mb-2">
                                                {selectedClip.source === 'KI-Mark' && <span className="text-cyan-400 mr-1">*</span>}
                                                {selectedClip.topic || 'Unbekannt'}
                                            </h2>
                                            <div className="flex gap-2 items-center">
                                                {selectedClip.category && (
                                                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                        {selectedClip.category}
                                                    </span>
                                                )}
                                                <span className={`text-xs px-2 py-1 rounded-full ${selectedClip.importance === 'wichtig' ? 'bg-red-500/20 text-red-300' :
                                                    selectedClip.importance === 'mittel' ? 'bg-yellow-500/20 text-yellow-300' :
                                                        'bg-white/10 text-white/50'
                                                    }`}>
                                                    {selectedClip.importance || 'unwichtig'}
                                                </span>
                                                <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/50">
                                                    {Math.round(selectedClip.duration || 0)}s
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedClip(null)} className="text-white/50 hover:text-white">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="mb-6">
                                        <audio controls className="w-full h-10" autoPlay>
                                            <source src={`/api/clips/${selectedClip.file_name}`} type="audio/mpeg" />
                                            Your browser does not support the audio element.
                                        </audio>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                            <h4 className="text-sm font-bold text-white/50 mb-2 uppercase tracking-wider">Zusammenfassung</h4>
                                            <p className="text-white/90">{selectedClip.one_sentence_summary}</p>
                                        </div>

                                        {selectedClip.mark_nörgel && (
                                            <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                                                <h4 className="text-sm font-bold text-cyan-400/50 mb-2 uppercase tracking-wider">KI-Mark sagt</h4>
                                                <p className="text-cyan-300 italic text-lg">"{selectedClip.mark_nörgel}"</p>
                                            </div>
                                        )}

                                        <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                                            <h4 className="text-sm font-bold text-white/50 mb-2 uppercase tracking-wider">Transkript</h4>
                                            <p className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap">{selectedClip.text}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div>

                {/* Toast Notifications */}
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </>
            );
}
