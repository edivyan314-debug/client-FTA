'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  getPublicMetrics,
  PublicMetricsResponse,
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

  useEffect(() => {
    getPublicMetrics()
      .then(setMetrics)
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading public metrics...
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center text-gray-400">
        <div className="text-5xl mb-3">📊</div>
        <p>No metrics available. Seed demo data first from the Officer Workbench.</p>
      </div>
    );
  }

  const topCategories = [...(metrics.categories || [])]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  const deptData = [...(metrics.departments || [])].sort(
    (a, b) => b.resolution_pct - a.resolution_pct
  );

  const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-1">📊 Public Scorecard</h1>
        <p className="text-sm text-gray-500">
          Real-time civic issue resolution metrics — anonymised, aggregated by H3 hex grid.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📋" label="Total Complaints" value={metrics.total_complaints} />
        <StatCard
          icon="✅"
          label="Resolution Rate"
          value={`${(metrics.resolution_rate * 100).toFixed(0)}%`}
        />
        <StatCard
          icon="⏱️"
          label="Median Resolution"
          value={
            metrics.median_resolution_hours
              ? `${metrics.median_resolution_hours.toFixed(1)}h`
              : '—'
          }
        />
        <StatCard icon="🗂️" label="Active Clusters" value={metrics.active_clusters} />
      </div>

      {/* H3 Hex Map */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">🗺️ Complaint Density Map</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Click a hex cell for details. Colors: green (low) → yellow → red (high density).
          </p>
        </div>
        <div style={{ height: 400 }}>
          <H3HexMap cells={metrics.h3_cells || []} />
        </div>
        {/* Legend */}
        <div className="p-3 flex items-center gap-3 text-xs text-gray-500 border-t border-gray-100">
          <span>Low</span>
          <div className="flex gap-0.5">
            {['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'].map((c) => (
              <div key={c} className="w-6 h-3 rounded" style={{ background: c }} />
            ))}
          </div>
          <span>High</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top categories */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Top 5 Categories by Volume</h2>
          {topCategories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topCategories} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
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
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => typeof v === 'number' ? `${(v * 100).toFixed(0)}%` : v} />
                <Bar dataKey="resolution_pct" radius={[0, 4, 4, 0]}>
                  {deptData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.resolution_pct >= 0.7
                          ? '#22c55e'
                          : d.resolution_pct >= 0.4
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
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Department Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Department', 'Volume', 'Resolved', 'Resolution %', 'Median Hours'].map(
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
                        className={`font-semibold ${
                          d.resolution_pct >= 0.7
                            ? 'text-green-600'
                            : d.resolution_pct >= 0.4
                            ? 'text-orange-500'
                            : 'text-red-500'
                        }`}
                      >
                        {(d.resolution_pct * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.median_resolution_hours ? `${d.median_resolution_hours.toFixed(1)}h` : '—'}
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
        Data is aggregated by H3 hexagonal grid (res 8, ~0.74 km² per cell). Exact locations are
        never shown.
      </p>
    </div>
  );
}
