'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { H3CellMetrics } from '@/lib/api';
import { getH3Boundary } from '@/lib/h3utils';

interface H3HexMapProps {
  cells: H3CellMetrics[];
}

function densityColor(pct: number): string {
  if (pct < 0.2) return '#22c55e';
  if (pct < 0.4) return '#84cc16';
  if (pct < 0.6) return '#eab308';
  if (pct < 0.8) return '#f97316';
  return '#ef4444';
}

export default function H3HexMap({ cells }: H3HexMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([12.9716, 77.5946], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) { layerRef.current.remove(); layerRef.current = null; }
    if (!cells.length) return;

    const maxVol = Math.max(...cells.map((c) => c.volume), 1);

    const features = cells
      .map((cell) => {
        try {
          const boundary = getH3Boundary(cell.h3_cell);
          const coords = boundary.map(([lat, lng]) => [lng, lat]);
          coords.push(coords[0]); // close ring
          return {
            type: 'Feature' as const,
            properties: {
              h3_cell: cell.h3_cell,
              volume: cell.volume,
              resolved: cell.resolved,
              resolution_pct: cell.resolution_pct,
              pct: cell.volume / maxVol,
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [coords],
            },
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const layer = L.geoJSON(
      { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection,
      {
        style: (feature) => {
          const pct = feature?.properties?.pct ?? 0;
          return {
            fillColor: densityColor(pct),
            fillOpacity: 0.6,
            color: '#fff',
            weight: 1,
          };
        },
        onEachFeature: (feature, l) => {
          const p = feature.properties;
          l.bindPopup(`
            <div style="font-size:12px;min-width:160px">
              <b style="font-size:13px">H3 Cell</b><br/>
              <span style="color:#6b7280;font-size:10px">${p.h3_cell}</span><br/>
              Volume: <b>${p.volume}</b><br/>
              Resolved: <b>${p.resolved}</b><br/>
              Resolution: <b>${(p.resolution_pct * 100).toFixed(0)}%</b>
            </div>
          `);
        },
      }
    ).addTo(map);

    layerRef.current = layer;

    if (cells.length > 0) {
      try {
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      } catch { /* ok */ }
    }
  }, [cells]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
