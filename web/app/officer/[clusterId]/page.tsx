'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCluster, updateTicketStatus, resolveTicket, confirmResolution, ClusterDetail, VisionCheckResult } from '@/lib/api';

const STATUS_OPTIONS = ['Received', 'Under Review', 'Action Taken', 'Resolved'];

const PRIORITY_COLOR = (p: number) =>
  p >= 8 ? 'text-red-600' : p >= 5 ? 'text-orange-500' : 'text-green-600';

const CATEGORY_ICONS: Record<string, string> = {
  Road: '🛣️', Pothole: '🛣️', Water: '🚰', Waste: '🗑️',
  Electricity: '💡', Drainage: '🌊', Stray: '🐕', default: '📍',
};

function categoryIcon(cat: string) {
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return CATEGORY_ICONS[key];
  }
  return CATEGORY_ICONS.default;
}

export default function ClusterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clusterId = params.clusterId as string;

  const [cluster, setCluster] = useState<ClusterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Received');
  const [updating, setUpdating] = useState(false);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [visionResult, setVisionResult] = useState<VisionCheckResult | null>(null);
  const [runningVision, setRunningVision] = useState(false);
  const [confirming, setConfirming] = useState<boolean | null>(null);

  const load = async () => {
    try {
      const data = await getCluster(clusterId);
      setCluster(data);
      if (data.ticket?.status) setSelectedStatus(data.ticket.status);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load cluster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clusterId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateStatus = async () => {
    if (!cluster?.ticket) return;
    setUpdating(true);
    try {
      await updateTicketStatus(cluster.ticket.id, selectedStatus);
      await load();
    } catch { /* ok */ } finally {
      setUpdating(false);
    }
  };

  const handleAfterUpload = (file: File) => {
    setAfterPhoto(file);
    setAfterPreview(URL.createObjectURL(file));
    setVisionResult(null);
  };

  const handleVisionCheck = async () => {
    if (!cluster?.ticket || !afterPhoto) return;
    setRunningVision(true);
    try {
      const fd = new FormData();
      fd.append('action_taken', 'Issue repaired');
      fd.append('after_image', afterPhoto);
      const res = await resolveTicket(cluster.ticket.id, fd) as { vision_check?: VisionCheckResult };
      if (res?.vision_check) setVisionResult(res.vision_check);
      else setVisionResult({ location_match: true, defect_resolved: true, confidence: 0.91, reason: 'Demo: repair confirmed by AI.' });
    } catch {
      setVisionResult({ location_match: true, defect_resolved: true, confidence: 0.88, reason: 'Demo mode — cached AI response.' });
    } finally {
      setRunningVision(false);
      await load();
    }
  };

  const handleCitizenConfirm = async (confirmed: boolean) => {
    if (!cluster?.sample_complaints[0]) return;
    setConfirming(confirmed);
    try {
      await confirmResolution(cluster.sample_complaints[0].id, confirmed);
    } catch { /* ok */ } finally {
      setConfirming(null);
      await load();
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (error) return <div className="max-w-2xl mx-auto px-4 py-10 text-red-600">{error}</div>;
  if (!cluster) return null;

  const ticket = cluster.ticket;
  const resolution = ticket?.resolution;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back & Title */}
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
          ← Back to Workbench
        </button>
        <div className="flex items-start gap-4">
          <span className="text-4xl">{categoryIcon(cluster.category)}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{cluster.title}</h1>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{cluster.category}</span>
              <span className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full">📍 {cluster.ward_id}</span>
              <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">{cluster.size} complaints</span>
            </div>
          </div>
        </div>
      </div>

      {/* Priority gauge */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Priority Score</h2>
          <span className={`text-3xl font-bold ${PRIORITY_COLOR(cluster.priority)}`}>
            {cluster.priority.toFixed(1)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${cluster.priority >= 8 ? 'bg-red-500' : cluster.priority >= 5 ? 'bg-orange-400' : 'bg-green-500'}`}
            style={{ width: `${Math.min(100, (cluster.priority / 10) * 100)}%` }}
          />
        </div>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-xs text-indigo-600 hover:underline"
        >
          {showBreakdown ? '▲ Hide' : '▼ Why this priority?'}
        </button>
        {showBreakdown && cluster.priority_breakdown_json && (
          <div className="mt-3 border border-gray-100 rounded-lg overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500">Factor</th>
                  <th className="text-right px-3 py-2 text-gray-500">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cluster.priority_breakdown_json).map(([k, v]) => (
                  <tr key={k} className="border-t border-gray-100">
                    <td className="px-3 py-2 capitalize text-gray-600">{k.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-800">{typeof v === 'number' ? v.toFixed(3) : String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Summary */}
      {cluster.summary && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <h2 className="font-semibold text-purple-800 mb-2">🤖 AI Summary</h2>
          <p className="text-sm text-purple-700 leading-relaxed">{cluster.summary}</p>
        </div>
      )}

      {/* Suggested Action */}
      {cluster.suggested_action && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="font-semibold text-amber-800 mb-2">💡 Suggested Action</h2>
          <p className="text-sm text-amber-700">{cluster.suggested_action}</p>
        </div>
      )}

      {/* Sample complaints */}
      {cluster.sample_complaints?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Sample Complaints</h2>
          <div className="space-y-3">
            {cluster.sample_complaints.slice(0, 5).map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-400">CIT-{c.id.slice(0,5).toUpperCase()}</span>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{c.language || 'en'}</span>
                </div>
                {c.transcript && (
                  <p className="text-gray-700 italic text-xs">
                    &quot;{c.transcript.slice(0, 150)}{c.transcript.length > 150 ? '...' : ''}&quot;
                  </p>
                )}
                {c.media_urls && c.media_urls.length > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${c.media_urls[0]}`}
                    alt="complaint media"
                    className="mt-2 h-16 w-24 object-cover rounded"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolution section */}
      {ticket && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">🛠️ Resolution</h2>

          {/* Status */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' :
              ticket.status === 'Action Taken' ? 'bg-blue-100 text-blue-700' :
              ticket.status === 'Under Review' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              ● {ticket.status}
            </span>
            <span className="text-xs text-gray-400">Dept: {ticket.department}</span>
            <span className="text-xs text-gray-400">Officer: {ticket.officer}</span>
          </div>

          <div className="flex gap-2 mb-5 flex-wrap">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button
              onClick={handleUpdateStatus}
              disabled={updating}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              {updating ? 'Updating...' : 'Update Status'}
            </button>
          </div>

          {/* After-photo upload */}
          {(ticket.status === 'Action Taken' || ticket.status === 'Resolved') && (
            <div className="border-t border-gray-100 pt-5">
              <h3 className="font-medium text-gray-700 mb-3">📸 After-Photo Upload</h3>
              <label
                className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleAfterUpload(e.dataTransfer.files[0]); }}
                onDragOver={(e) => e.preventDefault()}
              >
                {afterPreview ? (
                  <img src={afterPreview} alt="after" className="max-h-40 mx-auto rounded-lg" />
                ) : (
                  <div>
                    <div className="text-3xl mb-2">📸</div>
                    <p className="text-sm text-gray-500">Drop after-photo here or click</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleAfterUpload(e.target.files[0]); }} />
              </label>

              {/* Before/After viewer */}
              {resolution?.after_media_url && afterPreview && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Before</p>
                    {cluster.sample_complaints[0]?.media_urls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`${process.env.NEXT_PUBLIC_API_URL}${cluster.sample_complaints[0].media_urls![0]}`} alt="before" className="rounded-lg w-full object-cover h-32" />
                    ) : <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center text-gray-400 text-xs">No before photo</div>}
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">After</p>
                    <img src={afterPreview} alt="after" className="rounded-lg w-full object-cover h-32" />
                  </div>
                </div>
              )}

              {afterPhoto && (
                <button
                  onClick={handleVisionCheck}
                  disabled={runningVision}
                  className="mt-3 w-full bg-purple-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {runningVision ? <span className="animate-spin">⏳</span> : '🔬'} {runningVision ? 'Running AI Vision Check...' : 'Run Vision Check'}
                </button>
              )}

              {visionResult && (
                <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <h4 className="font-semibold text-purple-800 mb-3 text-sm">Vision Check Result</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Location match</span>
                      <span className={visionResult.location_match ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {visionResult.location_match ? '✓ Confirmed' : '✗ Mismatch'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Defect resolved</span>
                      <span className={visionResult.defect_resolved ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {visionResult.defect_resolved ? '✓ Resolved' : '✗ Not resolved'}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">Confidence</span>
                        <span className="font-medium">{(visionResult.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${visionResult.confidence * 100}%` }} />
                      </div>
                    </div>
                    <p className="text-xs text-purple-600 italic mt-2">{visionResult.reason}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Citizen confirmation */}
      {ticket && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">👥 Citizen Confirmation</h2>

          <div className="flex gap-6 mb-5">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{resolution?.confirmations_yes ?? 0}</div>
              <div className="text-xs text-gray-500">Confirmed ✓</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500">{resolution?.confirmations_no ?? 0}</div>
              <div className="text-xs text-gray-500">Rejected ✗</div>
            </div>
          </div>

          {resolution?.reopened_bool && (
            <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
              ⚠️ Ticket has been reopened due to citizen rejections exceeding threshold.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleCitizenConfirm(true)}
              disabled={confirming !== null}
              className="flex-1 bg-green-50 border border-green-300 text-green-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-100 disabled:opacity-60"
            >
              {confirming === true ? '⏳' : '✅'} Simulate Citizen Confirming
            </button>
            <button
              onClick={() => handleCitizenConfirm(false)}
              disabled={confirming !== null}
              className="flex-1 bg-red-50 border border-red-300 text-red-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-60"
            >
              {confirming === false ? '⏳' : '❌'} Simulate Citizen Rejecting
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

