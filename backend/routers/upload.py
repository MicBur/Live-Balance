from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from core.database import get_database
from core.audio import split_audio, cleanup_audio
from core.transcriber import transcribe_clip
from core.analysis import analyze_topic_style, merge_topics
import shutil
import os
import uuid
from datetime import datetime

router = APIRouter()

UPLOAD_DIR = "uploads"
CLIPS_DIR = "uploads/clips"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CLIPS_DIR, exist_ok=True)

# In-memory status tracker (simple for MVP)
upload_progress = {}

async def process_upload(file_path: str, upload_id: str):
    db = await get_database()
    filename = os.path.basename(file_path).split('_', 1)[1] # remove uuid prefix
    
    upload_progress[upload_id] = {
        "upload_id": upload_id,
        "filename": filename,
        "stage": "Starting...",
        "progress": 0
    }
    
    try:
        # 1. No Split - User uploads individual clips
        print(f"Processing single clip: {file_path}")
        upload_progress[upload_id]["stage"] = "Reading Audio..."
        upload_progress[upload_id]["progress"] = 10
        
        from pydub import AudioSegment
        audio = AudioSegment.from_file(file_path)
        duration_sec = len(audio) / 1000.0
        segments = [(file_path, 0.0, duration_sec)]
        
        clips_data = []
        all_topics = []
        style_samples = []
        
        for i, (seg_path, start, end) in enumerate(segments):
            # 2. Cleanup
            upload_progress[upload_id]["stage"] = "Enhancing Audio (FFmpeg)..."
            upload_progress[upload_id]["progress"] = 30
            
            cleaned_filename = os.path.basename(seg_path).replace(".mp3", "_clean.mp3")
            cleaned_path = os.path.join(CLIPS_DIR, cleaned_filename)
            cleanup_audio(seg_path, cleaned_path)
            
            # 3. Transcribe
            upload_progress[upload_id]["stage"] = "Transcribing (Whisper)..."
            upload_progress[upload_id]["progress"] = 50
            print(f"Transcribing segment {i}: {cleaned_path}")
            
            transcription = transcribe_clip(cleaned_path)
            text = transcription["text"]
            
            # 4. Analyze
            upload_progress[upload_id]["stage"] = "Analyzing Style & Topic (Grok)..."
            upload_progress[upload_id]["progress"] = 80
            print(f"Analyzing segment {i}")
            
            analysis = analyze_topic_style(text)
            
            clip_doc = {
                "upload_id": upload_id,
                "segment_nr": i,
                "start_sec": start,
                "end_sec": end,
                "duration_sec": end - start,
                "text": text,
                "raw_topic": analysis.get("topic", "Unbekannt"),
                "category": analysis.get("category", "Allgemein"),
                "importance": analysis.get("importance", "mittel"),
                "one_sentence_summary": analysis.get("one_sentence_summary", ""),
                "mark_nörgel": analysis.get("mark_nörgel", ""),
                "style": analysis.get("style", {}),
                "clip_path": cleaned_path,
                "file_name": os.path.basename(cleaned_path),
                "created_at": datetime.utcnow()
            }
            
            await db.clips.insert_one(clip_doc)
            clips_data.append(clip_doc)
            all_topics.append(analysis.get("topic", "Unbekannt"))
            style_samples.append(analysis.get("style", {}))
            
            # Cleanup temp segment file if needed (but we are using original upload as segment now)
            # if os.path.exists(seg_path): os.remove(seg_path)

        # 5. Merge Topics & Stats
        upload_progress[upload_id]["stage"] = "Finalizing..."
        upload_progress[upload_id]["progress"] = 90
        
        print("Merging topics...")
        topic_mapping = merge_topics(all_topics)
        
        # Update clips with final topics
        for clip in clips_data:
            raw = clip["raw_topic"]
            final = topic_mapping.get(raw, raw)
            await db.clips.update_one(
                {"_id": clip["_id"]},
                 {"$set": {"final_topic": final, "topic": final}}
            )

        # Update theme counts
        final_topics = [topic_mapping.get(t, t) for t in all_topics]
        from collections import Counter
        theme_counts = Counter(final_topics)
        
        for theme, count in theme_counts.items():
            await db.merged_themes.update_one(
                {"name": theme},
                {"$inc": {"count": count}},
                upsert=True
            )
        
        # Save style profile
        await db.style_cache.insert_one({"upload_id": upload_id, "samples": style_samples})
        
        print(f"Processing complete for {upload_id}")
        
        # Done
        upload_progress[upload_id]["stage"] = "Done"
        upload_progress[upload_id]["progress"] = 100
        # Remove after a delay? For now keep it so UI sees it.
        
    except Exception as e:
        print(f"Error processing upload {upload_id}: {e}")
        upload_progress[upload_id]["stage"] = f"Error: {str(e)}"
        upload_progress[upload_id]["progress"] = 0

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    upload_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{upload_id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Trigger processing
    background_tasks.add_task(process_upload, file_path, upload_id)
    
    return {"message": "Upload received, processing started", "upload_id": upload_id}

@router.get("/segments/all")
async def get_all_segments():
    db = await get_database()
    clips_cursor = db.clips.find().sort("created_at", -1)
    clips = await clips_cursor.to_list(length=1000)
    
    # Convert ObjectId to str
    for clip in clips:
        clip["_id"] = str(clip["_id"])
        if "file_name" not in clip:
             clip["file_name"] = os.path.basename(clip["clip_path"])
        if "importance" not in clip: clip["importance"] = "mittel"
        if "one_sentence_summary" not in clip: clip["one_sentence_summary"] = clip.get("text", "")[:100] + "..."
        if "mark_nörgel" not in clip: clip["mark_nörgel"] = "Mark hat dazu nichts gesagt."
        if "source" not in clip: clip["source"] = "User"  # Default to User for uploaded clips
        
    return clips

@router.get("/uploads/status")
async def get_upload_status():
    # Return active uploads (filter out 'Done' after some time ideally, but for now return all)
    # Convert dict to list
    return list(upload_progress.values())
