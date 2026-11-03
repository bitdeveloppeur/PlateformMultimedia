/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ACCÈS TYÉ AU CORPUS DES RÉCITS (Étape 1)
 * ─────────────────────────────────────────────────────────────────────────────
 *  `stories.json` est une FRONTIÈRE DE CONFIANCE : le contenu brut est validé
 *  à l'exécution (SSR / lancement) avant d'être exposé comme `Story[]`.
 *  Un fichier malformé échoue tôt et bruyamment — jamais en pleine expérience
 *  utilisateur, au milieu d'un fly-to ou d'un chapitre audio.
 *
 *  Exports : `stories`, `storiesById`, `getStoryById`, `getStoriesByCategory`,
 *  `corpusStats` (compteurs prêts pour l'UI et le SEO).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import rawStories from './stories.json';
import {
  AUDIO_FORMATS,
  BURKINA_REGION_CODES,
  CANVAS_EFFECTS,
  CHAPTER_TRIGGER_TYPES,
  LANGUAGE_CODES,
  MAP_MARKER_KINDS,
  STORY_CATEGORIES,
  type AudioTrack,
  type Chapter,
  type ChapterTrigger,
  type GeoCoordinate,
  type LanguageCode,
  type LocalizedText,
  type Story,
  type StoryRegion,
} from '../types';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/* ── Primitives de validation ─────────────────────────────────────────────── */

const fail = (path: string, why: string): never => {
  throw new Error(`stories.json — champ « ${path} » : ${why}`);
};

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(path, 'objet attendu');
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) return fail(path, 'tableau attendu');
  return value;
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return fail(path, 'chaîne non vide attendue');
  }
  return value;
}

function num(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(path, 'nombre fini attendu');
  }
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  const candidate = str(value, path);
  return (allowed as readonly string[]).includes(candidate)
    ? (candidate as T)
    : fail(path, `valeur attendue parmi [${allowed.join(', ')}]`);
}

/* ── Parsers métier ───────────────────────────────────────────────────────── */

function coordinate(value: unknown, path: string): GeoCoordinate {
  const node = record(value, path);
  const latitude = num(node.latitude, `${path}.latitude`);
  const longitude = num(node.longitude, `${path}.longitude`);
  if (latitude < -90 || latitude > 90) fail(`${path}.latitude`, 'hors intervalle [-90, 90]');
  if (longitude < -180 || longitude > 180) fail(`${path}.longitude`, 'hors intervalle [-180, 180]');
  return { latitude, longitude };
}

function localized(value: unknown, path: string): LocalizedText {
  const node = record(value, path);
  const out: LocalizedText = { fr: str(node.fr, `${path}.fr`) };
  for (const key of Object.keys(node)) {
    if (key === 'fr') continue;
    oneOf(key, LANGUAGE_CODES, `${path}.${key}`);
    out[key as Exclude<LanguageCode, 'fr'>] = str(node[key], `${path}.${key}`);
  }
  return out;
}

function audioTrack(value: unknown, path: string): AudioTrack {
  const node = record(value, path);
  return {
    language: oneOf(node.language, LANGUAGE_CODES, `${path}.language`),
    src: str(node.src, `${path}.src`),
    durationHint: num(node.durationHint, `${path}.durationHint`),
    narrator: node.narrator === undefined ? undefined : str(node.narrator, `${path}.narrator`),
    fallbacks: array(node.fallbacks ?? [], `${path}.fallbacks`).map((f, i) =>
      oneOf(f, LANGUAGE_CODES, `${path}.fallbacks[${i}]`),
    ),
    format: oneOf(node.format, AUDIO_FORMATS, `${path}.format`),
  };
}

/**
 * Déclencheurs : le discriminant `type` et ses champs critiques sont contrôlés
 * (coordonnées, modèles de marqueurs, effets canvas). Les champs optionnels
 * sont consommés « best effort » par les moteurs des Étapes 2–4.
 */
function triggers(value: unknown, path: string): ChapterTrigger[] {
  return array(value ?? [], path).map((raw, i) => {
    const node = record(raw, `${path}[${i}]`);
    const type = oneOf(node.type, CHAPTER_TRIGGER_TYPES, `${path}[${i}].type`);
    if (type === 'map:flyto') coordinate(node.target, `${path}[${i}].target`);
    if (type === 'map:marker') {
      oneOf(node.kind, MAP_MARKER_KINDS, `${path}[${i}].kind`);
      coordinate(node.at, `${path}[${i}].at`);
    }
    if (type === 'canvas:effect') {
      oneOf(node.effect, CANVAS_EFFECTS, `${path}[${i}].effect`);
    }
    if (type === 'visual:image') {
      str(node.src, `${path}[${i}].src`);
      localized(node.alt, `${path}[${i}].alt`);
    }
    if (type === 'audio:ambient') str(node.src, `${path}[${i}].src`);
    return raw as ChapterTrigger;
  });
}

