/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PATRIMOINE ORAL DU BURKINA FASO — Modèle de données « Story » (Étape 1)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Source de vérité typée pour toute la plateforme : carte 3D (Étape 2),
 *  lecteur audio multilingue (Étape 3), scrollytelling & fiches (Étape 4).
 *
 *  Conventions :
 *   • Coordonnées WGS 84 en degrés décimaux (longitude ouest négative).
 *   • Tout texte localisé exige `fr` : pivot obligatoire de repli pour l'UI
 *     et les sous-titres. Les langues nationales s'ajoutent au fur et à
 *     mesure du collectage sans jamais casser le rendu.
 *   • Les timecodes audio sont des secondes décimales en position ABSOLUE
 *     depuis le début de la piste (même grille pour toutes les langues).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ChapterTrigger } from './triggers';

/** Langues supportées par le moteur audio : national + français. */
export const LANGUAGE_CODES = ['fr', 'moore', 'dioula', 'fulfulde'] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

/** Libellé UI (français) et endonyme pour le sélecteur de langue. */
export const LANGUAGE_LABELS: Readonly<Record<LanguageCode, { label: string; native: string }>> = {
  fr: { label: 'Français', native: 'Français' },
  moore: { label: 'Mooré', native: 'Mooré' },
  dioula: { label: 'Dioula', native: 'Dioula' },
  fulfulde: { label: 'Peul', native: 'Fulfulde' },
};

/** Valeur localisée : `fr` obligatoire (pivot), langues nationales optionnelles. */
export type Localized<T> = { fr: T } & Partial<Record<Exclude<LanguageCode, 'fr'>, T>>;
export type LocalizedText = Localized<string>;

/** Point géographique WGS 84 (degrés décimaux). */
export interface GeoCoordinate {
  /** Latitude ∈ [-90, 90]. Ex : 12.1792 (Koupéla). */
  latitude: number;
  /** Longitude ∈ [-180, 180], ouest négatif. Ex : -0.3467. */
  longitude: number;
}

/** Les 13 régions administratives du Burkina Faso (codes normalisés kebab-case). */
export const BURKINA_REGION_CODES = [
  'boucle-du-mouhoun', 'cascades', 'centre', 'centre-est', 'centre-nord',
  'centre-ouest', 'centre-sud', 'est', 'hauts-bassins', 'nord',
  'plateau-central', 'sahel', 'sud-ouest',
] as const;
export type BurkinaRegionCode = (typeof BURKINA_REGION_CODES)[number];

/** Ancrage géographique d'un récit (point d'intérêt narratif). */
export interface StoryRegion {
  /** Code normalisé de la région (voir BURKINA_REGION_CODES). */
  code: BurkinaRegionCode;
  /** Nom usuel de la région. Ex : « Centre-Est ». */
  name: string;
  /** Département / province de l'ancre. Ex : « Koupéla (Kouritenga) ». */
  department: string;
  /** Ancre GPS du récit — pas forcément le chef-lieu de région. */
  coordinates: GeoCoordinate;
}

/** Catégories éditoriales du corpus. */
export const STORY_CATEGORIES = ['conte', 'legende', 'histoire'] as const;
export type StoryCategory = (typeof STORY_CATEGORIES)[number];

/** Conteneurs audio acceptés par le moteur (Howler.js). */
export const AUDIO_FORMATS = ['mp3', 'm4a', 'ogg', 'wav'] as const;
export type AudioFormat = (typeof AUDIO_FORMATS)[number];

/** Piste narrée d'un récit — une par langue disponible. */
export interface AudioTrack {
  language: LanguageCode;
  /** Chemin public du master. Ex : /audio/stories/yennenga/yennenga-fr.mp3 */
  src: string;
  /** Durée indicative (s) — métadonnée d'affichage avant chargement. */
  durationHint: number;
  /** Personne qui porte la parole : griotte, conteur, témoin. */
  narrator?: string;
  /** Langues de repli si la piste est indisponible (ex. réseau mobile). */
  fallbacks: LanguageCode[];
  format: AudioFormat;
}

/** Sous-titre fin synchronisé (équivalent WEBVTT, indexé par langue). */
export interface SubtitleCue {
  language: LanguageCode;
  /** Début, en secondes absolues depuis le début de la piste. */
  start: number;
  /** Fin, en secondes (end > start). */
  end: number;
  text: string;
}

/**
 * Chapitre narratif — unité de synchronisation scroll ↔ audio ↔ visuels.
 * Les `audioStart`/`audioEnd` bornent la portion de piste à lire ; les
 * `triggers` sont franchis à l'entrée du chapitre.
 */
export interface Chapter {
  /** Identifiant stable, unique dans le récit. Ex : « yennenga-ch-02 ». */
  id: string;
  title: LocalizedText;
  /** Entrée du chapitre dans la piste audio (secondes absolues, ≥ 0). */
  audioStart: number;
  /** Sortie du chapitre (secondes absolues, > audioStart). */
  audioEnd: number;
  /** Texte narratif affiché + lu, par langue. */
  narration: LocalizedText;
  /** Sous-titres fins optionnels (cue ≤ 8 s recommandé). */
  cues?: SubtitleCue[];
  /** Déclencheurs carte / canvas / image / ambiance (unions discriminées). */
  triggers: ChapterTrigger[];
}

/** Traçabilité du collectage — exigence déontologique du projet. */
export interface StoryCredits {
  /** Références : collectage, publications, archives, traditions. */
  sources: string[];
  /** Lieu et date du collectage. Ex : « Koupéla, collecte de démonstration 2026 ». */
  collectedAt: string;
  /** Licence de diffusion. Ex : « CC BY-SA 4.0 ». */
  license: string;
}

/** Vignette d'accroche du récit. */
export interface StoryCover {
  /** Illustration (placeholder SVG accepté à ce stade). */
  image: string;
  alt: LocalizedText;
  /** Palette ethno-futuriste (≥ 2 couleurs #RRGGBB) pilotant la fiche. */
  palette: [string, string, ...string[]];
}

/** ── Racine du modèle ─────────────────────────────────────────────────────── */
export interface Story {
  /** Slug stable. Ex : « yennenga-mere-des-moose ». */
  id: string;
  title: LocalizedText;
  subtitle?: LocalizedText;
  category: StoryCategory;
  region: StoryRegion;
  /** Époque ou datation. Ex : « vers le XIVᵉ siècle (oralité) ». */
  era: string;
  /** Peuple dépositaire de l'oralité. Ex : « Moose ». */
  people: string;
  cover: StoryCover;
  /** Langue sélectionnée par défaut à l'ouverture du récit. */
  defaultLanguage: LanguageCode;
  /** Pistes disponibles — la piste « fr » (pivot) est toujours requise. */
  languages: AudioTrack[];
  /** Chapitres ordonnés par `audioStart` croissant. */
  chapters: Chapter[];
  credits: StoryCredits;
}
