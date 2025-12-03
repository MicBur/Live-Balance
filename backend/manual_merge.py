"""
Manual merge of existing clips with obvious overlaps.
Since Grok API is timing out, we'll use a manual mapping for now.
"""
import asyncio
from core.database import db as database_instance
from collections import Counter

async def manual_merge():
    await database_instance.connect()
    database = database_instance.db
    
    print("Fetching all clips...")
    clips_cursor = database.clips.find()
    clips = await clips_cursor.to_list(length=10000)
    
    print(f"Found {len(clips)} clips")
    
    # Manual mapping for obvious overlaps
    manual_mapping = {
        # Goals/Ziele
        "Ziele": "Ziele & Zielsetzung",
        "Zielsetzung": "Ziele & Zielsetzung",
        
        # Decision making & Psychology
        "Gehirn Vorurteile": "Psychologie & Denken",
        "Objektivität": "Psychologie & Denken",
        
        # Life philosophy
        "Hoffnung statt Erwartung": "Lebensphilosophie",
        "Luck Definition": "Lebensphilosophie",
        "Reue vermeiden": "Lebensphilosophie",
        
        # Communication & Relationships
        "Active Listening": "Kommunikation & Beziehungen",
        "Ratgeber sein": "Kommunikation & Beziehungen",
        
        # Productivity & Methods
        "2 von 3 Methode": "Produktivität & Methoden",
        "Standing Desk": "Produktivität & Methoden",
        
        # Mindfulness & Wellbeing
        "Gratitude Reflection": "Achtsamkeit & Wohlbefinden",
        "Ruhe Sensibilisierung": "Achtsamkeit & Wohlbefinden",
        "Positive Trigger": "Achtsamkeit & Wohlbefinden",
        
        # Keep as is
        "Motivation": "Motivation",
        "Uncategorized": "Uncategorized"
    }
    
    print(f"\nManual mapping will merge {len(set(manual_mapping.keys()))} topics into {len(set(manual_mapping.values()))} themes")
    
    # Update all clips
    print("\nUpdating clips with manually merged topics...")
    updated_count = 0
    for clip in clips:
        raw_topic = clip.get("raw_topic") or clip.get("topic", "Uncategorized")
        final_topic = manual_mapping.get(raw_topic, raw_topic)
        
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
    print("\nRebuilding merged_themes collection...")
    await database.merged_themes.delete_many({})
    
    # Count occurrences
    all_topics = []
    for clip in clips:
        raw_topic = clip.get("raw_topic") or clip.get("topic", "Uncategorized")
        final_topic = manual_mapping.get(raw_topic, raw_topic)
        all_topics.append(final_topic)
    
    theme_counts = Counter(all_topics)
    
    for theme, count in theme_counts.items():
        await database.merged_themes.insert_one({
            "name": theme,
            "count": count
        })
    
    print(f"Created {len(theme_counts)} themes in merged_themes collection")
    print("\n=== Theme Distribution ===")
    for theme, count in sorted(theme_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {theme}: {count} clips")
    
    print("\n✅ Manual merge complete!")

if __name__ == "__main__":
    asyncio.run(manual_merge())
