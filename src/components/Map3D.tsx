'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Map3D — Atlas narratif du Burkina Faso (Étape 2 · design « atlas lumineux »)
 * ─────────────────────────────────────────────────────────────────────────────
 *  • MapLibre GL JS + relief 3D (DEM terrarium, sans clé) — vue d'ensemble
 *    plane à la manière d'une carte papier, relief révélé au fly-to narratif.
 *  • Fond Esri « World Light Gray Canvas » (libre, sans clé) + hillshade chaud
 *    (effet topographique) + contour national olive (geoBoundaries, auto-hébergé).
 *  • Marqueurs pastille numérotée à anneau coloré par catégorie + pilule de
 *    région sur le récit sélectionné + tooltip d'aperçu (CSS pur).
 *  • `flyToStory(cameraView)` : vol caméra fluide — position, zoom, PITCH,
 *    BEARING. flyTo long-courrier (arc) ou easeTo « beurre » à courte distance.
 *  • Nettoyage intégral au démontage : markers, handlers, observer, carte.
 *
 *  Client Component isolé — corpus injecté par le serveur via `stories`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
} from 'react';
import maplibregl, {
  type LngLatBoundsLike,
  type Map as MapLibreMap,
  type Marker,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { BURKINA_BOUNDS } from '@/data/regions.bf';
import { LANGUAGE_LABELS, STORY_CATEGORY_LABELS, type Story } from '@/types';

/* ── Types publics ─────────────────────────────────────────────────────────── */

/** Vue caméra demandée par la narration (sélection de récit ou chapitre). */
export interface CameraView {
  latitude: number;
  longitude: number;
  zoom?: number;
  /** Inclinaison 0–75° — révèle le relief 3D. */
  pitch?: number;
  /** Rotation en degrés (0 = nord). */
  bearing?: number;
  durationMs?: number;
}

/** API impérative exposée via `ref` (AtlasExperience, scrollytelling Étape 4…). */
export interface Map3DHandle {
  /** Vol caméra animé vers la vue demandée. */
  flyToStory: (cameraView: CameraView) => void;
  /** Retour fluide à la vue d'ensemble du Burkina Faso. */
  resetView: () => void;
}

export interface Map3DProps {
  /** Corpus validé complet (l'ordre du tableau fixe la numérotation). */
  stories: Story[];
  /** Notifie la sélection d'un récit (clic sur un marqueur). */
  onSelectStory?: (story: Story) => void;
  /** Identifiant du récit sélectionné (pastille remplie + pilule région). */
  selectedStoryId?: string;
  /** Récits visibles (filtre catégorie) — les autres marqueurs sont masqués. */
  visibleStoryIds?: readonly string[];
  /** Exagération du relief — le plateau burkinabè est doux : 1.4 par défaut. */
  terrainExaggeration?: number;
}

/* ── Sources & style cartographique ────────────────────────────────────────── */

const BASEMAP_SOURCE_ID = 'fond-esri-clair';
const REFERENCE_SOURCE_ID = 'fond-esri-labels';
const TERRAIN_SOURCE_ID = 'terrain-dem';
const OUTLINE_SOURCE_ID = 'contour-burkina';

/**
 * Fonds « World Light Gray Canvas » d'Esri — libres avec attribution, SANS clé.
 * Convention Esri : ordre des tuiles {z}/{y}/{x}.
 */
const ESRI_LIGHT_BASE_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_LIGHT_REFERENCE_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
/** Relief : tuiles terrarium AWS Open Data (gratuites, sans clé). */
const DEM_TILES =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
/** Contour national (geoBoundaries gbOpen, auto-hébergé dans /public/geo). */
const OUTLINE_GEOJSON_URL = '/geo/burkina-outline.geojson';

const ESRI_ATTRIBUTION = 'Fonds © Esri · Esri, DeLorme, NAVTEQ';

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    [BASEMAP_SOURCE_ID]: {
      type: 'raster',
      tiles: [ESRI_LIGHT_BASE_TILES],
      tileSize: 256,
      maxzoom: 16,
      attribution: ESRI_ATTRIBUTION,
    },
    [REFERENCE_SOURCE_ID]: {
      type: 'raster',
      tiles: [ESRI_LIGHT_REFERENCE_TILES],
      tileSize: 256,
      maxzoom: 16,
      attribution: ESRI_ATTRIBUTION,
    },
    [TERRAIN_SOURCE_ID]: {
      type: 'raster-dem',
      tiles: [DEM_TILES],
      encoding: 'terrarium',
      tileSize: 256,
      maxzoom: 13,
      attribution: 'Relief : AWS Terrain Tiles (Mapzen)',
    },
    [OUTLINE_SOURCE_ID]: {
      type: 'geojson',
      data: OUTLINE_GEOJSON_URL,
      attribution: 'Contour : geoBoundaries (gbOpen)',
    },
  },
  layers: [
    { id: 'papier', type: 'background', paint: { 'background-color': '#f7f5ec' } },
    {
      id: 'fond-clair',
      type: 'raster',
      source: BASEMAP_SOURCE_ID,
      paint: { 'raster-opacity': 0.95 },
    },
    {
      /** Ombre topographique douce — grain de carte papier. */
      id: 'grain-relief',
      type: 'hillshade',
      source: TERRAIN_SOURCE_ID,
      paint: {
        'hillshade-exaggeration': 0.45,
        'hillshade-highlight-color': '#ffffff',
        'hillshade-shadow-color': '#e2decb',
      },
    },
    {
      id: 'burkina-voile',
      type: 'fill',
      source: OUTLINE_SOURCE_ID,
      paint: { 'fill-color': '#a3b23e', 'fill-opacity': 0.07 },
    },
    {
      id: 'burkina-contour',
      type: 'line',
      source: OUTLINE_SOURCE_ID,
      paint: { 'line-color': '#8a9930', 'line-width': 1.8 },
    },
    {
      /** Toponymes & frontières par-dessus le grain de relief. */
      id: 'toponymes',
      type: 'raster',
      source: REFERENCE_SOURCE_ID,
      paint: { 'raster-opacity': 0.9 },
    },
  ],
};

