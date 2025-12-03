# Vollständige, ausführliche Projektspezifikation  
Projektname: „Hey Mark!“ – Der ultimative Alltags-Tipps-Analyzer  
Zielgruppe: Mic (Aufnahme) + Mark (der, der immer meckert, dass bestimmte Themen fehlen)  
Zu geben an: Gemini 1.5 Pro (oder neuer) als KI-Agent mit Code- und File-Generierungs-Funktion

## 1. Gesamtziel
Mic nimmt stundenlang Sprachnachrichten auf (meist 45–90 Minuten am Stück).  
Jeder Tipp ist ca. 55–65 Sekunden lang, aber NICHT exakt 60 Sekunden und ohne feste Trennung.  
Die neue Web-App soll automatisch:

1. Die lange MP3 hochladen lassen  
2. Intelligente Segmente erkennen (Beginn meist mit „Hey Leute…“ oder kurzer Musik/Jingle + Stille)  
3. Jeden Abschnitt mit Whisper (lokal) transkribieren inkl. exakter Timestamps  
4. Den Text mit der Grok-API (xAI) thematisch klassifizieren  
5. Alles in MongoDB speichern  
6. Ein wunderschönes, modernes Dashboard anzeigen (Dark Mode + Glassmorphism + Blur)  
7. Mark sagen: „Hey Mark, du hast 18 % Mundhygiene, aber 0 % Duschen & Körperpflege – beweg dich mal!“ + konkrete Vorschläge für fehlende Themen

## 2. Technischer Stack (festgelegt)

| Schicht       | Technologie                              | Begründung                                      |
|---------------|------------------------------------------|-------------------------------------------------|
| Frontend      | Next.js 14 (App Router) + TypeScript     | SSR, File-Routing, perfekte Tailwind-Integration |
| Styling       | Tailwind CSS + @tailwindcss/forms        | Schnell, Dark Mode out-of-the-box               |
| UI/Animation  | framer-motion + react-icons              | Schöne Hover- und Enter-Animationen             |
| Charts        | Recharts oder Chart.js                   | Pie + Bar + Radar                               |
| Backend       | Python 3.12 + FastAPI                    | Async, super für File-Upload & Whisper          |
| Transkription | openai-whisper (Modell „large-v3“ lokal) | Kostenlos, exzellente Genauigkeit + Timestamps  |
| Audio-Split   | ffmpeg-python oder pydub                 | Präzises Schneiden nach Whisper-Timestamps     |
| Datenbank     | MongoDB 7+ (Docker)                      | Schema-los → neue Themen ohne Migration         |
| KI-Analyse    | Grok-API (xAI)                           | Witziger, direkter Ton für „Hey Mark“-Nachrichten |
| Hosting       | Hetzner Cloud (1 vCPU, 2–4 GB RAM reicht)| Docker-Compose, Port 3000 nach außen            |
| Container     | Docker + docker-compose.yml              | Ein-Befehl-Start                                |

## 3. Datenmodell (MongoDB Collection „clips“)

