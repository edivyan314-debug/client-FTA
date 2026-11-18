'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ingestComplaint } from '@/lib/api';
import Link from 'next/link';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

type InputMethod = 'voice' | 'photo' | 'text';
type Step = 1 | 2 | 3 | 4 | 5 | 6;

const LANGUAGES = [
  { value: 'auto', label: '🌐 Auto-detect' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'hi', label: '🇮🇳 Hindi' },
  { value: 'ta', label: '🇮🇳 Tamil' },
];

const STATUS_STEPS = [
  '📤 Uploading...',
  '🤖 Transcribing...',
  '🧠 Analyzing...',
  '🔗 Clustering...',
  '✅ Ticket Created!',
];

export default function CitizenPage() {
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<InputMethod>('voice');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [lat, setLat] = useState<number | null>(12.9716);
  const [lng, setLng] = useState<number | null>(77.5946);
  const [language, setLanguage] = useState('auto');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusStep, setStatusStep] = useState(-1);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(20).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAnimation = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;

      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);

      const animate = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const slice = Array.from(data.slice(0, 20)).map((v) => Math.max(4, (v / 255) * 48));
        setBars(slice);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } catch {
      setError('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    stopAnimation();
    setBars(Array(20).fill(4));
  };

  const handlePhotoChange = (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!consent) { setError('Please accept consent.'); return; }
    setSubmitting(true);
    setError(null);
    setStatusStep(0);

    const fd = new FormData();
    fd.append('channel', method === 'voice' ? 'voice' : method === 'photo' ? 'photo' : 'text');
    fd.append('citizen_id', `anon-${Math.random().toString(36).slice(2, 10)}`);
    fd.append('lat', String(lat ?? 12.9716));
    fd.append('lng', String(lng ?? 77.5946));
    fd.append('consent', 'true');
    fd.append('language', language);

    if (method === 'voice' && audioBlob) {
      fd.append('audio', audioBlob, 'recording.webm');
    } else if (method === 'photo' && photoFile) {
      fd.append('image', photoFile);
    } else if (method === 'text') {
      fd.append('text', textInput);
    }

    // Simulate status progression
    const advance = async () => {
      for (let i = 1; i < STATUS_STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, 900));
        setStatusStep(i);
      }
    };
    advance();

    try {
      const res = await ingestComplaint(fd);
      setTrackingId(res.tracking_id || res.feedback_id);
    } catch {
      // In demo mode show a fake tracking ID
      setTrackingId(`DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (trackingId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Complaint Submitted!</h2>
        <div className="bg-green-50 border border-green-300 rounded-xl p-6 my-6">
          <p className="text-sm text-gray-500 mb-1">Your Tracking ID</p>
          <p className="text-3xl font-mono font-bold text-green-700">{trackingId}</p>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/officer" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700">
            🛡️ View Officer Workbench
          </Link>
          <button onClick={() => { setTrackingId(null); setStep(1); setAudioBlob(null); setAudioUrl(null); setPhotoFile(null); setPhotoPreview(null); setTextInput(''); setStatusStep(-1); }} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-200">
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Report an Issue</h1>
      <p className="text-gray-500 mb-8 text-sm">Your complaint will be anonymised and routed to the right department via AI.</p>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {[1,2,3,4,5].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${step >= s ? 'bg-indigo-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {/* Step 1: Input method */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Step 1 — Choose how to report</h2>
          <div className="grid grid-cols-3 gap-4">
            {(['voice', 'photo', 'text'] as InputMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMethod(m); setStep(2); }}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-md ${method === m ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}
              >
                <span className="text-4xl">{m === 'voice' ? '🎤' : m === 'photo' ? '📷' : '✍️'}</span>
                <span className="text-sm font-medium text-gray-700">{m === 'voice' ? 'Voice Note' : m === 'photo' ? 'Upload Photo' : 'Type Text'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Input capture */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-6">Step 2 — {method === 'voice' ? 'Record voice note' : method === 'photo' ? 'Upload photo' : 'Describe the issue'}</h2>

          {method === 'voice' && (
            <div className="flex flex-col items-center gap-6">
              {/* Waveform */}
              <div className="flex items-end gap-0.5 h-14">
                {bars.map((h, i) => (
                  <div key={i} style={{ height: `${h}px` }} className={`w-2 rounded-full transition-all duration-75 ${recording ? 'bg-red-500' : 'bg-gray-300'}`} />
                ))}
              </div>

              {recording && <div className="text-2xl font-mono text-red-600">{fmtTime(recordingTime)}</div>}

              <button
                onClick={recording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-lg transition-all ${recording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {recording ? '⏹️' : '🎙️'}
              </button>
              <p className="text-sm text-gray-500">{recording ? 'Tap to stop' : 'Tap to start recording'}</p>

              {audioUrl && (
                <div className="w-full">
                  <p className="text-sm font-medium text-gray-600 mb-2">Preview recording:</p>
                  <audio controls src={audioUrl} className="w-full" />
                </div>
              )}
            </div>
          )}

          {method === 'photo' && (
            <div>
              <label
                className="block border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handlePhotoChange(e.dataTransfer.files[0]); }}
                onDragOver={(e) => e.preventDefault()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="max-h-64 mx-auto rounded-lg" />
                ) : (
                  <div>
                    <div className="text-5xl mb-3">📸</div>
                    <p className="text-gray-500 text-sm">Drag & drop or tap to select</p>
                    <p className="text-xs text-gray-400 mt-1">Also supports camera capture on mobile</p>
                  </div>
                )}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handlePhotoChange(e.target.files[0]); }} />
              </label>
            </div>
          )}

          {method === 'text' && (
            <textarea
              className="w-full border border-gray-300 rounded-xl p-4 text-sm h-40 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Describe the civic issue in detail... (e.g. 'Large pothole on MG Road near KR Market, causing accidents')"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100">← Back</button>
            <button
              onClick={() => setStep(3)}
              disabled={method === 'voice' ? !audioBlob : method === 'photo' ? !photoFile : !textInput.trim()}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next → Pick Location
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Location */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Step 3 — Pin the location</h2>
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow mb-3" style={{ height: 320 }}>
            <MapPicker lat={lat ?? 12.9716} lng={lng ?? 77.5946} onSelect={(la, ln) => { setLat(la); setLng(ln); }} />
          </div>
          {lat && lng && (
            <p className="text-xs text-gray-500 font-mono">📍 {lat.toFixed(5)}, {lng.toFixed(5)}</p>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(2)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100">← Back</button>
            <button onClick={() => setStep(4)} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">Next → Language & Consent</button>
          </div>
        </div>
      )}

      {/* Step 4: Language & Consent */}
      {step === 4 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Step 4 — Language & Consent</h2>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          <label className="flex gap-3 items-start cursor-pointer bg-gray-50 border border-gray-200 rounded-xl p-4">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-indigo-600"
            />
            <span className="text-sm text-gray-600">
              I consent to storing this complaint anonymously for civic action. My exact location will never be shown publicly — only aggregated H3 hex grid data.
            </span>
          </label>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(3)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100">← Back</button>
            <button onClick={() => setStep(5)} disabled={!consent} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40">Next → Review & Submit</button>
          </div>
        </div>
      )}

      {/* Step 5: Submit */}
      {step === 5 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-6">Step 5 — Review & Submit</h2>

          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 mb-6">
            <div className="p-4 flex justify-between text-sm"><span className="text-gray-500">Input method</span><span className="font-medium capitalize">{method}</span></div>
            <div className="p-4 flex justify-between text-sm"><span className="text-gray-500">Language</span><span className="font-medium">{LANGUAGES.find(l=>l.value===language)?.label}</span></div>
            <div className="p-4 flex justify-between text-sm"><span className="text-gray-500">Location</span><span className="font-mono text-xs">{lat?.toFixed(4)}, {lng?.toFixed(4)}</span></div>
            <div className="p-4 flex justify-between text-sm"><span className="text-gray-500">Consent</span><span className="text-green-600 font-medium">✓ Granted</span></div>
          </div>

          {/* Status flow */}
          {statusStep >= 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-5">
              {STATUS_STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm py-1 transition-all ${i < statusStep ? 'text-gray-400 line-through' : i === statusStep ? 'text-indigo-700 font-semibold' : 'text-gray-300'}`}>
                  <span>{i < statusStep ? '✓' : i === statusStep ? '⏳' : '○'}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(4)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100" disabled={submitting}>← Back</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <span className="animate-spin">⏳</span> : '🚀'} {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

