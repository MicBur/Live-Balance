from fastapi import APIRouter, HTTPException
from core.database import get_database
from core.analysis import merge_topics
import os
import logging

router = APIRouter()
logger = logging.getLogger("uvicorn")

@router.delete("/clips/{filename}")
async def delete_clip(filename: str):
    """Delete a clip by filename"""
    try:
        db = await get_database()
        
        # Find the clip in database
        clip = await db.clips.find_one({"file_name": filename})
        if not clip:
            raise HTTPException(status_code=404, detail="Clip not found")
        
        # Get topic for theme count update
        clip_topic = clip.get("topic", "")
        
        # Delete from database
        result = await db.clips.delete_one({"file_name": filename})
        
        # Delete audio file from disk
        file_path = clip.get("clip_path", "")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Deleted audio file: {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete audio file {file_path}: {e}")
        
        # Update theme counts
        if clip_topic:
            await db.merged_themes.update_one(
                {"name": clip_topic},
                {"$inc": {"count": -1}}
            )
            
            # Remove theme if count is 0 or negative
            await db.merged_themes.delete_many({"count": {"$lte": 0}})
        
        logger.info(f"Successfully deleted clip: {filename}")
        return {"success": True, "message": f"Clip {filename} deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting clip {filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
