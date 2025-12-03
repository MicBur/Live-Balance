import os
import sys
import time
from pymongo import MongoClient
from core.grok_client import analyze_text

# Setup MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://mongo:27017")
client = MongoClient(MONGODB_URL)
db = client.hey_mark

def reprocess_missing_summaries():
    # Find clips without summary or with empty summary
    query = {
        "$or": [
            {"one_sentence_summary": {"$exists": False}},
            {"one_sentence_summary": ""},
            {"one_sentence_summary": None}
        ]
    }
    
    missing_count = db.clips.count_documents(query)
    print(f"Found {missing_count} clips with missing summaries.")
    
    if missing_count == 0:
        print("No clips to process.")
        return

    cursor = db.clips.find(query)
    
    processed_count = 0
    for clip in cursor:
        print(f"Processing clip: {clip.get('file_name', 'Unknown')}")
        
        text = clip.get('text', '')
        if not text:
            print("  - No text content, skipping.")
            continue
            
        try:
            analysis = analyze_text(text)
            
            if analysis:
                db.clips.update_one(
                    {"_id": clip["_id"]},
                    {"$set": {
                        "topic": analysis.get("topic", "Unknown"),
                        "importance": analysis.get("importance", "unwichtig"),
                        "one_sentence_summary": analysis.get("one_sentence_summary", ""),
                        "mark_nörgel": analysis.get("mark_nörgel", "")
                    }}
                )
                print("  - Updated successfully.")
                processed_count += 1
            else:
                print("  - Analysis returned empty result.")
                
            # Rate limiting to be safe
            time.sleep(1)
            
        except Exception as e:
            print(f"  - Error processing clip: {e}")

    print(f"Finished. Processed {processed_count} clips.")

if __name__ == "__main__":
    reprocess_missing_summaries()
