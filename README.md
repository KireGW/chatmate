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

If you want to use the wheel already placed in the project root instead of
installing from PyPI, you can do:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install ./faster_whisper-1.2.1-py3-none-any.whl
```

That matches the version pinned in `server/requirements.txt`.

You can customize the backend in `.env`:

- `OLLAMA_API_URL`
- `OLLAMA_MODEL`
- `WHISPER_MODEL_SIZE`
- `WHISPER_DEVICE`
- `WHISPER_COMPUTE_TYPE`
- `VITE_API_BASE_URL`

Leave `VITE_API_BASE_URL` empty for local dev with the Vite proxy. Set it to
your deployed backend URL for mobile or production use.

## Use your computer as the backend for your phone

The simplest setup is to keep both the frontend and backend running on your
computer and open the app from your phone over the same Wi-Fi network.

1. Make sure your computer and phone are on the same Wi-Fi network.
2. Start Ollama on your computer.
3. Start Chatmate:

```bash
npm run dev
```

4. Find your computer's local IP address:

```bash
ipconfig getifaddr en0
```

If that returns nothing, try:

```bash
ipconfig getifaddr en1
```

5. Open this on your phone browser:

```text
http://YOUR_LOCAL_IP:5173
```

Example:

```text
http://192.168.1.24:5173
```

Notes:

- your computer must stay on
- `npm run dev` must keep running
- Ollama and the Python transcription environment must be available on that computer
- this setup works best at home on the same local network

## Free remote mobile access with Tailscale

If you want to use Chatmate from your phone over cellular data for free during
development, the easiest option is to use Tailscale.

1. Install Tailscale on your computer.
2. Install Tailscale on your phone.
3. Sign in to the same Tailscale account on both devices.
4. On your computer, find your Tailscale IPv4 address in the Tailscale app.
   It usually looks like `100.x.x.x`.
5. In your local `.env`, set:

```bash
VITE_API_BASE_URL=http://YOUR_TAILSCALE_IP:3001
```

Example:

```bash
VITE_API_BASE_URL=http://100.101.102.103:3001
```

6. Start Chatmate on your computer:

```bash
npm run dev
```

7. On your phone, open the frontend through your computer as well:

```text
http://YOUR_TAILSCALE_IP:5173
```

Example:

```text
http://100.101.102.103:5173
```

Important notes for Tailscale:

- your computer must stay on
- `npm run dev` must keep running
- Ollama and the transcription stack must be running on that computer
- both devices must be connected to Tailscale
- if Vite switches to another port because `5173` is busy, use the port printed in the terminal instead

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
