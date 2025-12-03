from typing import Dict, List
from collections import Counter
from core.database import get_database
import logging

logger = logging.getLogger("uvicorn")

async def aggregate_style_profile() -> Dict:
    """
    Aggregates style information from all clips in the database.
    Returns a comprehensive style profile based on all uploaded clips.
    """
    db = await get_database()
    
    # Fetch all clips with style information
    clips_cursor = db.clips.find({"style": {"$exists": True}})
    clips = await clips_cursor.to_list(length=10000)
    
    if not clips:
        logger.info("No clips found for style aggregation")
        return {
            "filler_words": "",
            "pace": "medium",
            "tone": "neutral",
            "sample_count": 0
        }
    
    # Collect all style data
    all_filler_words = []
    all_paces = []
    all_tones = []
    
    for clip in clips:
        style = clip.get("style", {})
        
        # Collect filler words
        filler_str = style.get("filler_words", "")
        if filler_str:
            # Handle both string and list
            if isinstance(filler_str, list):
                all_filler_words.extend(filler_str)
            else:
                # Split by comma and clean
                fillers = [f.strip() for f in filler_str.split(",") if f.strip()]
                all_filler_words.extend(fillers)
        
        # Collect pace
        pace = style.get("pace", "")
        if pace:
            all_paces.append(pace.lower())
        
        # Collect tone
        tone = style.get("tone", "")
        if tone:
            all_tones.append(tone.lower())
    
    # Aggregate filler words - top 10 most common
    filler_counter = Counter(all_filler_words)
    top_fillers = [word for word, count in filler_counter.most_common(10)]
    aggregated_fillers = ", ".join(top_fillers) if top_fillers else "äh, also"
    
    # Aggregate pace - most common
    pace_counter = Counter(all_paces)
    aggregated_pace = pace_counter.most_common(1)[0][0] if pace_counter else "medium"
    
    # Aggregate tone - most common
    tone_counter = Counter(all_tones)
    aggregated_tone = tone_counter.most_common(1)[0][0] if tone_counter else "neutral"
    
    profile = {
        "filler_words": aggregated_fillers,
        "pace": aggregated_pace,
        "tone": aggregated_tone,
        "sample_count": len(clips)
    }
    
    logger.info(f"Aggregated style profile from {len(clips)} clips: {profile}")
    return profile
