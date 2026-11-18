# 🗺️ Citizen FTA — Product Roadmap

> Items below are future milestones beyond the current MVP prototype.

---

## Channel Expansion

### 📞 USSD / IVR
- Reach citizens without smartphones using `*BBMP#` USSD shortcodes
- IVR-based complaint filing with DTMF navigation (category selection, ward input)
- Integration with telecom operators (Jio, Airtel, Vi) via USSD gateway APIs

### 🖥️ Civic Kiosks
- Offline-capable kiosk interface deployed at gram panchayat offices and bus stands
- Touch-screen complaint filing with vernacular keyboard
- Sync complaints to central backend when internet is available

### 📱 Native Mobile App
- React Native app for iOS and Android
- Offline-first with background sync
- Push notifications for ticket updates and resolution confirmations

---

## AI & ML Enhancements

### 🎙️ Fine-tuned Indic ASR — AI4Bharat IndicConformer
- Fine-tune [AI4Bharat IndicConformer](https://github.com/AI4Bharat/IndicConformer) on civic domain audio
- Benchmarks: target >92% WER on MUCS 2021 Indic languages (Hindi, Tamil, Kannada, Telugu, Bengali)
- Self-hosted inference to eliminate per-call API costs at scale
- Noise-robust model variants for field recordings (traffic, crowd)

### 🎬 Video Analysis
- Accept short video complaints (< 60s)
- Extract keyframes and run Gemini Vision on temporal sequence
- Detect severity progression across frames

### 🧠 Predictive Spike Alerts
- LSTM / Prophet model on historical complaint time-series
- Predict seasonal spikes (monsoon flooding, Diwali noise) 2 weeks ahead
- Proactive department capacity planning alerts

### 🔍 Officer Performance Insights
- Per-officer resolution time analytics, SLA breach rates, vision check pass rates
- Peer benchmarking dashboard (anonymised)
- Automated escalation triggers for underperforming clusters

---

## Integration & Compliance

### 💬 WhatsApp Template Cost Batching
- Batch citizen notification messages using WhatsApp Business API template messages
- Group update notifications to reduce per-message cost by ~60%
- Fallback to SMS for unregistered WhatsApp numbers

### 🏛️ CPGRAMS Integration
- Two-way sync with Central Public Grievance Redress and Monitoring System (CPGRAMS)
- Auto-escalate unresolved tickets beyond SLA to CPGRAMS portal
- Mapping of internal categories to CPGRAMS taxonomy

### 🔒 DPDP Act Compliance (India Digital Personal Data Protection Act 2023)
- Consent management UI with granular data usage options
- Data principal rights: right to erasure, correction, nomination
- Automated data retention and deletion policy enforcement
- Consent audit log for regulatory reporting

### 🔬 Open Research API
- Anonymised, aggregated complaint dataset exposed as public API for civic researchers
- H3-resolution toggleable (res 5–9) for different analysis granularities
- Rate-limited API keys for NGOs, academic institutions, and journalists
- CC-BY-4.0 licensed dataset snapshots published quarterly

---

## Infrastructure & Scale

| Item | Description |
|------|-------------|
| Multi-city deployment | Config-driven city profiles (ward boundaries, department mappings) |
| Horizontal scaling | Redis queue + Celery workers for ingest pipeline |
| Vector DB | Migrate from SQLite to pgvector/Pinecone for embedding search at scale |
| Observability | OpenTelemetry tracing from ingest to resolution; Grafana dashboards |
| Multi-tenancy | Separate DB schemas per ULB (Urban Local Body) |

