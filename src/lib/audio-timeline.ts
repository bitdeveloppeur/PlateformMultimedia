/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AUDIO TIMELINE — logique pure de la synchronisation audio/texte (Étape 3)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Convention du corpus (Étape 1) : les timecodes `audioStart`, `audioEnd` et
 *  les cues `start`/`end` sont exprimés sur la GRILLE DE RÉFÉRENCE = la piste
 *  « fr » (pivot toujours présent). Les pistes des langues nationales, de
 *  durées légèrement différentes (`durationHint`), sont mappées
 *  proportionnellement : changer de langue conserve la position NARRATIVE
 *  exacte — la seconde de lecture est préservée au prorata de la piste.
 *
 *  Fonctions volontairement pures, sans dépendance navigateur : testables sous
 *  Node, réutilisables par le lecteur (Étape 3) et le scrollytelling (Étape 4).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { AudioTrack, LanguageCode, Story, SubtitleCue } from '../types';

/** Cue sous-titré résolu, avec sa langue effective (repli « fr » inclus). */
export interface ResolvedCue {
  cue: SubtitleCue;
  /** Index du chapitre porteur du cue. */
  chapterIndex: number;
  /** Langue du cue effectivement retourné (demandée, ou « fr » en repli). */
  cueLanguage: LanguageCode;
}

/** Piste d'une langue pour un récit (`undefined` si le récit ne la porte pas). */
export function trackFor(story: Story, language: LanguageCode): AudioTrack | undefined {
  return story.languages.find((track) => track.language === language);
}

/**
 * Durée de la grille de référence : la piste « fr » (pivot garanti par la
 * validation du corpus), sinon la première piste disponible.
 */
export function referenceDuration(story: Story): number {
  return trackFor(story, 'fr')?.durationHint ?? story.languages[0]?.durationHint ?? 0;
}

/**
 * Grille de référence → temps sur la piste d'une langue donnée.
 * Mapping proportionnel : `t_langue = t_réf × durée_langue / durée_réf`.
 */
export function referenceToTrack(
  referenceTime: number,
  referenceDurationSeconds: number,
  trackDurationSeconds: number,
): number {
  if (referenceDurationSeconds <= 0 || trackDurationSeconds <= 0) return referenceTime;
  return (referenceTime / referenceDurationSeconds) * trackDurationSeconds;
}

/** Temps sur la piste → grille de référence (fonction inverse). */
export function trackToReference(
  trackTime: number,
  referenceDurationSeconds: number,
  trackDurationSeconds: number,
): number {
  if (referenceDurationSeconds <= 0 || trackDurationSeconds <= 0) return trackTime;
  return (trackTime / trackDurationSeconds) * referenceDurationSeconds;
}

/**
 * Index du chapitre actif à `referenceTime` : dernier chapitre dont
 * `audioStart ≤ t` (les chapitres étant contigüs et croissants). Le dernier
 * chapitre s'étend jusqu'à la fin de la piste ; `-1` avant le début (t < 0).
 */
export function chapterIndexAt(story: Story, referenceTime: number): number {
  const chapters = story.chapters;
  for (let index = chapters.length - 1; index >= 0; index--) {
    if (referenceTime >= chapters[index].audioStart) return index;
  }
  return -1;
}

/**
 * Phrase sous-titrée active à `referenceTime` : cue du CHAPITRE actif dont
 * `start ≤ t < end`, dans la langue demandée avec repli automatique sur les
 * cues « fr » (les collectes nationales s'ajoutent au fil du temps sans jamais
 * laisser l'écran vide).
 */
export function activeCueAt(
  story: Story,
  referenceTime: number,
  language: LanguageCode,
): ResolvedCue | null {
  const chapterIndex = chapterIndexAt(story, referenceTime);
  if (chapterIndex < 0) return null;
  const cues = story.chapters[chapterIndex].cues;
  if (!cues || cues.length === 0) return null;

  const cueLanguages: LanguageCode[] = language === 'fr' ? ['fr'] : [language, 'fr'];
  for (const cueLanguage of cueLanguages) {
    const cue = cues.find(
      (c) => c.language === cueLanguage && referenceTime >= c.start && referenceTime < c.end,
    );
    if (cue) return { cue, chapterIndex, cueLanguage };
  }
  return null;
}

/** Borne un temps à la timeline `[0, durée de référence]`. */
export function clampToTimeline(
  time: number,
  referenceDurationSeconds: number,
): number {
  if (referenceDurationSeconds <= 0) return Math.max(time, 0);
  return Math.min(Math.max(time, 0), referenceDurationSeconds);
}
