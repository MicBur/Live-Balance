import whisper
import os

# Load model once (global)
# Warning: This consumes significant memory.
try:
    model = whisper.load_model("large-v3")
except Exception as e:
    print(f"Error loading Whisper model: {e}. Fallback to 'base' for dev.")
    model = whisper.load_model("base")

def transcribe_clip(file_path: str):
    """
    Transcribes a single audio clip using Whisper.
    Returns the text and language.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    result = model.transcribe(file_path, word_timestamps=True)
    return {
        "text": result["text"],
        "language": result["language"],
        "segments": result["segments"]
    }
