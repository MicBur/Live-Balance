from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from core.database import get_database
from core.analysis import generate_suggestions
from core.tts import generate_audio_stream
from models import Suggestion
import uuid

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_data():
    db = await get_database()
    
    # Get merged themes
    themes_cursor = db.merged_themes.find()
    themes = await themes_cursor.to_list(length=100)
    
    # Calculate percentages
    total_count = sum(t.get("count", 0) for t in themes)
    dashboard_themes = []
    for t in themes:
        count = t.get("count", 0)
        percent = round((count / total_count * 100), 1) if total_count > 0 else 0
        dashboard_themes.append({
            "name": t["name"],
            "percent": percent,
            "count": count
        })
        
    # Sort by percent desc
    dashboard_themes.sort(key=lambda x: x["percent"], reverse=True)
    
    return {"themes": dashboard_themes}

@router.get("/stats")
async def get_stats():
    db = await get_database()
    
    # Get merged themes
    themes_cursor = db.merged_themes.find()
    themes = await themes_cursor.to_list(length=100)
    
    # Calculate percentages
    total_count = sum(t.get("count", 0) for t in themes)
    dashboard_themes = []
    for t in themes:
        count = t.get("count", 0)
        percent = round((count / total_count * 100), 1) if total_count > 0 else 0
        dashboard_themes.append({
            "name": t["name"],
            "percent": percent,
            "count": count
        })
        
    # Sort by percent desc
    dashboard_themes.sort(key=lambda x: x["percent"], reverse=True)
    
    # Count style samples
    style_count = await db.style_cache.count_documents({})
    
    return {
        "topics": dashboard_themes,
        "total_clips": total_count,
        "style_samples": style_count
    }

import logging

logger = logging.getLogger("uvicorn")

@router.get("/suggestions/new-minute")
async def get_suggestions():
    try:
        logger.info("START: /suggestions/new-minute request received")
        db = await get_database()
        
        # Get weak topics (lowest percentage)
        themes_cursor = db.merged_themes.find()
        themes = await themes_cursor.to_list(length=100)
        
        total_count = sum(t.get("count", 0) for t in themes)
        processed_themes = []
        for t in themes:
            count = t.get("count", 0)
            percent = round((count / total_count * 100), 1) if total_count > 0 else 0
            processed_themes.append({"name": t["name"], "percent": percent})
            
        processed_themes.sort(key=lambda x: x["percent"])
        weak_topics = processed_themes[:4]
        
        # Get aggregated style profile from all clips
        from core.style_aggregator import aggregate_style_profile
        style_profile = await aggregate_style_profile()
                
        suggestions_json = generate_suggestions(style_profile, weak_topics)
        logger.info(f"DEBUG: Raw suggestions_json type: {type(suggestions_json)}")
        logger.info(f"DEBUG: Raw suggestions_json content: {suggestions_json}")
        
        suggestions = []
        import uuid
        
        if isinstance(suggestions_json, dict):
            for key, text_val in suggestions_json.items():
                try:
                    # Handle if text is a list
                    if isinstance(text_val, list):
                        text = " ".join(str(x) for x in text_val)
                    else:
                        text = str(text_val)
                        
                    # Clean text
                    text = text.strip()
                    
                    # Calculate word count
                    word_count = len(text.split())
                    
                    # Infer topic
                    topic_name = "Vorschlag"
                    try:
                        idx = int(key.split('_')[-1]) - 1
                        if 0 <= idx < len(weak_topics):
                            topic_name = weak_topics[idx]["name"]
                    except:
                        pass

                    suggestions.append({
                        "id": str(uuid.uuid4()),
                        "topic": topic_name,
                        "text": text,
                        "word_count": word_count
                    })
                except Exception as inner_e:
                    logger.error(f"Error processing item {key}: {inner_e}")
                    continue
        
        # Fallback if no suggestions
        if not suggestions:
            logger.warning("No suggestions generated, returning fallback.")
            suggestions.append({
                "id": str(uuid.uuid4()),
                "topic": "System",
                "text": "Keine Vorschläge generiert. Bitte versuche es später noch einmal.",
                "word_count": 0
            })

        # Verify serialization
        import json
        try:
            json.dumps(suggestions)
        except Exception as e:
            logger.error(f"Serialization Error: {e}")
            raise e

        logger.info(f"SUCCESS: Returning {len(suggestions)} suggestions")
        return suggestions
    except Exception as e:
        logger.error(f"CRITICAL ERROR in get_suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tts")
async def stream_tts(text: str):
    try:
        return StreamingResponse(generate_audio_stream(text), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class TopicUpdate(BaseModel):
    topic: str

@router.put("/clips/{filename}/topic")
async def update_clip_topic(filename: str, update: TopicUpdate):
    try:
        db = await get_database()
        result = await db.clips.update_one(
            {"file_name": filename},
            {"$set": {"topic": update.topic}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Clip not found")
        return {"success": True}
    except Exception as e:
        logger.error(f"Error updating topic: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
