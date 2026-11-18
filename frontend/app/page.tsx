'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicMetrics, PublicMetricsResponse } from '@/lib/api';

const features = [
  {
    icon: '🗣️',
    title: 'Citizens Report',
    description:
      'Submit complaints via voice note, photo, or text in any language. AI transcribes, translates, and categorises instantly.',
    color: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
  },
  {
    icon: '🤖',
    title: 'AI Clusters',
    description:
      'Semantic clustering groups similar issues. Priority scores factor urgency, density, vulnerable populations, and time decay.',
    color: 'bg-purple-50 border-purple-200',
    iconBg: 'bg-purple-100',
  },
  {
    icon: '🛡️',
    title: 'Officers Act',
    description:
      'Officers see ranked clusters, upload before/after photos, and AI vision-checks resolutions. Citizens confirm closure.',
    color: 'bg-green-50 border-green-200',
    iconBg: 'bg-green-100',
  },
];

export default function HomePage() {
  const [metrics, setMetrics] = useState<PublicMetricsResponse | null>(null);

  useEffect(() => {
    getPublicMetrics()
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Hero */}
      <section className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <span>🚀</span> Prototype v1 — DEMO MODE
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          AI-Powered Civic<br />
          <span className="text-indigo-600">Grievance Resolution</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
          From a citizen&apos;s voice note to an officer&apos;s action — in minutes, not months.
          Powered by Gemini AI, H3 geospatial clustering, and multilingual NLP.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/citizen"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow"
          >
            📝 Report an Issue
          </Link>
          <Link
            href="/scorecard"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 border border-indigo-300 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors shadow"
          >
            📊 View Scorecard
          </Link>
        </div>
      </section>

      {/* Stats */}
      {metrics && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { label: 'Total Complaints', value: metrics.total_complaints, icon: '📋' },
            {
              label: 'Resolution Rate',
              value: `${(metrics.resolution_rate * 100).toFixed(0)}%`,
              icon: '✅',
            },
            {
              label: 'Median Resolution',
              value: metrics.median_resolution_hours
                ? `${metrics.median_resolution_hours.toFixed(1)}h`
                : '—',
              icon: '⏱️',
            },
            { label: 'Active Clusters', value: metrics.active_clusters, icon: '🗂️' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center"
            >
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </section>
      )}

      {/* Feature cards */}
      <section className="grid md:grid-cols-3 gap-6 mb-16">
        {features.map((f) => (
          <div
            key={f.title}
            className={`rounded-xl border p-6 ${f.color} flex flex-col gap-3`}
          >
            <div className={`w-12 h-12 ${f.iconBg} rounded-lg flex items-center justify-center text-2xl`}>
              {f.icon}
            </div>
            <h3 className="text-lg font-bold text-gray-800">{f.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{f.description}</p>
          </div>
        ))}
      </section>

      {/* Demo CTA */}
      <section className="bg-indigo-600 rounded-2xl p-10 text-center text-white">
        <h2 className="text-3xl font-bold mb-3">See it in action</h2>
        <p className="text-indigo-200 mb-6 max-w-xl mx-auto">
          DEMO MODE is active. No API keys required. All AI responses are cached.
          Seed sample data and walk through the full loop in 3 minutes.
        </p>
        <Link
          href="/officer"
          className="inline-flex items-center gap-2 bg-white text-indigo-700 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
        >
          🛡️ Open Officer Workbench
        </Link>
      </section>
    </div>
  );
}
