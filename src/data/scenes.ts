/**
 * Frontière de confiance des scènes interactives (conte page-par-page).
 * Comme stories.ts pour le corpus : le JSON n'est importé nulle part
 * ailleurs ; les composants consomment les livres validés d'ici.
 */
import rawBook from './scenes/yennenga-mere-des-moose.json';
import type { StageBook } from '@/types/stage';

const book = rawBook as unknown as StageBook;

if (!book.pages?.length || !book.storyId) {
  throw new Error('scenes/yennenga-mere-des-moose.json — structure invalide');
}
if (book.pages.some((page) => page.cover && page.pages !== undefined)) {
  throw new Error('structure de scène inattendue');
}

/** Livres interactifs disponibles, indexés par id de récit. */
export const stageBooks: ReadonlyMap<string, StageBook> = new Map([
  [book.storyId, book],
]);

export function getStageBook(storyId: string): StageBook | undefined {
  return stageBooks.get(storyId);
}

/** Récits disposant d'un conte interactif (bouton d'entrée conditionnel). */
export function hasInteractiveScenes(storyId: string): boolean {
  return stageBooks.has(storyId);
}
