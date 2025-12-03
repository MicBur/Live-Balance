import requests
import os
import json

GROK_API_KEY = os.getenv("GROK_API_KEY")
GROK_API_URL = "https://api.x.ai/v1/chat/completions" # Verify correct endpoint

def analyze_text(text: str):
    if not GROK_API_KEY:
        print("GROK_API_KEY not set, skipping analysis")
        return {
            "topic": "Unknown",
            "importance": "unwichtig",
            "one_sentence_summary": "Analysis skipped",
            "mark_nörgel": "Kein API Key, Mark!"
        }

    prompt = f"""
Du bist Mark, der beste Freund von Mic. Mic gibt immer Alltagstipps.
Analysiere folgenden Transkript-Abschnitt und antworte NUR im JSON-Format:

Transkript:
\"\"\"{text}\"\"\"

Antworte genau so (kein zusätzlicher Text!):
{{
  "topic": "kurzer Oberbegriff, maximal 2 Wörter (z.B. Mundhygiene, Wäsche, Schlaf)",
  "importance": "unwichtig | mittel | wichtig",
  "one_sentence_summary": "max 12 Wörter Zusammenfassung",
  "mark_nörgel": "Ein witziger, direkter Satz an Mark, warum er das Thema mehr/seltener behandeln soll (max 80 Zeichen)"
}}
"""

    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "messages": [
            {"role": "system", "content": "You are a helpful assistant that outputs JSON."},
            {"role": "user", "content": prompt}
        ],
        "model": "grok-4-1-fast-reasoning",
        "stream": False,
        "temperature": 0.5
    }
    
    try:
        response = requests.post(GROK_API_URL, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content']
        # Parse JSON from content (handle potential markdown code blocks)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        return json.loads(content.strip())
    except Exception as e:
        print(f"Error calling Grok API: {e}")
        return {}

def generate_content_suggestion(existing_topics: list):
    if not GROK_API_KEY:
        return {"topic": "Kein API Key", "script": "Bitte API Key setzen."}

    topics_str = ", ".join([t['name'] for t in existing_topics])
    
    prompt = f"""
    Du bist Mark, der pragmatische Freund von Mic.
    Bisherige Themen deiner "Minuten" waren: {topics_str}.
    
    Schlage 4 UNTERSCHIEDLICHE neue Themen vor, die noch fehlen oder zu kurz kamen.
    Schreibe für jedes Thema einen kurzen Skript-Text (ca. 100-150 Wörter) für eine "Neue Minute".
    Der Stil soll typisch Mark sein: direkt, vielleicht leicht genervt aber herzlich, auf den Punkt.
    WICHTIG: Sprich NICHT Mic an ("Hallo Mic"), sondern sprich direkt zu den ZUHÖRERN / FOLLOWERN ("Leute, ...", "Hört mal zu...").
    Gib konkrete Tipps für die Follower.
    
    Antworte NUR im JSON-Format als LISTE von Objekten:
    [
      {{
        "category": "Kategorie (z.B. Glück, Alltag)",
        "suggested_topic": "Titel Thema 1",
        "reason": "Grund 1",
        "script": "Skript 1..."
      }},
      ...
    ]
    """
    
    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "messages": [
            {"role": "system", "content": "You are a helpful assistant that outputs JSON."},
            {"role": "user", "content": prompt}
        ],
        "model": "grok-4-1-fast-reasoning",
        "stream": False,
        "temperature": 0.7
    }
    
    try:
        response = requests.post(GROK_API_URL, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        return json.loads(content.strip())
    except Exception as e:
        print(f"Error generating suggestion: {e}")
        return [{
            "suggested_topic": "Fehler",
            "reason": "Konnte keine Vorschläge generieren",
            "script": f"Fehler: {str(e)}"
        }]