```json
{
  "_id": ObjectId,
  "upload_id": UUID,
  "file_name": "mic-2025-12-01.mp3",
  "segment_nr": 23,
  "start_sec": 1427.3,
  "end_sec": 1488.9,
  "duration_sec": 61.6,
  "text": "Hey Leute, heute wieder zum Thema Zähne putzen richtig...",
  "topic": "Mundhygiene",
  "sub_topic": "Zahnputztechnik",
  "importance": "wichtig",
  "grok_suggestion": "Verwende Zahnseide und Zungenreiniger – Mark macht das nie!",
  "created_at": ISODate
}
Zusätzlich Collection „uploads“ für Metadaten + Statistik-Cache.
4. Genauer Workflow (Schritt für Schritt)

User öffnet http://deine-ip:3000 → Drag & Drop oder Datei-Auswahl
Frontend sendet Datei per multipart an FastAPI /upload
FastAPI speichert temporär unter /uploads/raw/
Python startet Whisper:Pythonmodel = whisper.load_model("large-v3")
result = model.transcribe(file_path, word_timestamps=True, language="de")
Aus result["segments"] werden Start/End-Zeiten genommen
Intelligenter Split:
Wenn Segment-Dauer > 45 s und < 90 s → wahrscheinlicher echter Tipp
Zusätzlich: Stille-Erkennung mit pydub (<-30 dB für > 1.2 s) als Fallback

Für jedes Segment:
Schneide exakt mit ffmpeg-python → /uploads/clips/xxx_023.mp3
Speichere Clip-Pfad + Transkript + Timestamps in MongoDB
Sende Text an Grok-API mit Prompt (siehe unten)
Speichere Topic + Suggestion zurück

Nach Abschluss: Cache-Statistik neu berechnen → Frontend aktualisiert automatisch (WebSocket oder polling)

5. Exakter Grok-Prompt (wird 1× pro Clip gesendet)
textDu bist Mark, der beste Freund von Mic. Mic gibt immer Alltagstipps.
Analysiere folgenden Transkript-Abschnitt und antworte NUR im JSON-Format:

Transkript:
"""{{text}}"""

Antworte genau so (kein zusätzlicher Text!):
{
  "topic": "kurzer Oberbegriff, maximal 2 Wörter (z.B. Mundhygiene, Wäsche, Schlaf)",
  "importance": "unwichtig | mittel | wichtig",
  "one_sentence_summary": "max 12 Wörter Zusammenfassung",
  "mark_nörgel": "Ein witziger, direkter Satz an Mark, warum er das Thema mehr/seltener behandeln soll (max 80 Zeichen)"
}
6. Frontend – Exakte Design-Vorgaben (Glassmorphism Deluxe)

Hintergrund: schwarzes Sternenhimmel-Gradient oder leichtes Noise
Globale Klasse für Glass-Cards:CSS.glass-card {
  @apply bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl 
         transition-all duration-300 hover:shadow-cyan-500/40 hover:border-cyan-500/30
         hover:scale-105;
}
Dark Mode = Standard (kein Light Mode nötig)
Schrift: font-sans → Google Font „Inter“ 900/700/500
Akzentfarbe: Cyan-400 → #06b6d4
Jede Themenkarte enthält:
Thema-Name groß
Prozent-Anteil + animierter Ring (conic-gradient)
Minuten-Anzahl + Anzahl Clips
Hover → Card hebt sich, leichter Neon-Glow
Klick → Modal mit Audio-Player (waveform) + vollständiges Transkript + Mark-Nörgel-Satz

Übersicht:
Großer interaktiver Pie-Chart (Mitte)
Rechts: „Fehlende Themen“-Liste mit 0 % und Grok-Vorschlägen
Button „Neue Ideen von Grok holen“


7. Docker-Compose (komplett)
YAMLversion: "3.9"
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

  backend:
    build: ./backend
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - mongo
    environment:
      - GROK_API_KEY=xxx
      - MONGODB_URL=mongodb://mongo:27017

  mongo:
    image: mongo:7
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
8. Was der KI-Agent jetzt genau bauen soll
Bitte erstelle mir den kompletten, lauffähigen Boilerplate:

Ordnerstruktur (frontend + backend)
frontend/ mit Next.js 14 App Router, Tailwind, Glassmorphism-Komponenten, Upload-Page, Dashboard-Page, alle Charts
backend/ mit FastAPI, Routen /upload, /segments/{upload_id}, Whisper-Logik, Grok-Call, Mongo-Insert, ffmpeg-Split
Vollständige docker-compose.yml + Dockerfile jeweils
.env.example
README.md mit exakten Start-Befehlen für Hetzner

Ich will danach nur noch docker compose up --build machen und alles läuft auf Port 3000.
Vielen Dank und los geht’s!