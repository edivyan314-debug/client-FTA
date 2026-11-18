# 🎭 Demo Script — Citizen FTA

> **Target duration:** 3–4 minutes  
> **Prerequisites:** Backend on `http://localhost:8000`, frontend on `http://localhost:3000`, DEMO_MODE=true

---

## Pre-demo Setup (30 seconds before)

1. Open two browser tabs: `http://localhost:3000/officer` and `http://localhost:3000/citizen`
2. Open terminal with backend logs visible
3. Click **"Seed Data"** button on Officer page → wait for clusters to appear

---

## Step 1 — Empty Dashboard (0:00–0:20)

**URL:** `http://localhost:3000`

- Point to the hero stats: "Zero complaints, zero clusters — a clean slate"
- Click **"Seed Data"** if not already done
- Navigate to Scorecard: `http://localhost:3000/scorecard`
- Show the H3 hex map: "Every complaint is aggregated to ~0.74 km² hexagons — no exact GPS ever stored"

---

## Step 2 — Citizen Simulator (0:20–1:00)

**URL:** `http://localhost:3000/citizen`

**Voice note submission:**
1. Click **🎤 Voice Note** tile
2. Tap the red record button
3. Speak: *"There is a large pothole on MG Road near the KR Market junction. It has caused two accidents this week."*
4. Tap stop — waveform animates during recording
5. Play back the recording
6. Click **Next → Pick Location**

**Location:**
7. The map opens centred on Bengaluru
8. Click on MG Road area to drop pin
9. Show lat/lng below map — *"Precise GPS is captured only for routing, never displayed publicly"*
10. Click **Next → Language & Consent**

**Consent:**
11. Language: *Auto-detect* (Hindi example: speak in Hindi)
12. Check consent checkbox — read it aloud
13. Click **Next → Review & Submit**

**Submission:**
14. Click **🚀 Submit Complaint**
15. Watch the status bar progress: 📤 Uploading → 🤖 Transcribing → 🧠 Analyzing → 🔗 Clustering → ✅ Ticket Created!
16. Tracking ID appears in green box: *"Citizens can follow up with this ID"*

---

## Step 3 — Cluster Forming (1:00–1:30)

**URL:** `http://localhost:3000/officer`

1. Switch to Officer Workbench tab (auto-refreshed every 5s)
2. Show the cluster list — priority score highlighted in red if >8
3. Click the highest-priority cluster (Road/Pothole cluster)
4. Point to the **Priority Score gauge** — *"8.3 — urgency × ln(size) × vulnerability × decay"*
5. Expand **"Why this priority?"** table: show breakdown rows

---

## Step 4 — Officer Acts (1:30–2:30)

**URL:** `http://localhost:3000/officer/[clusterId]`

1. Read the **AI Summary**: *"Multiple citizens reported severe road damage on MG Road..."*
2. Show **Sample Complaints** — anonymised IDs (CIT-XXXXX), language labels, transcript excerpts
3. Read **Suggested Action**: *"Immediate patching by BBMP Roads department within 48h"*
4. Change status dropdown to **"Action Taken"** → click **Update Status**
5. Watch status badge turn blue

**After-photo upload:**
6. Drag and drop a photo of a repaired road
7. Click **🔬 Run Vision Check**
8. Wait 1–2 seconds (cached in DEMO_MODE)
9. Result appears: ✓ Location match, ✓ Defect resolved, 91% confidence
10. *"Gemini Flash compared before/after and confirmed the repair — zero manual review needed"*

---

## Step 5 — Citizen Rejects (2:30–3:00)

1. Scroll to **Citizen Confirmation** section
2. Click **❌ Simulate Citizen Rejecting** × 3
3. Show rejection counter increasing
4. Watch the **⚠️ Reopened** alert appear — *"25% rejection threshold triggers automatic reopen"*
5. Status badge reverts — cluster resurfaces in officer workbench

---

## Step 6 — Citizen Confirms & Closes (3:00–3:30)

1. Click **✅ Simulate Citizen Confirming** × 2
2. Confirmation counter passes threshold
3. Update status to **Resolved**
4. Navigate to Scorecard: `http://localhost:3000/scorecard`
5. Resolution rate ticks up — hex cell changes colour from red toward green

---

## Closing (3:30–4:00)

> *"In 3.5 minutes we went from a voice complaint in Hindi to a verified, citizen-confirmed repair — with full audit trail, geospatial aggregation, and zero manual triage. This is what AI-powered civic infrastructure looks like."*

Point to Roadmap (`ROADMAP.md`): WhatsApp, USSD, Indic ASR fine-tuning, CPGRAMS integration.