/** Bornage national → `fitBounds` initial et `resetView`. */
function burkinaBounds(): LngLatBoundsLike {
  return [
    [BURKINA_BOUNDS.west, BURKINA_BOUNDS.south],
    [BURKINA_BOUNDS.east, BURKINA_BOUNDS.north],
  ];
}

/** Vue d'ensemble : plane comme une carte posée, lecteur flottant en bas. */
const FIT_PADDING = { top: 26, bottom: 116, left: 26, right: 26 };

const FOCUS_ZOOM = 9.2;
const FOCUS_PITCH = 58;
const FOCUS_BEARING = -14;
const FOCUS_DURATION_MS = 3200;

/* ── Petites aides ─────────────────────────────────────────────────────────── */

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
  );
}

/** `312` → « 5:12 » (timecodes de chapitres, durées). */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Vue caméra par défaut pour se poser sur l'ancre d'un récit. */
export function cameraViewFromStory(story: Story): CameraView {
  return {
    latitude: story.region.coordinates.latitude,
    longitude: story.region.coordinates.longitude,
    zoom: FOCUS_ZOOM,
    pitch: FOCUS_PITCH,
    bearing: FOCUS_BEARING,
    durationMs: FOCUS_DURATION_MS,
  };
}

/** Vue caméra d'un chapitre : premier déclencheur `map:flyto` du corpus, sinon l'ancre. */
export function cameraViewFromChapter(story: Story, chapterIndex: number): CameraView {
  const chapter = story.chapters[chapterIndex];
  if (chapter) {
    for (const trigger of chapter.triggers) {
      if (trigger.type === 'map:flyto') {
        return {
          latitude: trigger.target.latitude,
          longitude: trigger.target.longitude,
          zoom: trigger.zoom ?? 8.5,
          pitch: trigger.pitch ?? 55,
          bearing: trigger.bearing ?? 0,
          durationMs: trigger.durationMs ?? 3000,
        };
      }
    }
  }
  return cameraViewFromStory(story);
}

