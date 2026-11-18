'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  getPublicMetrics,
  PublicMetricsResponse,
  seedDemo,
} from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const H3HexMap = dynamic(() => import('@/components/H3HexMap'), { ssr: false });

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 text-center">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export default function ScorecardPage() {
  const [metrics, setMetrics] = useState<PublicMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadData = () => {
    setLoading(true);
    getPublicMetrics()
      .then(setMetrics)
      .catch((err) => {
        console.error('Failed to load metrics:', err);
        setMetrics(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemo();
      loadData();
    } catch (e) {
      console.error('Seed failed:', e);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 text-sm gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span>Loading public metrics...</span>
      </div>
    );
  }

  const anyMetrics = metrics as any;

  const totalComplaints = metrics?.total_complaints ?? anyMetrics?.summary?.total_volume ?? 0;
  const rawRate = metrics?.resolution_rate ?? (anyMetrics?.summary?.resolution_pct ? anyMetrics.summary.resolution_pct / 100 : 0);
  const resolutionRateDisplay = (rawRate > 1 ? rawRate : rawRate * 100).toFixed(0);
  const medianHours = metrics?.median_resolution_hours ?? anyMetrics?.summary?.median_resolution_hours;
  const activeClusters = metrics?.active_clusters ?? 0;
  const h3Cells = metrics?.h3_cells || anyMetrics?.hexes || [];

  const rawCategories = (metrics?.categories || anyMetrics?.summary?.top_categories || []) as any[];
  const topCategories = rawCategories.map((c) => ({
    category: c.category,
    volume: c.volume ?? c.count ?? 0,
  })).sort((a, b) => b.volume - a.volume).slice(0, 5);

  const deptData = ((metrics?.departments || []) as any[]).map((d) => {
    const dec = d.resolution_pct > 1 ? d.resolution_pct / 100 : d.resolution_pct;
    return {
      ...d,
      pct_decimal: dec,
      pct_display: (dec * 100).toFixed(0),
    };
  }).sort((a, b) => b.pct_decimal - a.pct_decimal);

  const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">📊 Public Scorecard</h1>
          <p className="text-sm text-gray-500">
            Real-time civic issue resolution metrics — anonymised, aggregated by H3 hex grid.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            🔄 Refresh
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50"
          >
            {seeding ? 'Seeding...' : '🌱 Seed Demo Data'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📋" label="Total Complaints" value={totalComplaints.toLocaleString()} />
        <StatCard
          icon="✅"
          label="Resolution Rate"
          value={`${resolutionRateDisplay}%`}
        />
        <StatCard
          icon="⏱️"
          label="Median Resolution"
          value={medianHours ? `${Number(medianHours).toFixed(1)}h` : '—'}
        />
        <StatCard icon="🗂️" label="Active Clusters" value={activeClusters} />
      </div>

      {/* H3 Hex Map */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-700">🗺️ Civic Defect Heatmap (H3 Res 8)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Hexagons represent ~0.74 km² areas. Switch layers on top-right (Voyager, Positron, Satellite).
            </p>
          </div>
          <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
            {h3Cells.length} Active Hexes
          </span>
        </div>
        <div style={{ height: 440 }}>
          <H3HexMap cells={h3Cells} />
        </div>
        {/* Legend */}
        <div className="p-3 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <span>Complaint Density:</span>
            <span className="text-gray-400">Low</span>
            <div className="flex gap-1">
              {['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'].map((c) => (
                <div key={c} className="w-6 h-3 rounded" style={{ background: c }} />
              ))}
            </div>
            <span className="text-gray-400">High</span>
          </div>
          <span className="text-gray-400 text-[11px]">Powered by H3 + CARTO Engine</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top categories */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Top Recurring Issues by Volume</h2>
          {topCategories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topCategories} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => [`${v} complaints`, 'Volume']} />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                  {topCategories.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Department resolution */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Department Resolution Rates</h2>
          {deptData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={(v) => typeof v === 'number' ? `${(v * 100).toFixed(0)}%` : v} />
                <Bar dataKey="pct_decimal" radius={[0, 4, 4, 0]}>
                  {deptData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.pct_decimal >= 0.7
                          ? '#22c55e'
                          : d.pct_decimal >= 0.4
                          ? '#f97316'
                          : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Department data table */}
      {deptData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Department Performance Breakdown</h2>
            <span className="text-xs text-gray-400">{deptData.length} Departments Tracked</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Department', 'Total Volume', 'Resolved', 'Resolution Rate', 'Median SLA (Hours)'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deptData.map((d) => (
                  <tr key={d.department} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{d.department}</td>
                    <td className="px-4 py-3 text-gray-600">{d.volume}</td>
                    <td className="px-4 py-3 text-gray-600">{d.resolved}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          d.pct_decimal >= 0.7
                            ? 'bg-green-100 text-green-800'
                            : d.pct_decimal >= 0.4
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {d.pct_display}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.median_resolution_hours ? `${Number(d.median_resolution_hours).toFixed(1)}h` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 pb-4">
        Privacy Protected: Data is aggregated strictly by H3 hexagonal bins (res 8, ~0.74 km² per cell).
        Exact citizen GPS coordinates and identities are never stored or exposed publicly.
      </p>
    </div>
  );
}
