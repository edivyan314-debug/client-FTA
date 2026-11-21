'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
  lat: number;
  lng: number;
  onSelect: (lat: number, lng: number) => void;
}

export default function MapPicker({ lat, lng, onSelect }: MapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Fix Leaflet default icon path in Next.js
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

    // Google Maps Layers
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

    const googleTerrain = L.tileLayer(
      `https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}${googleKey ? `&key=${googleKey}` : ''}`,
      {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 20,
        attribution: '&copy; <a href="https://maps.google.com">Google Maps Terrain</a>',
      }
    );

    // CARTO Fallback
    const cartoVoyager = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      }
    );

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 14,
      layers: [googleRoadmap],
    });

    L.control.layers({
      'Google Maps (Roadmap)': googleRoadmap,
      'Google Maps (Satellite Hybrid)': googleHybrid,
      'Google Maps (Terrain)': googleTerrain,
      'CARTO Voyager': cartoVoyager,
    }).addTo(map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      onSelect(p.lat, p.lng);
    });
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onSelect(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, onSelect]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
