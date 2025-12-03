import ffmpeg
import os

def split_audio(file_path: str, transcription_result: dict, start_index: int = 0):
    segments = transcription_result.get("segments", [])
    processed_segments = []
    
    base_name = os.path.splitext(os.path.basename(file_path))[0]
    output_dir = os.path.dirname(file_path).replace("raw", "clips")
    os.makedirs(output_dir, exist_ok=True)
    
    # Merge segments to reach target duration (approx 45-90s)
    merged_segments = []
    current_group = []
    current_duration = 0
    
    for seg in segments:
        seg_duration = seg["end"] - seg["start"]
        
        # If adding this segment exceeds 90s, finalize current group
        if current_duration + seg_duration > 90 and current_duration > 30:
            merged_segments.append(current_group)
            current_group = [seg]
            current_duration = seg_duration
        else:
            current_group.append(seg)
            current_duration += seg_duration
            
            # If we are in the sweet spot (45-90s) and there is a pause (implied by end of segment), 
            # we could finalize. For now, we just fill up to ~60s
            if 55 <= current_duration <= 75:
                 merged_segments.append(current_group)
                 current_group = []
                 current_duration = 0
    
    if current_group:
        merged_segments.append(current_group)

    # Process merged segments
    for i, group in enumerate(merged_segments):
        if not group:
            continue
            
        start = group[0]["start"]
        end = group[-1]["end"]
        text = " ".join([s["text"].strip() for s in group])
        duration = end - start
        
        # Final filter
        if duration < 10: 
            continue
            
        clip_name = f"{base_name}_{start_index + i}.mp3"
        clip_path = os.path.join(output_dir, clip_name)
        
        try:
            (
                ffmpeg
                .input(file_path, ss=start, t=duration)
                .output(clip_path, c="copy", loglevel="error")
                .run(overwrite_output=True)
            )
            
            processed_segments.append({
                "file_name": clip_name,
                "start": start,
                "end": end,
                "duration": duration,
                "text": text
            })
            print(f"Created clip {clip_name} ({duration:.1f}s)")
        except ffmpeg.Error as e:
            print(f"Error splitting audio: {e.stderr.decode() if e.stderr else str(e)}")
            
    return processed_segments
