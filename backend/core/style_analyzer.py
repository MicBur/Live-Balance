import json
import os
from collections import Counter
import re

STYLE_FILE = "/app/style_profile.json"

def load_style_profile():
    if os.path.exists(STYLE_FILE):
        try:
            with open(STYLE_FILE, 'r') as f:
                return json.load(f)
        except:
            return {"word_count": 0, "vocabulary": {}, "avg_sentence_length": 0, "total_sentences": 0}
    return {"word_count": 0, "vocabulary": {}, "avg_sentence_length": 0, "total_sentences": 0}

def save_style_profile(profile):
    with open(STYLE_FILE, 'w') as f:
        json.dump(profile, f, indent=2)

def update_style_profile(text: str):
    """
    Updates the global style profile with new text data.
    """
    profile = load_style_profile()
    
    # Basic text cleaning
    text = text.strip()
    if not text:
        return profile

    # Sentence stats
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    num_sentences = len(sentences)
    if num_sentences == 0:
        return profile

    total_words_in_batch = 0
    batch_vocab = Counter()

    for sentence in sentences:
        words = re.findall(r'\w+', sentence.lower())
        count = len(words)
        total_words_in_batch += count
        batch_vocab.update(words)

    # Update averages
    current_total_sentences = profile.get("total_sentences", 0)
    current_avg = profile.get("avg_sentence_length", 0)
    
    new_total_sentences = current_total_sentences + num_sentences
    new_avg = ((current_avg * current_total_sentences) + total_words_in_batch) / new_total_sentences
    
    profile["total_sentences"] = new_total_sentences
    profile["avg_sentence_length"] = new_avg
    profile["word_count"] = profile.get("word_count", 0) + total_words_in_batch

    # Update vocabulary (keep top 1000 most frequent words to avoid huge file)
    current_vocab = Counter(profile.get("vocabulary", {}))
    current_vocab.update(batch_vocab)
    profile["vocabulary"] = dict(current_vocab.most_common(1000))

    save_style_profile(profile)
    return profile

def get_style_prompt():
    """
    Returns a prompt string describing the speaker's style based on the profile.
    """
    profile = load_style_profile()
    if profile["total_sentences"] < 10:
        return "Sprich locker und natürlich."
        
    avg_len = profile["avg_sentence_length"]
    vocab = profile.get("vocabulary", {})
    top_words = ", ".join(list(vocab.keys())[:20])
    
    style_desc = f"Der Sprecher nutzt durchschnittlich {avg_len:.1f} Wörter pro Satz."
    if avg_len < 10:
        style_desc += " Er spricht kurz und knapp."
    elif avg_len > 20:
        style_desc += " Er nutzt lange, verschachtelte Sätze."
        
    return f"{style_desc} Häufige Wörter sind: {top_words}. Bitte imitiere diesen Stil."
