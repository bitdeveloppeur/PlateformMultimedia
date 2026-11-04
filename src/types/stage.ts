/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PATRIMOINE ORAL — Scènes du stage interactif (conte page-par-page)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Une « scène » = une page du conte : ciel, pose de chaque acteur
 *  (x, y, échelle, opacité), décor (forêt), et micro-tâche tactile (`act`).
 *  Les calques SVG référencés vivent dans /public/stage/<story-id>/.
 *
 *  Conventions :
 *   • pose absente (`null`) → acteur hors scène (fondu + ignoré au toucher) ;
 *   • page 0 = couverture ; page N (1-based) ↔ chapitre N-1 du corpus
 *     (l'audio narré du chapitre joue pendant la page) ;
 *   • coordonnées en unités du stage (1600×900 d'après le design Pencil).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Pose d'un acteur dans le repère du stage. */
export interface StagePose {
  x: number;
  y: number;
  /** Échelle (1 = taille nominale du calque). */
  s?: number;
  /** Opacité 0–1. */
  o?: number;
}

/** Micro-tâches tactiles connues du moteur (voir InteractiveStory). */
export type StageAct = 'gallop' | 'king' | 'okra' | 'stars' | 'bushes' | 'baby';

/** Une page du conte : décor + poses + tâche éventuelle. */
export interface StageScene {
  /** Étiquette de chapitre affichée (ex. « 1 · Gambaga »). */
  chap: string;
  /** Texte court de la page — une idée par page (design Pencil). */
  text: string;
  /** Consigne tactile ; vide = page sans tâche. */
  task?: string;
  /** Couleur de ciel (transition douce entre pages). */
  sky: string;
  /** Opacité du voile de nuit 0–1. */
  night: number;
  /** 1 = fond étoilé visible. */
  stars: number;
  /** Pose du soleil (déplacement + opacité). */
  sun: StagePose;
  rider?: StagePose | null;
  king?: StagePose | null;
  hunter?: StagePose | null;
  mother?: StagePose | null;
  /** Position horizontale de la forêt (1700 = hors scène). */
  forest: { x: number };
  /** Tâche de la page. */
  act?: StageAct | null;
  /** Page de couverture (titre masqué, texte d'invitation). */
  cover?: boolean;
}

/** Livre complet : stage + décors statiques + pages. */
export interface StageBook {
  storyId: string;
  stage: { width: number; height: number };
  /** Positions des étoiles à allumer (tâche « stars »). */
  starPos: [number, number][];
  /** Emplacements de semis du gombo (tâche « okra »). */
  holes: [number, number][];
  /** Positions des buissons (tâche « bushes »). */
  bushPos: [number, number][];
  /** Indice du buisson cachant le chasseur. */
  hiddenBushIndex: number;
  /** Texte de la bulle du roi (tâche « king »). */
  bubbleText: string;
  /** Titre/sous-titre de couverture. */
  coverTitle: string;
  coverSubtitle: string;
  pages: StageScene[];
}
