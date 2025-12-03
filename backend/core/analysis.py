import os
import json
from typing import List, Dict
from dotenv import load_dotenv
from xai_sdk import Client
import logging

load_dotenv()

XAI_API_KEY = os.getenv("GROK_API_KEY")  # Keep same env var name
logger = logging.getLogger("uvicorn")

def call_grok(messages: List[Dict], model="grok-4-1-fast-reasoning-latest", timeout=90) -> str:
    """
    Call Grok API using official xAI SDK
    """
    try:
        logger.info(f"Calling Grok API with {len(messages)} messages, model={model}, timeout={timeout}s")
        
        # Initialize xAI client
        client = Client(api_key=XAI_API_KEY, timeout=timeout)
        
        # Create chat with model
        chat = client.chat.create(model=model, max_tokens=2000, temperature=0.7)
        
        # Add messages to chat
        from xai_sdk.chat import system, user, assistant
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if not content:
                continue
                
            if role == "system":
                chat.append(system(content))
            elif role == "user":
                chat.append(user(content))
            elif role == "assistant":
                chat.append(assistant(content))
        
        # Get response (this is synchronous)
        response = chat.sample()
        
        # Extract content from response
        if response and hasattr(response, 'message'):
            if hasattr(response.message, 'content') and response.message.content:
                result = response.message.content.strip()
                tokens_used = response.usage.total_tokens if hasattr(response, 'usage') and response.usage else 'unknown'
                logger.info(f"Grok API success. Tokens used: {tokens_used}")
                return result
        
        logger.error(f"Grok API returned empty response: {response}")
        return ""
    except Exception as e:
        logger.error(f"Grok API Error: {str(e)}", exc_info=True)
        return ""

def analyze_topic_style(text: str) -> Dict:
    """
    Analyzes text for topic and style (filler words, pace, tone).
    """
    prompt = f"""
    Analyze the following transcript segment. 
    Identify the main topic (short, 1-3 words), a category (e.g., Work, Family, Health), importance (wichtig/mittel/unwichtig), a one-sentence summary, and a "Mark Nörgel" comment (a cynical/funny comment in the style of Mark).
    Also analyze the speaking style.
    
    Transcript: "{text}"
    
    Return ONLY JSON:
    {{
        "topic": "Topic Name",
        "category": "Category Name",
        "importance": "wichtig/mittel/unwichtig",
        "one_sentence_summary": "Summary text...",
        "mark_nörgel": "Cynical comment...",
        "style": {{
            "filler_words": "list, of, fillers",
            "pace": "fast/slow/medium",
            "tone": "happy/angry/neutral/complaining"
        }}
    }}
    """
    response = call_grok([{"role": "user", "content": prompt}])
    try:
        # Clean up code blocks if present
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
            
        return json.loads(response)
    except:
        return {"topic": "Uncategorized", "category": "General", "importance": "mittel", "one_sentence_summary": "Analysis failed.", "mark_nörgel": "...", "style": {"filler_words": "", "pace": "medium", "tone": "neutral"}}

def merge_topics(topics: List[str]) -> Dict[str, str]:
    """
    Merges similar topics into a maximum of 15 broad themes.
    Returns a mapping: {"Raw Topic": "Merged Theme"}
    """
    if not topics:
        return {}
        
    unique_topics = list(set(topics))
    
    prompt = f"""
    Here is a list of topics: {json.dumps(unique_topics)}
    
    Map EACH of these topics to a broad, distinct theme.
    IMPORTANT: Be VERY aggressive about merging similar topics to reduce overlap.
    
    Rules:
    - Maximum 15 distinct themes total (aim for 10-12 if possible)
    - Merge topics that are synonyms or very similar (e.g., "Mundhygiene" and "Zähne putzen" → "Mundhygiene")
    - Merge topics in the same category (e.g., "Socken waschen", "Wäsche", "Kleidung pflegen" → "Wäsche & Kleidung")
    - Use broad, inclusive theme names (e.g., "Körperpflege" instead of multiple specific themes)
    - Prefer existing common themes over creating new ones
    
    Example groupings:
    - All dental/teeth topics → "Mundhygiene"
    - All laundry/clothes topics → "Wäsche & Kleidung"
    - All sleep topics → "Schlaf & Erholung"
    - All food/cooking topics → "Ernährung & Kochen"
    - All cleaning topics → "Haushalt & Ordnung"
    
    Return ONLY a JSON object mapping raw topics to merged themes:
    {{
        "Socken waschen": "Wäsche & Kleidung",
        "Zähne putzen": "Mundhygiene",
        "Zahnseide": "Mundhygiene",
        ...
    }}
    """
    response = call_grok([{"role": "user", "content": prompt}])
    try:
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
        return json.loads(response)
    except:
        # Fallback: map to themselves
        return {t: t for t in unique_topics}

