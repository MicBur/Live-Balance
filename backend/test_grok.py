import os
import requests
from dotenv import load_dotenv

load_dotenv()

GROK_API_KEY = os.getenv("GROK_API_KEY")
print(f"Key loaded: {GROK_API_KEY[:5]}...")

url = "https://api.x.ai/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {GROK_API_KEY}",
    "Content-Type": "application/json"
}
payload = {
    "messages": [{"role": "user", "content": "Hello"}],
    "model": "grok-4-1-fast-reasoning",
    "stream": False
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
