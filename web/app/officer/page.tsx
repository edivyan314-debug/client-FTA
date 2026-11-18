'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { getClusters, ClusterListItem, seedDemo } from '@/lib/api';

const ClusterMap = dynamic(() => import('@/components/ClusterMap'), { ssr: false });

const CATEGORY_ICONS: Record<string, string> = {
  Road: '🛣️', Pothole: '🛣️', Water: '🚰', Waste: '🗑️',
  Electricity: '💡', Drainage: '🌊', Stray: '🐕',
  default: '📍',
};

function categoryIcon(cat: string) {
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return CATEGORY_ICONS[key];
  }
  return CATEGORY_ICONS.default;
}

function priorityColor(p: number) {
  if (p >= 8) return { text: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300' };
  if (p >= 5) return { text: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-300' };
  return { text: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300' };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_FILTERS = ['All', 'open', 'in_progress', 'resolved'];
const CATEGORY_FILTERS = ['All Categories', 'Road', 'Water', 'Waste', 'Electricity', 'Drainage'];

export default function OfficerPage() {
  const [clusters, setClusters] = useState<ClusterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getClusters();
      setClusters(data);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try { await seedDemo(); } catch { /* ok */ }
    await load();
    setSeeding(false);
  };

  const filtered = clusters.filter((c) => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (categoryFilter !== 'All Categories' && !c.category.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-4rem-3.5rem)] overflow-hidden">
      {/* Left panel */}
      <div className="w-[42%] border-r border-gray-200 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Officer Workbench</h1>
            <p className="text-xs text-gray-400">Auto-refreshes every 5s</p>
          </div>
          <div className="flex gap-2">
            {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">🎭 DEMO</span>
            )}
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              {seeding ? '⏳ Seeding...' : '🌱 Seed Data'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 border-b border-gray-100 flex gap-2 flex-wrap">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none">
            {CATEGORY_FILTERS.map((f) => <option key={f}>{f}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none">
            {STATUS_FILTERS.map((f) => <option key={f}>{f}</option>)}
          </select>
          <span className="text-xs text-gray-400 self-center ml-auto">{filtered.length} clusters</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading clusters...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              <div className="text-4xl mb-3">📭</div>
              <p>No clusters yet.</p>
              <p className="text-xs mt-1">Click &quot;Seed Data&quot; to populate demo data.</p>
            </div>
          ) : (
            filtered
              .sort((a, b) => b.priority - a.priority)
              .map((c) => {
                const pc = priorityColor(c.priority);
                return (
                  <Link
                    key={c.id}
                    href={`/officer/${c.id}`}
                    className={`block p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected === c.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
                    onClick={() => setSelected(c.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{categoryIcon(c.category)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${pc.text} ${pc.bg} ${pc.border}`}>
                            {c.priority.toFixed(1)}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c.size} complaints</span>
                          <span className="text-xs text-gray-400 ml-auto">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-gray-500">📍 {c.ward_id}</span>
                          <span className={`text-xs capitalize ${c.status === 'open' ? 'text-red-500' : c.status === 'resolved' ? 'text-green-500' : 'text-orange-500'}`}>● {c.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
          )}
        </div>
      </div>

      {/* Right panel: Map */}
      <div className="flex-1 relative">
        <ClusterMap clusters={filtered} selectedId={selected} onSelect={setSelected} />
      </div>
    </div>
  );
}