def generate_suggestions(style_profile: Dict, weak_topics: List[Dict]) -> Dict:
    """
    Generates 4 new 60-second tips based on weak topics and style profile.
    Uses the specific prompt from v3.md.
    """
    # Construct the prompt variables
    topic1 = weak_topics[0]['name'] if len(weak_topics) > 0 else "Allgemein"
    percent1 = weak_topics[0]['percent'] if len(weak_topics) > 0 else 0
    topic2 = weak_topics[1]['name'] if len(weak_topics) > 1 else "Allgemein"
    percent2 = weak_topics[1]['percent'] if len(weak_topics) > 1 else 0
    topic3 = weak_topics[2]['name'] if len(weak_topics) > 2 else "Allgemein"
    percent3 = weak_topics[2]['percent'] if len(weak_topics) > 2 else 0
    topic4 = weak_topics[3]['name'] if len(weak_topics) > 3 else "Allgemein"
    percent4 = weak_topics[3]['percent'] if len(weak_topics) > 3 else 0
    
    prompt = f"""
    Du bist KI-Mark – sprich EXAKT wie Mark (Füllwörter, Tempo, leichter Meckerton).
    Style-Info aus 140+ Clips:
    {style_profile.get('filler_words', '')} – {style_profile.get('pace', '')} – {style_profile.get('tone', '')}

    Generiere genau 4 neue 60-Sekunden-Tipps zu diesen unterrepräsentierten Themen:
    1. {topic1} – nur {percent1} %
    2. {topic2} – nur {percent2} %
    3. {topic3} – nur {percent3} %
    4. {topic4} – nur {percent4} %

    Jeder Tipp muss:
    - exakt 138–142 Wörter haben (bei Marks Tempo = 60 Sekunden)
    - mit „Meine Minute..." anfangen (wie die originalen Clips)
    - mit einem klaren Abschluss enden

    Antworte NUR mit diesem JSON (kein weiterer Text!):

    {{
      "vorschlag_1": "kompletter Text (138–142 Wörter)",
      "vorschlag_2": "kompletter Text (138–142 Wörter)",
      "vorschlag_3": "kompletter Text (138–142 Wörter)",
      "vorschlag_4": "kompletter Text (138–142 Wörter)"
    }}
    """
    
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(f"Calling Grok with model: grok-4-1-fast-reasoning")
    response = call_grok([{"role": "user", "content": prompt}])
    logger.info(f"Grok response received. Length: {len(response)}")
    print(f"DEBUG: Grok raw response: {response}")
    try:
        # Extract JSON from markdown code blocks if present
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
        
        response = response.strip()
        
        # Try to parse the JSON
        try:
            parsed = json.loads(response)
            print(f"DEBUG: Parsed JSON: {parsed}")
            return parsed
        except json.JSONDecodeError as json_err:
            print(f"JSON Decode Error: {json_err}")
            
            # Try to fix common issues
            # 1. Try to find the last complete JSON object
            last_brace = response.rfind('}')
            if last_brace > 0:
                truncated = response[:last_brace+1]
                try:
                    parsed = json.loads(truncated)
                    print(f"DEBUG: Parsed truncated JSON successfully")
                    return parsed
                except:
                    pass
            
            # 2. Try to manually extract suggestions using regex
            import re
            suggestions_dict = {}
            pattern = r'"vorschlag_(\d+)"\s*:\s*"([^"]*(?:\\.[^"]*)*)"'
            matches = re.findall(pattern, response, re.DOTALL)
            
            if matches:
                for num, text in matches:
                    # Unescape the text
                    text = text.replace('\\"', '"').replace('\\n', '\n')
                    suggestions_dict[f"vorschlag_{num}"] = text
                print(f"DEBUG: Extracted {len(suggestions_dict)} suggestions via regex")
                return suggestions_dict
            
            print(f"Error parsing suggestions: {json_err}")
            return {}
    except Exception as e:
        print(f"Error parsing suggestions: {e}")
        return {}
