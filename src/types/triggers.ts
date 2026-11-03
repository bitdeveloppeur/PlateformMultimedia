/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DÉCLENCHEURS NARRATIFS — unions discriminées (Étape 1)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Consommés par :
 *   • la carte 3D MapLibre (Étape 2)      → `map:flyto`, `map:marker`
 *   • le moteur canvas du scrollytelling  → `canvas:effect`
 *   • la mise en scène plein cadre         → `visual:image`
 *   • le moteur audio Howler (Étape 3)    → `audio:ambient`
 *
 *  Le champ `type` est le discriminant : un `switch` exhaustif sur ce champ
 *  est garanti par le compilateur (never-check) — impossible d'oublier un
 *  cas quand on ajoute un nouveau type de déclencheur.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { GeoCoordinate, LocalizedText } from './story';

/** Modèles de marqueurs 3D low-poly — référentiel iconographique burkinabè. */
export const MAP_MARKER_KINDS = [
  'mask',         // masque rituel (Bobo, Bwa…)
  'granary',      // grenier à mil du plateau
  'tiebele-wall', // façade peinte de Tiébélé (Kassena)
  'drum',         // tambour royal (bendre / lunga)
  'stallion',     // étalon de Yennenga
  'stone-ruin',   // rempart de Loropéni
] as const;
export type MapMarkerKind = (typeof MAP_MARKER_KINDS)[number];

/** Effets canvas génératifs du scrollytelling (arrière-plans animés). */
export const CANVAS_EFFECTS = [
  'starfield', 'moonlight-dust', 'fireflies', 'savanna-wind',
  'harmattan', 'golden-dust', 'stone-mist', 'war-drums',
] as const;
export type CanvasEffect = (typeof CANVAS_EFFECTS)[number];

/** Discriminants disponibles (mirror exhaustif de l'union ci-dessous). */
export const CHAPTER_TRIGGER_TYPES = [
  'map:flyto', 'map:marker', 'canvas:effect', 'visual:image', 'audio:ambient',
] as const;
export type ChapterTriggerType = (typeof CHAPTER_TRIGGER_TYPES)[number];

/** Carte — vol de caméra animé vers un point d'intérêt (MapLibre flyTo). */
export interface MapFlyToTrigger {
  type: 'map:flyto';
  target: GeoCoordinate;
  /** Niveau de zoom 3–14 ; défaut selon le contexte de la scène. */
  zoom?: number;
  /** Inclinaison 0–70° — active le relief 3D du Burkina. */
  pitch?: number;
  /** Rotation caméra en degrés (0 = nord). */
  bearing?: number;
  /** Durée du vol en ms (easing GSAP côté Étape 2). */
  durationMs?: number;
}

/** Carte — apparition d'un marqueur 3D personnalisé. */
export interface MapMarkerTrigger {
  type: 'map:marker';
  kind: MapMarkerKind;
  at: GeoCoordinate;
  /** Étiquette au survol (tooltip glassmorphism). */
  label?: LocalizedText;
}

/** Canvas — arrière-plan génératif animé, lié au chapitre. */
export interface CanvasEffectTrigger {
  type: 'canvas:effect';
  effect: CanvasEffect;
  /** Intensité 0–1 : densité de particules, amplitude du vent… */
  intensity?: number;
  /** Surcharge ponctuelle de palette (défaut : palette de la cover). */
  palette?: string[];
}

/** Mise en scène — révélation d'une image plein cadre. */
export interface ImageRevealTrigger {
  type: 'visual:image';
  src: string;
  alt: LocalizedText;
  treatment?: 'ken-burns' | 'parallax' | 'fade';
}

/** Audio — nappe d'ambiance spatialisée, crossfadée par le moteur (Étape 3). */
export interface AmbientAudioTrigger {
  type: 'audio:ambient';
  src: string;
  /** Boucle — défaut : true. */
  loop?: boolean;
  /** Volume cible 0–1. */
  volume?: number;
  /** Durée du fondu enchaîné avec la nappe précédente (ms). */
  crossfadeMs?: number;
}

/** Union discriminée — un déclencheur quelconque rattaché à un chapitre. */
export type ChapterTrigger =
  | MapFlyToTrigger
  | MapMarkerTrigger
  | CanvasEffectTrigger
  | ImageRevealTrigger
  | AmbientAudioTrigger;