function chapter(value: unknown, path: string): Chapter {
  const node = record(value, path);
  const audioStart = num(node.audioStart, `${path}.audioStart`);
  const audioEnd = num(node.audioEnd, `${path}.audioEnd`);
  if (audioStart < 0 || audioEnd <= audioStart) {
    fail(path, 'audioEnd doit être > audioStart ≥ 0');
  }
  return {
    id: str(node.id, `${path}.id`),
    title: localized(node.title, `${path}.title`),
    audioStart,
    audioEnd,
    narration: localized(node.narration, `${path}.narration`),
    cues:
      node.cues === undefined
        ? undefined
        : array(node.cues, `${path}.cues`).map((raw, i) => {
            const cuePath = `${path}.cues[${i}]`;
            const cue = record(raw, cuePath);
            const start = num(cue.start, `${cuePath}.start`);
            const end = num(cue.end, `${cuePath}.end`);
            if (end <= start) fail(cuePath, 'end doit être > start');
            if (start < audioStart || end > audioEnd) {
              fail(cuePath, 'le cue doit rester dans les bornes du chapitre');
            }
            return {
              language: oneOf(cue.language, LANGUAGE_CODES, `${cuePath}.language`),
              start,
              end,
              text: str(cue.text, `${cuePath}.text`),
            };
          }),
    triggers: triggers(node.triggers, `${path}.triggers`),
  };
}

function region(value: unknown, path: string): StoryRegion {
  const node = record(value, path);
  return {
    code: oneOf(node.code, BURKINA_REGION_CODES, `${path}.code`),
    name: str(node.name, `${path}.name`),
    department: str(node.department, `${path}.department`),
    coordinates: coordinate(node.coordinates, `${path}.coordinates`),
  };
}

function story(value: unknown, path: string): Story {
  const node = record(value, path);

  const languages = array(node.languages, `${path}.languages`).map((t, i) =>
    audioTrack(t, `${path}.languages[${i}]`),
  );
  if (!languages.some((track) => track.language === 'fr')) {
    fail(`${path}.languages`, 'la piste « fr » (pivot) est requise');
  }
  const defaultLanguage = oneOf(node.defaultLanguage, LANGUAGE_CODES, `${path}.defaultLanguage`);
  if (!languages.some((track) => track.language === defaultLanguage)) {
    fail(`${path}.defaultLanguage`, 'aucune piste ne correspond à defaultLanguage');
  }

  const chapters = array(node.chapters, `${path}.chapters`).map((c, i) =>
    chapter(c, `${path}.chapters[${i}]`),
  );
  if (chapters.length === 0) fail(`${path}.chapters`, 'au moins un chapitre requis');
  for (let i = 1; i < chapters.length; i++) {
    if (chapters[i].audioStart < chapters[i - 1].audioStart) {
      fail(`${path}.chapters[${i}]`, 'audioStart doit être croissant d’un chapitre à l’autre');
    }
  }

  const coverNode = record(node.cover, `${path}.cover`);
  const palette = array(coverNode.palette, `${path}.cover.palette`).map((p, i) => {
    const color = str(p, `${path}.cover.palette[${i}]`);
    if (!HEX_COLOR.test(color)) fail(`${path}.cover.palette[${i}]`, 'couleur #RRGGBB attendue');
    return color;
  });
  if (palette.length < 2) fail(`${path}.cover.palette`, 'au moins deux couleurs requises');

  const creditsNode = record(node.credits, `${path}.credits`);

  return {
    id: str(node.id, `${path}.id`),
    title: localized(node.title, `${path}.title`),
    subtitle: node.subtitle === undefined ? undefined : localized(node.subtitle, `${path}.subtitle`),
    category: oneOf(node.category, STORY_CATEGORIES, `${path}.category`),
    region: region(node.region, `${path}.region`),
    era: str(node.era, `${path}.era`),
    people: str(node.people, `${path}.people`),
    cover: {
      image: str(coverNode.image, `${path}.cover.image`),
      alt: localized(coverNode.alt, `${path}.cover.alt`),
      palette: palette as [string, string, ...string[]],
    },
    defaultLanguage,
    languages,
    chapters,
    credits: {
      sources: array(creditsNode.sources, `${path}.credits.sources`).map((s, i) =>
        str(s, `${path}.credits.sources[${i}]`),
      ),
      collectedAt: str(creditsNode.collectedAt, `${path}.credits.collectedAt`),
      license: str(creditsNode.license, `${path}.credits.license`),
    },
  };
}

/* ── Exports publics ──────────────────────────────────────────────────────── */

/** Corpus validé, prêt pour le rendu serveur et client. */
export const stories: Story[] = array(rawStories as unknown, 'stories.json — racine').map(
  (raw, index) => story(raw, `stories[${index}]`),
);

if (stories.length === 0) {
  throw new Error('stories.json — corpus vide : au moins un récit requis.');
}

/** Index id → récit (O(1) pour les pages dynamiques `/recit/[id]`). */
export const storiesById: ReadonlyMap<string, Story> = new Map(
  stories.map((s) => [s.id, s]),
);

export function getStoryById(id: string): Story | undefined {
  return storiesById.get(id);
}

export function getStoriesByCategory(category: Story['category']): Story[] {
  return stories.filter((s) => s.category === category);
}

/** Compteurs agrégés — hero, pied de page, métadonnées SEO. */
export const corpusStats = {
  stories: stories.length,
  chapters: stories.reduce((count, s) => count + s.chapters.length, 0),
  languages: [...new Set(stories.flatMap((s) => s.languages.map((t) => t.language)))],
  regions: [...new Set(stories.map((s) => s.region.code))],
  totalDurationHintSeconds: stories.reduce(
    (total, s) => total + (s.languages[0]?.durationHint ?? 0),
    0,
  ),
} as const;
