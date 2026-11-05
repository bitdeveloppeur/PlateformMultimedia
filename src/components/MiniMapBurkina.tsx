'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapCoords } from '@/types/stage';

interface MiniMapBurkinaProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  targetCoords?: MapCoords;
}

export default function MiniMapBurkina({ 
  latitude = 12.3, 
  longitude = -1.5, 
  zoom = 6,
  targetCoords 
}: MiniMapBurkinaProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const rotating = useRef(true);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
          'terrain': {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            tileSize: 256,
            encoding: 'terrarium',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#1a2a3a',
            },
          },
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            maxzoom: 22,
            paint: {
              'raster-opacity': 0.7,
            },
          },
        ],
        terrain: {
          source: 'terrain',
          exaggeration: 1.5,
        },
      },
      center: [longitude, latitude],
      zoom: zoom,
      pitch: 60,
      bearing: -20,
      interactive: true,
      attributionControl: false,
    });

    // Ajouter un marqueur pour la localisation
    marker.current = new maplibregl.Marker({
      color: '#ff6b35',
      scale: 1,
    })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    // Animation de rotation douce
    const rotateCamera = () => {
      if (!map.current || !rotating.current) return;
      const bearing = map.current.getBearing();
      map.current.rotateTo((bearing + 0.1) % 360, { duration: 100 });
      requestAnimationFrame(rotateCamera);
    };
    
    map.current.once('load', () => {
      rotateCamera();
    });

    return () => {
      rotating.current = false;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [latitude, longitude, zoom]);

  // Effet pour animer la caméra vers les nouvelles coordonnées
  useEffect(() => {
    if (!map.current || !targetCoords) return;

    const { lng, lat, zoom: targetZoom, pitch = 60, bearing = -20 } = targetCoords;

    // Arrêter la rotation pendant l'animation
    rotating.current = false;

    // Animer la caméra vers la nouvelle position
    map.current.flyTo({
      center: [lng, lat],
      zoom: targetZoom,
      pitch,
      bearing,
      duration: 2500,
      essential: true,
    });

    // Déplacer le marqueur
    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    }

    // Redémarrer la rotation après l'animation
    setTimeout(() => {
      rotating.current = true;
      const rotateCamera = () => {
        if (!map.current || !rotating.current) return;
        const currentBearing = map.current.getBearing();
        map.current.rotateTo((currentBearing + 0.1) % 360, { duration: 100 });
        requestAnimationFrame(rotateCamera);
      };
      rotateCamera();
    }, 2500);
  }, [targetCoords]);

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '100%', 
        height: '100%',
        borderRadius: '0 0 12px 12px',
      }} 
    />
  );
}
