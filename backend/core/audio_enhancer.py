import subprocess
import os

def enhance_audio(input_path: str, output_path: str = None):
    """
    Applies 'podcast-style' enhancement to audio using ffmpeg:
    1. Highpass filter (remove rumble)
    2. Compression (even out dynamic range)
    3. EQ (presence boost)
    4. Normalization (standard loudness)
    """
    if not output_path:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_enhanced{ext}"

    # Filter chain explanation:
    # highpass=f=80: Remove low frequency rumble
    # compand: Soft knee compression to even out voice levels
    # equalizer: Slight boost at 3kHz for clarity (presence)
    # loudnorm: EBU R128 loudness normalization
    
    filter_chain = (
        "highpass=f=80,"
        "compand=attacks=0:points=-80/-900|-45/-15|-27/-9|0/-7|20/-7:gain=5,"
        "equalizer=f=3000:t=q:w=1:g=2,"
        "loudnorm=I=-16:TP=-1.5:LRA=11"
    )

    cmd = [
        'ffmpeg', '-i', input_path,
        '-af', filter_chain,
        '-c:a', 'libmp3lame', '-q:a', '2',  # High quality MP3
        '-y',  # Overwrite
        output_path
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True)
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"Error enhancing audio: {e.stderr.decode()}")
        return input_path  # Return original if enhancement fails
