from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.database import get_database
from core.tts import generate_audio_stream
from core.transcriber import transcribe_clip
from core.analysis import analyze_topic_style
import uuid
import os
from datetime import datetime

router = APIRouter()

CLIPS_DIR = "uploads/clips"
os.makedirs(CLIPS_DIR, exist_ok=True)

class TTSClipRequest(BaseModel):
    text: str
    topic: str

@router.post("/save-tts-clip")
async def save_tts_clip(request: TTSClipRequest):
    """Save a TTS-generated clip directly to database as KI-Mark"""
    try:
        db = await get_database()
        
        # Generate audio file
        clip_id = str(uuid.uuid4())
        filename = f"ki-mark-{request.topic.lower().replace(' ', '-')}-{clip_id[:8]}.mp3"
        file_path = os.path.join(CLIPS_DIR, filename)
        
        # Generate and save audio
        with open(file_path, 'wb') as f:
            for chunk in generate_audio_stream(request.text):
                f.write(chunk)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Generate summary for AI clip
        from core.analysis import call_grok
        summary_prompt = f"Fasse folgenden Text in EINEM Satz zusammen (max 15 Wörter): \"{request.text[:500]}\""
        summary_response = call_grok([{"role": "user", "content": summary_prompt}])
        one_sentence_summary = summary_response.strip() if summary_response else "KI-generierter Tipp"
        
        # Save to database
        clip_doc = {
            "clip_id": clip_id,
            "file_name": filename,
            "file_path": file_path,
            "file_size": file_size,
            "topic": request.topic,
            "text": request.text,
            "transcript": request.text,
            "one_sentence_summary": one_sentence_summary,
            "word_count": len(request.text.split()),
            "source": "KI-Mark",
            "created_at": datetime.utcnow(),
            "analyzed": True
        }
        
        await db.clips.insert_one(clip_doc)
        
        return {
            "success": True,
            "clip_id": clip_id,
            "filename": filename,
            "message": "KI-Mark Clip erfolgreich gespeichert!"
        }
        
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn")
        logger.error(f"Error saving TTS clip: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
