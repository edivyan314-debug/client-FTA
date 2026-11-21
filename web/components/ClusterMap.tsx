'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ClusterListItem } from '@/lib/api';
import { h3ToLatLng } from '@/lib/h3utils';

interface ClusterMapProps {
  clusters: ClusterListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function priorityMarkerColor(p: number) {
  if (p >= 8) return '#ef4444';
  if (p >= 5) return '#f97316';
  return '#22c55e';
}

export default function ClusterMap({ clusters, selectedId, onSelect }: ClusterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

    const googleRoadmap = L.tileLayer(
      `https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}${googleKey ? `&key=${googleKey}` : ''}`,
      {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 21,
        attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
      }
    );

    const googleHybrid = L.tileLayer(
      `https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}${googleKey ? `&key=${googleKey}` : ''}`,
      {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 21,
        attribution: '&copy; <a href="https://maps.google.com">Google Maps Satellite</a>',
      }
    );

    const cartoVoyager = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }
    );

    const map = L.map(containerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      layers: [googleRoadmap],
    });

    L.control.layers({
      'Google Maps (Roadmap)': googleRoadmap,
      'Google Maps (Satellite)': googleHybrid,
      'CARTO Voyager': cartoVoyager,
    }).addTo(map);

    mapRef.current = map;

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

    const currentIds = new Set(clusters.map((c) => c.id));
    markersRef.current.forEach((m, id) => {
      if (!currentIds.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    });

    clusters.forEach((c) => {
      let lat = c.lat ?? 12.9716;
      let lng = c.lng ?? 77.5946;

      if (c.h3_cell) {
        try {
          const [h3lat, h3lng] = h3ToLatLng(c.h3_cell);
          lat = h3lat;
          lng = h3lng;
        } catch {
          /* use fallback */
        }
      }

      const color = priorityMarkerColor(c.priority);
      const isSelected = c.id === selectedId;

      if (markersRef.current.has(c.id)) {
        const m = markersRef.current.get(c.id)!;
        m.setStyle({
          color,
          fillColor: color,
          weight: isSelected ? 3 : 1.5,
          radius: isSelected ? 18 : 12,
        });
      } else {
        const m = L.circleMarker([lat, lng], {
          radius: isSelected ? 18 : 12,
          fillColor: color,
          color: color,
          weight: isSelected ? 3 : 1.5,
          opacity: 0.9,
          fillOpacity: 0.5,
        }).addTo(map);

        m.bindPopup(`
          <div style="min-width:180px;font-family:sans-serif">
            <b style="font-size:13px">${c.title}</b><br/>
            <span style="color:#6b7280;font-size:11px">${c.category} · ${c.ward_id}</span><br/>
            <span style="font-size:11px">Priority: <b style="color:${color}">${c.priority.toFixed(1)}</b> · ${c.size} complaints</span><br/>
            <a href="/officer/${c.id}" style="font-size:11px;color:#4f46e5;font-weight:600;display:inline-block;margin-top:4px">View details →</a>
          </div>
        `);
        m.on('click', () => {
          onSelect(c.id);
        });
        markersRef.current.set(c.id, m);
      }
    });
  }, [clusters, selectedId, onSelect]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