/* ── Marqueur DOM : pastille numérotée + pilule région + tooltip ───────────── */

function renderTooltipHtml(story: Story): string {
  const frTrack = story.languages.find((t) => t.language === 'fr') ?? story.languages[0];
  const languages = story.languages.map((t) => LANGUAGE_LABELS[t.language].native).join(' · ');
  return `
    <div class="m3d-tooltip" role="tooltip">
      <span class="cat-chip">${STORY_CATEGORY_LABELS[story.category]}</span>
      <h3 class="m3d-tooltip__title">${escapeHtml(story.title.fr)}</h3>
      ${story.subtitle ? `<p class="m3d-tooltip__subtitle">${escapeHtml(story.subtitle.fr)}</p>` : ''}
      <p class="m3d-tooltip__place">${escapeHtml(story.region.name)} — ${escapeHtml(story.region.department)}</p>
      <div class="m3d-tooltip__meta">
        <span>${escapeHtml(languages)}</span>
        <span>${formatDuration(frTrack.durationHint)}</span>
        <span>${story.chapters.length} chapitres</span>
      </div>
      <span class="m3d-tooltip__hint">Cliquer pour explorer</span>
    </div>`;
}

function buildMarkerElement(story: Story, index: number): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = `m3d-marker cat--${story.category}`;
  wrap.dataset.storyId = story.id;
  wrap.innerHTML = `
    <span class="m3d-marker__pulse" aria-hidden="true"></span>
    <button type="button" class="m3d-marker__btn" aria-label="Explorer le récit ${index + 1} : ${escapeHtml(story.title.fr)}">${index + 1}</button>
    <span class="m3d-marker__region">${escapeHtml(story.region.name)}</span>
    ${renderTooltipHtml(story)}`;
  return wrap;
}

/* ── Composant ─────────────────────────────────────────────────────────────── */

interface StoryMarkerRecord {
  marker: Marker;
  el: HTMLDivElement;
  story: Story;
}

