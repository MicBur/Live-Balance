import React, { useState, useRef } from 'react';
import { FaPlay, FaPause, FaSpinner } from 'react-icons/fa';

interface SuggestionCardProps {
    suggestion: {
        id: string;
        text: string;
        word_count: number;
        topic: string;
    };
    onPlay: (text: string) => Promise<void>;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onPlay }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlay = async () => {
        if (isPlaying) {
            if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
            return;
        }

        setIsLoading(true);
        try {
            // We need to fetch the audio stream
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tts?text=${encodeURIComponent(suggestion.text)}`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error("TTS failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.play();
                setIsPlaying(true);
                audioRef.current.onended = () => setIsPlaying(false);
            } else {
                const audio = new Audio(url);
                audioRef.current = audio;
                audio.play();
                setIsPlaying(true);
                audio.onended = () => setIsPlaying(false);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to play audio");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass p-6 flex flex-col justify-between h-full relative">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-mono text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded-full">
                        {suggestion.word_count} Wörter
                    </span>
                    <span className="text-xs text-gray-400">60 Sek.</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed italic">
                    "{suggestion.text}"
                </p>
            </div>

            <button
                onClick={handlePlay}
                disabled={isLoading}
                className="mt-6 w-full py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center gap-2 transition-all group"
            >
                {isLoading ? <FaSpinner className="animate-spin" /> : isPlaying ? <FaPause /> : <FaPlay />}
                <span className="font-bold text-cyan-400 group-hover:text-cyan-300">
                    {isPlaying ? "Pause" : "KI-Mark vorlesen"}
                </span>
            </button>
        </div>
    );
};

export default SuggestionCard;
