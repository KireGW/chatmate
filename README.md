# Chatmate

Chatmate is a React + Vite app for spoken language learning. The current setup
is built around Spanish practice sessions where learners record themselves,
store recordings locally on their device, and then request feedback on:

- grammatical acuteness
- flow and pacing
- idiomacy
- vocabulary range and synonym choice

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts both the Vite frontend and the local coaching API.

## Local open-model backend

The backend is designed for a self-hosted pipeline:

- transcription with `faster-whisper`
- feedback generation with `Ollama`

Setup:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt
ollama pull qwen2.5:7b-instruct
cp .env.example .env
npm install
npm run dev
```

You can customize the backend in `.env`:

- `OLLAMA_API_URL`
- `OLLAMA_MODEL`
- `WHISPER_MODEL_SIZE`
- `WHISPER_DEVICE`
- `WHISPER_COMPUTE_TYPE`
- `VITE_API_BASE_URL`

Leave `VITE_API_BASE_URL` empty for local dev with the Vite proxy. Set it to
your deployed backend URL for mobile or production use.

## Current structure

- `src/App.jsx`: main page composition
- `src/components/`: reusable UI sections for recording, library, and feedback
- `src/hooks/useSpeechCoach.js`: microphone capture and browser speech recognition flow
- `src/services/coachApi.js`: frontend API bridge with backend URL support
- `src/lib/analyzeSpanish.js`: shared fallback transcript analyzer
- `server/index.js`: local API server
- `server/transcribe_audio.py`: `faster-whisper` transcription script
- `server/requirements.txt`: Python dependencies for transcription

## Good next steps

- deploy the backend separately so mobile can reach it over the internet
- improve the Ollama prompt or model choice for deeper pedagogy
- store learner sessions and recurring weak spots
- turn coaching moments into follow-up drills
