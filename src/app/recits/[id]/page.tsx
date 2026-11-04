/**
 * Page récit — fiche éditoriale + scrollytelling synchronisé (Étape 4 · 1/2).
 * Route statique : un page par récit du corpus (generateStaticParams), même
 * patron de chargement que l'atlas — le corpus validé côté serveur, puis
 * l'expérience interactive (client) reçoit un récit sérialisable.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import StoryExperience from '@/components/StoryExperience';
import { getStoryById, stories } from '@/data/stories';
import { STORY_CATEGORY_LABELS } from '@/types';

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

/** Pré-rendu statique des trois récits du corpus. */
export function generateStaticParams(): { id: string }[] {
  return stories.map((story) => ({ id: story.id }));
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const story = getStoryById(id);
  if (!story) return {};
  return {
    title: `${story.title.fr} — Voix du Faso`,
    description:
      story.subtitle?.fr ??
      `Récit ${STORY_CATEGORY_LABELS[story.category].toLowerCase()} du patrimoine oral du Burkina Faso, raconté à ${story.region.name}.`,
  };
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;
  const story = getStoryById(id);
  if (!story) notFound();
  return <StoryExperience story={story} />;
}
