# ✅ Citizen FTA — Status Checklist

> Living document. Updated as milestones are completed.

---

## Backend

- [ ] Project scaffolded (`backend/`)
- [ ] `requirements.txt` created
- [ ] `.env` / `.env.example` created
- [ ] `config.py` — Pydantic settings
- [ ] `database.py` — SQLAlchemy + SQLite
- [ ] `models.py` — Feedback, Cluster, Ticket, Resolution, PublicMetrics
- [ ] `schemas.py` — Pydantic request/response schemas
- [ ] `ai_service.py` — Gemini transcription, analysis, embeddings, vision check
- [ ] `clustering.py` — Semantic + H3 cluster logic
- [ ] `priority.py` — Priority scoring engine
- [ ] `routers/ingest.py` — POST /ingest
- [ ] `routers/clusters.py` — GET /clusters, GET /clusters/{id}
- [ ] `routers/tickets.py` — PATCH status, POST resolve, POST confirm
- [ ] `routers/public.py` — GET /public/metrics
- [ ] `routers/demo.py` — POST /demo/seed, POST /demo/simulate-reopen
- [ ] `main.py` — FastAPI app + CORS + router mounts
- [ ] Demo mode (cached AI responses) working
- [ ] Backend starts with `uvicorn main:app --reload`
- [ ] `/demo/seed` populates 15 complaints
- [ ] All endpoints return correct schemas

## Frontend

- [ ] Next.js 14 project initialised (`frontend/`)
- [ ] Additional packages installed (leaflet, h3-js, recharts, lucide-react)
- [ ] `lib/api.ts` — typed API client
- [ ] `lib/h3utils.ts` — H3 helpers
- [ ] `components/DemoModeBar.tsx`
- [ ] `components/MapPicker.tsx` — Leaflet click-to-pin
- [ ] `components/ClusterMap.tsx` — Officer workbench map
- [ ] `components/H3HexMap.tsx` — Scorecard hex map
- [ ] `app/layout.tsx` — Root layout + nav
- [ ] `app/page.tsx` — Landing page
- [ ] `app/citizen/page.tsx` — Citizen Simulator (voice + photo + text)
- [ ] `app/officer/page.tsx` — Officer Workbench (split panel)
- [ ] `app/officer/[clusterId]/page.tsx` — Cluster Detail
- [ ] `app/scorecard/page.tsx` — Public Scorecard
- [ ] `.env.local` configured
- [ ] `npm run build` succeeds with zero errors
- [ ] `npm run dev` starts on port 3000

## Bot

- [ ] `bot/telegram_bot.py` — stub with mock flow
- [ ] Mock demo flow logs correctly when no token set

## DevOps

- [ ] `docker-compose.yml` created
- [ ] Backend Dockerfile created
- [ ] Frontend Dockerfile created
- [ ] `docker compose up` starts both services

## Documentation

- [ ] `README.md` — project overview + quick start
- [ ] `DEMO_SCRIPT.md` — step-by-step 3-4 min demo
- [ ] `ROADMAP.md` — future milestones
- [ ] `STATUS.md` — this file

## End-to-End Demo Flow

- [ ] Citizen submits voice complaint → tracking ID shown
- [ ] Cluster forms and appears in officer workbench
- [ ] Officer updates status → "Action Taken"
- [ ] After-photo uploaded + vision check passes
- [ ] Citizen confirms resolution → ticket closes
- [ ] Citizen rejects → ticket reopens
- [ ] Scorecard updates with new metrics
- [ ] H3 hex map shows density correctly

