from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.analysis import call_grok
import json

router = APIRouter()

class CustomPromptRequest(BaseModel):
    prompt: str
    style_profile: dict = {}

@router.post("/generate-custom-tip")
async def generate_custom_tip(request: CustomPromptRequest):
    """Generate a custom 130-word tip based on user prompt in Mark's style"""
    try:
        # Get aggregated style profile from all clips
        from core.style_aggregator import aggregate_style_profile
        aggregated_profile = await aggregate_style_profile()
        
        # Build prompt for Grok
        style_info = f"{aggregated_profile.get('filler_words', '')} – {aggregated_profile.get('pace', '')} – {aggregated_profile.get('tone', '')}"
        
        grok_prompt = f"""
        Du bist KI-Mark. Sprich EXAKT wie Mark (Füllwörter, Tempo, leichter Meckerton).
        Style-Info: {style_info}
        
        Erstelle einen 60-Sekunden-Tipp (ca. 130 Wörter) zum Thema: "{request.prompt}"
        
        Anforderungen:
        - Exakt 130-140 Wörter
        - MUSS mit "Meine Minute..." beginnen (wie die originalen Clips)
        - Mark's Stil: direkt, motivierend, leichtes Meckern, Füllwörter
        - Praktische, umsetzbare Tipps
        - Mit klarem Abschluss enden
        
        Antworte NUR mit dem fertigen Text (kein JSON, keine Anführungszeichen):
        """
        
        # Call Grok
        import logging
        logger = logging.getLogger("uvicorn")
        logger.info(f"Generating custom tip for prompt: {request.prompt}")
        
        response = call_grok([{"role": "user", "content": grok_prompt}])
        
        if not response:
            raise HTTPException(status_code=500, detail="Keine Antwort von Grok")
        
        # Clean up response
        text = response.strip()
        if text.startswith('"') and text.endswith('"'):
            text = text[1:-1]
        
        word_count = len(text.split())
        
        logger.info(f"Generated custom tip: {word_count} words")
        
        return {
            "success": True,
            "text": text,
            "word_count": word_count,
            "topic": request.prompt[:50]  # Use first 50 chars of prompt as topic
        }
        
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn")
        logger.error(f"Error generating custom tip: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import UploadFile, File
from core.transcriber import transcribe_clip
import shutil
import os
import uuid

@router.post("/transcribe-prompt")
async def transcribe_prompt(file: UploadFile = File(...)):
    """Transcribe audio for custom prompt dictation"""
    try:
        # Save temp file
        temp_filename = f"prompt_{uuid.uuid4()}.webm"
        temp_path = os.path.join("uploads", temp_filename)
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Transcribe
        transcript = transcribe_clip(temp_path)
        
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {"text": transcript}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
