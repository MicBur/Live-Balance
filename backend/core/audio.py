import os
import ffmpeg
from pydub import AudioSegment, silence
from typing import List, Tuple

def cleanup_audio(input_path: str, output_path: str) -> str:
    """
    Cleans up audio using ffmpeg filters (highpass, lowpass, normalization).
    Simulates 'Adobe Podcast' style enhancement.
    """
    try:
        (
            ffmpeg
            .input(input_path)
            .filter('highpass', f='200')
            .filter('lowpass', f='3000')
            .filter('loudnorm', I=-16, TP=-1.5, LRA=11)
            .output(output_path, acodec='mp3', audio_bitrate='128k')
            .overwrite_output()
            .run(quiet=True)
        )
        return output_path
    except ffmpeg.Error as e:
        print(f"Error cleaning audio: {e}")
        return input_path

def split_audio(file_path: str, min_len=45000, max_len=90000, silence_thresh=-40, silence_len=1200) -> List[Tuple[str, float, float]]:
    """
    Splits audio into segments based on silence.
    Returns list of (segment_path, start_sec, end_sec).
    """
    audio = AudioSegment.from_file(file_path)
    
    # Detect non-silent chunks
    # This is a simplified approach; for better control we might iterate manually
    # But pydub's split_on_silence is good. However, we need to respect min/max len.
    # So we'll use nonsilent ranges.
    
    # Alternative: Use silence.detect_nonsilent to get ranges, then merge/split them.
    nonsilent_ranges = silence.detect_nonsilent(
        audio,
        min_silence_len=silence_len,
        silence_thresh=silence_thresh
    )
    
    segments = []
    current_start = 0
    
    # If no silence found, just chunk it
    if not nonsilent_ranges:
        duration_ms = len(audio)
        for i in range(0, duration_ms, max_len):
            end = min(i + max_len, duration_ms)
            seg_path = f"{file_path}_seg_{len(segments)}.mp3"
            audio[i:end].export(seg_path, format="mp3")
            segments.append((seg_path, i/1000.0, end/1000.0))
        return segments

    # Logic to group ranges into chunks between min_len and max_len
    # This is a heuristic implementation
    
    current_chunk_start = nonsilent_ranges[0][0]
    current_chunk_end = nonsilent_ranges[0][1]
    
    final_segments = []
    
    for start, end in nonsilent_ranges[1:]:
        # Check if adding this range exceeds max_len
        if (end - current_chunk_start) > max_len:
            # Current chunk is full, save it
            # But check if it's too short? If so, we might have to force it or just accept it.
            # Ideally we want > min_len.
            
            # Save current chunk
            seg_path = f"{file_path}_seg_{len(final_segments)}.mp3"
            audio[current_chunk_start:current_chunk_end].export(seg_path, format="mp3")
            final_segments.append((seg_path, current_chunk_start/1000.0, current_chunk_end/1000.0))
            
            # Start new chunk
            current_chunk_start = start
            current_chunk_end = end
        else:
            # Extend current chunk
            current_chunk_end = end
            
    # Save last chunk
    seg_path = f"{file_path}_seg_{len(final_segments)}.mp3"
    audio[current_chunk_start:current_chunk_end].export(seg_path, format="mp3")
    final_segments.append((seg_path, current_chunk_start/1000.0, current_chunk_end/1000.0))
    
    return final_segments