function Map3DBase(
  {
    stories,
    onSelectStory,
    selectedStoryId,
    visibleStoryIds,
    terrainExaggeration = 1.4,
  }: Map3DProps,
  ref: ForwardedRef<Map3DHandle>,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<StoryMarkerRecord[]>([]);
  const onSelectRef = useRef(onSelectStory);

  const [ready, setReady] = useState(false);
  const [webglOk, setWebglOk] = useState(true);

  /* Callbacks toujours frais, sans ré-initialiser la carte. */
  useEffect(() => {
    onSelectRef.current = onSelectStory;
  }, [onSelectStory]);

  /* Détection WebGL côté client uniquement (pas d'écart d'hydratation). */
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      setWebglOk(!!(canvas.getContext('webgl2') ?? canvas.getContext('webgl')));
    } catch {
      setWebglOk(false);
    }
  }, []);

  /* ── Initialisation & NETTOYAGE INTÉGRAL au démontage ──────────────────── */
  useEffect(() => {
    if (!webglOk || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-1.4, 12.4],
      zoom: 5.4,
      pitch: 0,
      bearing: 0,
      maxPitch: 75,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    /**
     * Suivi de redimensionnement du conteneur (panneau redimensionnable,
     * barre d'URL mobile…) : certains redimensionnements ne déclenchent pas
     * l'événement `window.resize` — le canvas resterait à une taille périmée.
     */
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(map.getContainer());

    const handleLoad = () => {
      /* Relief 3D disponible — révélé par le pitch des fly-to narratifs. */
      map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: terrainExaggeration });
      map.resize();

      /* Vue d'ensemble nationale, plane comme une carte posée. */
      map.fitBounds(burkinaBounds(), {
        padding: FIT_PADDING,
        pitch: 0,
        bearing: 0,
        duration: 1400,
        essential: true,
      });

      /* Marqueurs pastilles numérotées (numérotation = ordre du corpus). */
      const created: StoryMarkerRecord[] = [];
      stories.forEach((story, index) => {
        const el = buildMarkerElement(story, index);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([
            story.region.coordinates.longitude,
            story.region.coordinates.latitude,
          ])
          .addTo(map);
        el.querySelector<HTMLButtonElement>('.m3d-marker__btn')?.addEventListener(
          'click',
          () => onSelectRef.current?.(story),
        );
        created.push({ marker, el, story });
      });
      markersRef.current = created;
      setReady(true);
    };

    map.on('load', handleLoad);

    return () => {
      map.off('load', handleLoad);
      resizeObserver.disconnect();
      for (const { marker } of markersRef.current) marker.remove();
      markersRef.current = [];
      mapRef.current = null;
      setReady(false);
      map.remove();
    };
  }, [stories, terrainExaggeration, webglOk]);

  /* ── Surbrillance du marqueur sélectionné ──────────────────────────────── */
  useEffect(() => {
    if (!ready) return;
    for (const { el, story } of markersRef.current) {
      el.classList.toggle('is-selected', story.id === selectedStoryId);
    }
  }, [ready, selectedStoryId]);

  /* ── Filtre de visibilité (catégories) ─────────────────────────────────── */
  useEffect(() => {
    if (!ready) return;
    const visible = visibleStoryIds ? new Set(visibleStoryIds) : null;
    for (const { el, story } of markersRef.current) {
      el.style.display = !visible || visible.has(story.id) ? '' : 'none';
    }
  }, [ready, visibleStoryIds]);

  /* ── API impérative : flyToStory / resetView ───────────────────────────── */
  useImperativeHandle(
    ref,
    () => ({
      /**
       * Vol caméra très fluide vers une vue narrative.
       * • Long trajet  → `flyTo` (arc cinématique, curve 1.55) ;
       * • Court trajet → `easeTo` (easing cubic in-out, sans effet d'arc).
       * Les deux chemins animent centre, zoom, pitch et bearing simultanément.
       */
      flyToStory(cameraView: CameraView) {
        const map = mapRef.current;
        if (!map) return;

        const center: [number, number] = [
          cameraView.longitude,
          cameraView.latitude,
        ];
        const zoom = cameraView.zoom ?? FOCUS_ZOOM;
        const pitch = cameraView.pitch ?? FOCUS_PITCH;
        const bearing = cameraView.bearing ?? FOCUS_BEARING;
        const durationMs = cameraView.durationMs ?? FOCUS_DURATION_MS;

        const distanceMeters = map
          .getCenter()
          .distanceTo(new maplibregl.LngLat(center[0], center[1]));
        const isShortHop =
          distanceMeters < 120_000 &&
          Math.abs(map.getZoom() - zoom) < 2 &&
          Math.abs(map.getBearing() - bearing) < 60;

        if (isShortHop) {
          map.easeTo({
            center,
            zoom,
            pitch,
            bearing,
            duration: Math.max(900, durationMs * 0.55),
            easing: easeInOutCubic,
          });
        } else {
          map.flyTo({
            center,
            zoom,
            pitch,
            bearing,
            duration: durationMs,
            curve: 1.55,
            essential: true,
          });
        }
      },

      /** Retour cinématique à la vue d'ensemble nationale (plane). */
      resetView() {
        mapRef.current?.fitBounds(burkinaBounds(), {
          padding: FIT_PADDING,
          pitch: 0,
          bearing: 0,
          duration: 2400,
          essential: true,
        });
      },
    }),
    [],
  );

  /* ── Rendu ─────────────────────────────────────────────────────────────── */
  if (!webglOk) {
    return (
      <div className="m3d-fallback" role="status">
        <p>
          <strong>Vue carte indisponible.</strong> WebGL semble désactivé sur ce
          navigateur.
        </p>
        <p>La navigation par fiches reste fonctionnelle ; un repli 2D est prévu à l&apos;Étape 4.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="m3d-root"
      role="application"
      aria-label="Carte du patrimoine oral du Burkina Faso"
    />
  );
}

const Map3D = forwardRef<Map3DHandle, Map3DProps>(Map3DBase);
export default Map3D;
