/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  LES 13 RÉGIONS ADMINISTRATIVES DU BURKINA FASO (Étape 1)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Référentiel géographique de la carte interactive (Étape 2) :
 *  survol dynamique et vols caméra (fly-to) vers chaque chef-lieu.
 *
 *  Coordonnées : chef-lieu de région, WGS 84 degrés décimaux, ~3 décimales
 *  (précision d'ancrage suffisante pour un fly-to ; l'ancre fine de chaque
 *  récit est portée par `Story.region.coordinates`).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { BurkinaRegionCode, GeoCoordinate } from '../types';

export interface BurkinaRegionInfo {
  /** Code normalisé — cf. `BurkinaRegionCode` dans `src/types/story.ts`. */
  code: BurkinaRegionCode;
  /** Nom officiel de la région. */
  name: string;
  /** Chef-lieu de région (cible du fly-to). */
  capital: string;
  /** Coordonnées du chef-lieu. */
  coordinates: GeoCoordinate;
}

/** Les 13 régions, d'Ouest en Est puis du Nord au Sahel. */
export const BURKINA_REGIONS: readonly BurkinaRegionInfo[] = [
  { code: 'boucle-du-mouhoun', name: 'Boucle du Mouhoun', capital: 'Dédougou',
    coordinates: { latitude: 12.464, longitude: -3.462 } },
  { code: 'cascades', name: 'Cascades', capital: 'Banfora',
    coordinates: { latitude: 10.626, longitude: -4.765 } },
  { code: 'centre', name: 'Centre', capital: 'Ouagadougou',
    coordinates: { latitude: 12.366, longitude: -1.533 } },
  { code: 'centre-est', name: 'Centre-Est', capital: 'Tenkodogo',
    coordinates: { latitude: 11.783, longitude: -0.283 } },
  { code: 'centre-nord', name: 'Centre-Nord', capital: 'Kaya',
    coordinates: { latitude: 13.23, longitude: -1.517 } },
  { code: 'centre-ouest', name: 'Centre-Ouest', capital: 'Koudougou',
    coordinates: { latitude: 12.253, longitude: -2.362 } },
  { code: 'centre-sud', name: 'Centre-Sud', capital: 'Manga',
    coordinates: { latitude: 11.667, longitude: -1.067 } },
  { code: 'est', name: 'Est', capital: "Fada N'gourma",
    coordinates: { latitude: 12.067, longitude: 0.367 } },
  { code: 'hauts-bassins', name: 'Hauts-Bassins', capital: 'Bobo-Dioulasso',
    coordinates: { latitude: 11.177, longitude: -4.298 } },
  { code: 'nord', name: 'Nord', capital: 'Ouahigouya',
    coordinates: { latitude: 13.576, longitude: -2.363 } },
  { code: 'plateau-central', name: 'Plateau-Central', capital: 'Ziniaré',
    coordinates: { latitude: 12.584, longitude: -1.284 } },
  { code: 'sahel', name: 'Sahel', capital: 'Dori',
    coordinates: { latitude: 14.033, longitude: -0.033 } },
  { code: 'sud-ouest', name: 'Sud-Ouest', capital: 'Gaoua',
    coordinates: { latitude: 10.326, longitude: -3.184 } },
];

/**
 * Emprise géographique du pays — bornage initial de la vue carte
 * (`map.fitBounds` au montage, Étape 2).
 */
export const BURKINA_BOUNDS = {
  west: -5.52,
  south: 9.4,
  east: 2.31,
  north: 15.09,
} as const;

/** Garde-fou de complétude : le référentiel doit porter exactement 13 régions. */
if (BURKINA_REGIONS.length !== 13) {
  throw new Error(
    `regions.bf.ts — 13 régions attendues, ${BURKINA_REGIONS.length} trouvées.`,
  );
}

/** Accès par code régional normalisé. */
export function getRegionByCode(code: BurkinaRegionCode): BurkinaRegionInfo | undefined {
  return BURKINA_REGIONS.find((region) => region.code === code);
}
