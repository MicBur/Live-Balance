"""
Re-merge all existing clips with improved category merging.
This script will:
1. Fetch all clips from database
2. Collect their raw topics
3. Apply new merge_topics logic (max 15 themes)
4. Update all clips with new merged topics
5. Rebuild merged_themes collection
"""
import asyncio
from core.database import get_database
from core.analysis import merge_topics
from collections import Counter

async def remerge_all_clips():
    from core.database import db
    await db.connect()
    database = db.db  # Access the db attribute directly
    
    print("Fetching all clips...")
    clips_cursor = database.clips.find()
    clips = await clips_cursor.to_list(length=10000)
    
    if not clips:
        print("No clips found in database")
        return
    
    print(f"Found {len(clips)} clips")
    
    # Collect all raw topics
    all_topics = []
    for clip in clips:
        raw_topic = clip.get("raw_topic") or clip.get("topic", "Unbekannt")
        all_topics.append(raw_topic)
    
    print(f"Unique topics before merge: {len(set(all_topics))}")
    
    # Apply new merge logic
    print("Calling merge_topics with improved logic...")
    topic_mapping = merge_topics(all_topics)
    
    print(f"Unique themes after merge: {len(set(topic_mapping.values()))}")
    print(f"Merged themes: {sorted(set(topic_mapping.values()))}")
    
    # Update all clips
    print("Updating clips with new merged topics...")
    updated_count = 0
    for clip in clips:
        raw_topic = clip.get("raw_topic") or clip.get("topic", "Unbekannt")
        final_topic = topic_mapping.get(raw_topic, raw_topic)
        
        await database.clips.update_one(
            {"_id": clip["_id"]},
            {"$set": {
                "final_topic": final_topic,
                "topic": final_topic
            }}
        )
        updated_count += 1
    
    print(f"Updated {updated_count} clips")
    
    # Rebuild merged_themes collection
    print("Rebuilding merged_themes collection...")
    await database.merged_themes.delete_many({})  # Clear old themes
    
    final_topics = [topic_mapping.get(t, t) for t in all_topics]
    theme_counts = Counter(final_topics)
    
    for theme, count in theme_counts.items():
        await database.merged_themes.insert_one({
            "name": theme,
            "count": count
        })
    
    print(f"Created {len(theme_counts)} themes in merged_themes collection")
    print("\n=== Theme Distribution ===")
    for theme, count in sorted(theme_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {theme}: {count} clips")
    
    print("\n✅ Re-merge complete!")

if __name__ == "__main__":
    asyncio.run(remerge_all_clips())
