/**
 * Conte interactif — page-par-page sur stage SVG animé (design story.pen).
 * Pré-rendu statique pour les récits disposant de scènes interactives
 * (Yennenga à ce stade) ; les autres ids → 404 propre.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import InteractiveStoryClient from './InteractiveStoryClient';
import { getStoryById, stories } from '@/data/stories';
import { getStageBook } from '@/data/scenes';

interface ContePageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams(): { id: string }[] {
  return stories.filter((story) => !!getStageBook(story.id)).map((story) => ({ id: story.id }));
}

export async function generateMetadata({ params }: ContePageProps): Promise<Metadata> {
  const { id } = await params;
  const story = getStoryById(id);
  if (!story) return {};
  return {
    title: `Conte interactif — ${story.title.fr} · Voix du Faso`,
    description: `Le conte de ${story.title.fr} à toucher : une scène animée par chapitre, racontée à la voix.`,
  };
}

export default async function ContePage({ params }: ContePageProps) {
  const { id } = await params;
  const story = getStoryById(id);
  const book = story && getStageBook(story.id);
  if (!story || !book) notFound();
  return <InteractiveStoryClient story={story} book={book} />;
}
