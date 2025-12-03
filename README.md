# Hey Mark! - Der ultimative Alltags-Tipps-Analyzer

Dies ist der Boilerplate für das "Hey Mark!" Projekt.

## Voraussetzungen

- Docker & Docker Compose
- Ein xAI (Grok) API Key

## Installation & Start

1.  **Repository klonen** (oder in diesen Ordner gehen)
2.  **.env Datei erstellen**:
    Kopiere die Beispiel-Datei und füge deinen API-Key ein.
    ```bash
    cp .env.example .env
    # Bearbeite .env und setze GROK_API_KEY
    ```
3.  **Starten**:
    ```bash
    docker compose up --build
    ```

Das Frontend ist nun unter `http://localhost:3000` erreichbar.
Das Backend läuft unter `http://localhost:8000`.

## Deployment auf Hetzner Cloud (Produktion)

1.  **Server IP ermitteln**: Sei `YOUR_SERVER_IP` die öffentliche IP deines Servers.
2.  **.env anpassen**:
    Setze `NEXT_PUBLIC_API_URL` auf die öffentliche IP:
    ```bash
    NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000
    ```
3.  **Starten**:
    ```bash
    docker compose up --build -d
    ```
    Die App ist dann unter `http://YOUR_SERVER_IP:3000` erreichbar.

## Struktur

- `frontend/`: Next.js 14 App Router, Tailwind CSS, Glassmorphism UI.
- `backend/`: FastAPI, Whisper (lokal), Grok API Integration, MongoDB.
- `docker-compose.yml`: Orchestrierung aller Services.

## Hinweise zur Hardware

Die Spezifikation forderte das `large-v3` Whisper Modell. Dieses Modell benötigt viel RAM (ca. 10GB+).
Falls der Server (z.B. Hetzner Cloud mit 4GB RAM) nicht ausreicht, wird der Prozess abstürzen ("OOM Killed").
Lösung: In `backend/core/transcriber.py` das Modell auf `base` oder `small` ändern.

## Entwicklung

- Änderungen im `frontend` oder `backend` Ordner werden dank Hot-Reloading (in Docker Volumes gemountet) meist direkt sichtbar.
- Bei neuen Dependencies (`package.json` oder `requirements.txt`) muss neu gebaut werden: `docker compose up --build`.
