import os
import requests
from dotenv import load_dotenv

load_dotenv()

ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY")
ELEVEN_VOICE_ID = os.getenv("ELEVEN_VOICE_ID")

def generate_audio_stream(text: str):
    """
    Generates audio from text using ElevenLabs API and yields chunks.
    """
    if not ELEVEN_API_KEY or not ELEVEN_VOICE_ID:
        raise ValueError("ElevenLabs API Key or Voice ID not set")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE_ID}/stream"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_API_KEY
    }
    
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.75,
            "similarity_boost": 0.9
        }
    }
    
    response = requests.post(url, json=data, headers=headers, stream=True)
    
    if response.status_code != 200:
        print(f"ElevenLabs Error: {response.text}")
        raise Exception(f"ElevenLabs API Error: {response.text}")
        
    for chunk in response.iter_content(chunk_size=1024):
        if chunk:
            yield chunk
