# Chatmate

Chatmate is a React + Vite starter for a spoken language learning app focused on
live, constructive feedback. The current concept is designed around Spanish
practice sessions where learners speak out loud and receive coaching on:

- grammatical acuteness
- flow and pacing
- idiomacy
- vocabulary range and synonym choice

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` now starts both the Vite frontend and the local coaching API.

## Current structure

- `src/App.jsx`: main page composition
- `src/components/`: reusable UI sections for the hero, coaching cards, and transcript analysis
- `src/data/spanishCoach.js`: seed content for the Spanish-first experience
- `src/hooks/useSpeechCoach.js`: microphone capture and browser speech recognition flow
- `src/services/coachApi.js`: frontend API bridge
- `server/index.js`: local API server
- `server/analyzeSpanish.js`: heuristic Spanish coaching engine for the prototype

## Good next steps

- swap browser speech recognition for a model-backed transcription service
- replace the heuristic analyzer with structured AI feedback
- store learner sessions and recurring weak spots
- turn coaching moments into follow-up drills
