from pymongo import MongoClient
import os
import json

client = MongoClient("mongodb://mongo:27017")
db = client.hey_mark

# Find clips without summary or with empty summary
missing_summary = list(db.clips.find({
    "$or": [
        {"one_sentence_summary": {"$exists": False}},
        {"one_sentence_summary": ""},
        {"one_sentence_summary": None}
    ]
}).limit(5))

print(f"Found {db.clips.count_documents({'$or': [{'one_sentence_summary': {'$exists': False}}, {'one_sentence_summary': ''}, {'one_sentence_summary': None}]})} clips with missing summary.")

for clip in missing_summary:
    print(json.dumps(clip, default=str, indent=2))

# Also check a 'successful' clip to compare
print("\n--- Successful Clip ---")
successful = db.clips.find_one({"one_sentence_summary": {"$ne": ""}})
if successful:
    print(json.dumps(successful, default=str, indent=2))
