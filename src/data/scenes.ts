/**
 * Frontière de confiance des scènes interactives (conte page-par-page).
 * Comme stories.ts pour le corpus : le JSON n'est importé nulle part
 * ailleurs ; les composants consomment les livres validés d'ici.
 */
import rawBookYennenga from './scenes/yennenga-mere-des-moose.json';
import rawBookLoropeni from './scenes/les-ruines-de-lorepeni.json';
import rawBookLievre from './scenes/le-lievre-et-la-tortue.json';
import type { StageBook } from '@/types/stage';

const bookYennenga = rawBookYennenga as unknown as StageBook;
const bookLoropeni = rawBookLoropeni as unknown as StageBook;
const bookLievre = rawBookLievre as unknown as StageBook;

if (!bookYennenga.pages?.length || !bookYennenga.storyId) {
  throw new Error('scenes/yennenga-mere-des-moose.json — structure invalide');
}

if (!bookLoropeni.pages?.length || !bookLoropeni.storyId) {
  throw new Error('scenes/les-ruines-de-lorepeni.json — structure invalide');
}

if (!bookLievre.pages?.length || !bookLievre.storyId) {
  throw new Error('scenes/le-lievre-et-la-tortue.json — structure invalide');
}

/** Livres interactifs disponibles, indexés par id de récit. */
export const stageBooks: ReadonlyMap<string, StageBook> = new Map([
  [bookYennenga.storyId, bookYennenga],
  [bookLoropeni.storyId, bookLoropeni],
  [bookLievre.storyId, bookLievre],
]);

export function getStageBook(storyId: string): StageBook | undefined {
  return stageBooks.get(storyId);
}

/** Récits disposant d'un conte interactif (bouton d'entrée conditionnel). */
export function hasInteractiveScenes(storyId: string): boolean {
  return stageBooks.has(storyId);
}
