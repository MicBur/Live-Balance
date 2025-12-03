import asyncio
import os
import sys
import shutil
from datetime import datetime

# Add backend directory to path
sys.path.append("/app")

from core.database import save_segment, db, save_upload
from core.transcriber import transcribe_audio
from core.grok_client import analyze_text
from core.audio_enhancer import enhance_audio
from core.style_analyzer import update_style_profile

async def run_recovery():
    clips_dir = "/app/uploads/clips"
    raw_dir = "/app/uploads/raw"
    
    # 1. Restore Uploads (Parents)
    # We infer uploads from raw files
    if os.path.exists(raw_dir):
        for filename in os.listdir(raw_dir):
            if not filename.endswith(".mp3"): continue
            
            upload_id = filename.split("_")[0]
            if not db.uploads.find_one({"upload_id": upload_id}):
                print(f"Restoring upload entry for {filename}...")
                upload_doc = {
                    "upload_id": upload_id,
                    "filename": filename.split("_", 1)[1] if "_" in filename else filename,
                    "status": "completed",
                    "progress": 100,
                    "stage": "Restored",
                    "created_at": datetime.utcnow()
                }
                save_upload(upload_doc)

    # 2. Process Clips
    if not os.path.exists(clips_dir):
        print("No clips directory found.")
        return

    clips = [f for f in os.listdir(clips_dir) if f.endswith(".mp3") and "_enhanced" not in f]
    print(f"Found {len(clips)} clips to process.")
    
    for i, clip_name in enumerate(clips):
        clip_path = os.path.join(clips_dir, clip_name)
        
        # Check if already processed
        if db.clips.find_one({"file_name": clip_name}):
            print(f"[{i+1}/{len(clips)}] Skipping {clip_name} (already in DB)")
            continue
            
        print(f"[{i+1}/{len(clips)}] Processing {clip_name}...")
        
        try:
            # A. Enhance Audio
            # We create a temporary enhanced version for transcription/storage?
            # User asked to "bearbeiten... vorher".
            # If we enhance, we should probably replace the file or save as new.
            # To keep it simple and consistent with the file name in DB, we will:
            # 1. Enhance to a temp file
            # 2. Rename temp file to original file (overwrite)
            # This ensures the frontend serves the enhanced version.
            
            print("  -> Enhancing audio...")
            enhanced_path = enhance_audio(clip_path)
            if enhanced_path != clip_path:
                shutil.move(enhanced_path, clip_path)
            
            # B. Transcribe
            print("  -> Transcribing...")
            # Transcribe directly (clips are short, no splitting needed)
            result = transcribe_audio(clip_path, chunk_duration=300) 
            text = result["text"].strip()
            
            if not text:
                print("  -> No text found, skipping analysis.")
                continue

            # C. Update Style Profile
            update_style_profile(text)
            
            # D. Analyze with Grok
            print("  -> Analyzing with Grok...")
            analysis = analyze_text(text)
            
            # E. Save to DB
            upload_id = clip_name.split("_")[0]
            segment_doc = {
                "upload_id": upload_id,
                "file_name": clip_name,
                "text": text,
                "start": 0, # Lost exact timing relative to original, but not critical for clips
                "end": 0,
                "duration": 0, # Could get from ffmpeg if needed
                **analysis,
                "created_at": datetime.utcnow()
            }
            save_segment(segment_doc)
            print("  -> Saved.")
            
        except Exception as e:
            print(f"  -> ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(run_recovery())
