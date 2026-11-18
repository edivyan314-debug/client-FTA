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

    // Use CARTO Positron as high-performance modern civic basemap
    const positron = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }
    );

    const voyager = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }
    );

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
      }
    );

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    const map = L.map(containerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 11,
      layers: [positron],
    });

    L.control.layers({
      'CARTO Positron (Clean)': positron,
      'CARTO Voyager (Detailed)': voyager,
      'Satellite (Esri)': satellite,
      'OpenStreetMap': osm,
    }).addTo(map);

    mapRef.current = map;

    // Invalidate size once DOM has fully rendered
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
    if (!cells || !cells.length) return;

    const maxVol = Math.max(...cells.map((c) => c.volume || 1), 1);

    const features = cells
      .map((cell) => {
        try {
          const boundary = getH3Boundary(cell.h3_cell);
          if (!boundary || !boundary.length) return null;
          const coords = boundary.map(([lat, lng]) => [lng, lat]);
          coords.push(coords[0]); // close polygon ring
          const resRate = cell.resolution_pct > 1 ? cell.resolution_pct / 100 : cell.resolution_pct;
          return {
            type: 'Feature' as const,
            properties: {
              h3_cell: cell.h3_cell,
              volume: cell.volume,
              resolved: cell.resolved,
              resolution_pct: resRate,
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
            fillOpacity: 0.65,
            color: '#ffffff',
            weight: 1.5,
          };
        },
        onEachFeature: (feature, l) => {
          const p = feature.properties;
          l.bindPopup(`
            <div style="font-size:12px;min-width:180px;font-family:sans-serif;line-height:1.4">
              <div style="font-weight:700;font-size:13px;margin-bottom:4px">H3 Hex Cell</div>
              <div style="color:#6b7280;font-size:11px;word-break:break-all;margin-bottom:6px"><code>${p.h3_cell}</code></div>
              <div style="display:flex;justify-content:space-between"><span>Complaints:</span><b>${p.volume}</b></div>
              <div style="display:flex;justify-content:space-between"><span>Resolved:</span><b>${p.resolved}</b></div>
              <div style="display:flex;justify-content:space-between"><span>Resolution Rate:</span><b>${(p.resolution_pct * 100).toFixed(0)}%</b></div>
            </div>
          `);
        },
      }
    ).addTo(map);

    layerRef.current = layer;

    if (features.length > 0) {
      try {
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      } catch {
        /* ok */
      }
    }
  }, [cells]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
