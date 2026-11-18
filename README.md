# 🏛️ Citizen FTA — Feedback-to-Action Loop

> AI-powered civic grievance resolution: from a citizen's voice note to an officer's verified action — in minutes.

---

## What It Is

Citizen FTA is a full-stack civic tech prototype that closes the loop between citizen complaints and government action:

1. **Citizens** submit complaints via voice, photo, or text in any Indian language
2. **Gemini AI** transcribes, translates, categorises, and embeds each complaint
3. **H3 geospatial clustering** groups similar issues by location and semantic similarity
4. **Dynamic priority scoring** ranks clusters by urgency × size × vulnerability × time decay
5. **Officers** see ranked clusters, upload before/after photos, and AI vision-checks resolutions
6. **Citizens confirm** resolution — rejections auto-reopen the ticket

---

## Demo Flow (3 minutes, no API keys needed)

```
1. Open http://localhost:3000           → Landing page with live metrics
2. Click "Seed Data" on Officer page    → Populates 15 sample complaints
3. http://localhost:3000/citizen        → Citizen Simulator
   - Choose Voice / Photo / Text
   - Drop a pin on the map
   - Submit (tracking ID shown)
4. http://localhost:3000/officer        → Officer Workbench (auto-refreshes 5s)
   - Click a red-priority cluster
   - View AI summary + sample complaints
   - Update status → "Action Taken"
   - Upload after-photo + Run Vision Check
5. Simulate citizen confirming/rejecting → Watch ticket reopen
6. http://localhost:3000/scorecard      → Public Scorecard + H3 hex map + charts
```

---

## Tech Stack

| Layer       | Tech |
|-------------|------|
| Frontend    | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Maps        | Leaflet, H3-js (res 8 hexagons) |
| Charts      | Recharts |
| Backend     | FastAPI, SQLAlchemy, SQLite |
| AI          | Gemini 2.0 Flash (transcription, analysis, vision check, embeddings) |
| Clustering  | Cosine similarity + H3 spatial grouping |
| Bot stub    | Telegram Bot API (mock demo flow) |
| Deployment  | Docker Compose |

---

## Quick Start (DEMO_MODE — no API keys needed)

```bash
# Clone / open workspace
cd "Client FTA"

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
# → http://localhost:3000

# Seed demo data (optional)
curl -X POST http://localhost:8000/demo/seed
```

> **DEMO_MODE=true** (default). All Gemini API calls return cached mock responses. No keys required.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `DEMO_MODE` | `true` | Use cached AI responses |
| `GEMINI_API_KEY` | _(none)_ | Required only when DEMO_MODE=false |
| `CLUSTER_THRESHOLD` | `0.78` | Cosine similarity for clustering |
| `REOPEN_REJECTION_PCT` | `0.25` | Citizen rejection % that triggers reopen |

### Frontend (`frontend/.env.local`)
| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | Show demo banner |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ingest` | Submit complaint (multipart: audio/image/text + lat/lng) |
| `GET` | `/clusters` | List all clusters sorted by priority |
| `GET` | `/clusters/{id}` | Cluster detail with ticket + sample complaints |
| `PATCH` | `/tickets/{id}/status` | Update ticket status |
| `POST` | `/tickets/{id}/resolve` | Upload after-photo, trigger vision check |
| `POST` | `/citizen/confirm` | Citizen confirms/rejects resolution |
| `GET` | `/public/metrics` | Aggregated metrics for scorecard |
| `POST` | `/demo/seed` | Seed 15 sample complaints |
| `POST` | `/demo/simulate-reopen` | Simulate citizen rejection cascade |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CITIZEN CHANNELS                        │
│   📱 Web App    🤖 Telegram Bot    📞 USSD (roadmap)        │
└────────────────────────┬────────────────────────────────────┘
                         │  POST /ingest (multipart)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND                           │
│                                                             │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │  Ingest  │──▶│  Gemini AI   │──▶│  Cluster Engine    │  │
│  │  Router  │   │  (trans+emb) │   │  (cosine + H3)     │  │
│  └──────────┘   └──────────────┘   └────────┬───────────┘  │
│                                             │               │
│  ┌──────────┐   ┌──────────────┐   ┌────────▼───────────┐  │
│  │ Officer  │◀──│  Priority    │◀──│  SQLite DB         │  │
│  │ Routes   │   │  Scorer      │   │  (Feedback+Cluster │  │
│  └──────────┘   └──────────────┘   │   +Ticket+Resol.)  │  │
│                                    └────────────────────┘  │
│  ┌──────────────────────────────┐                          │
│  │  Vision Check (Gemini Flash) │                          │
│  │  Before/After photo analysis │                          │
│  └──────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               NEXT.JS 14 FRONTEND                           │
│                                                             │
│  / (Landing)   /citizen (Simulator)   /officer (Workbench)  │
│  /officer/[id] (Cluster Detail)       /scorecard (Public)   │
│                                                             │
│  Leaflet Maps  •  H3 Hex Grid  •  Recharts  •  Tailwind    │
└─────────────────────────────────────────────────────────────┘
```

---

## Running the Telegram Bot (stub)

```bash
cd bot
python telegram_bot.py
# No token set? Runs mock demo flow in terminal.
# With TELEGRAM_BOT_TOKEN in env: connects to real Telegram.
```

