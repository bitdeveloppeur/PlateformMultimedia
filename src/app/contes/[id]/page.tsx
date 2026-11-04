/**
 * Page conte interactive — veillée avec SVG animé
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import InteractiveStoryClient from '@/components/InteractiveStoryClient';
import { getStoryById, stories } from '@/data/stories';

interface ContePageProps {
  params: Promise<{ id: string }>;
}

/** Pré-rendu statique des trois récits du corpus. */
export function generateStaticParams(): { id: string }[] {
  return stories.map((story) => ({ id: story.id }));
}

export async function generateMetadata({ params }: ContePageProps): Promise<Metadata> {
  const { id } = await params;
  const story = getStoryById(id);
  if (!story) return {};
  return {
    title: `${story.title.fr} — Conte interactif — Voix du Faso`,
    description: story.subtitle?.fr ?? `Conte interactif du Burkina Faso`,
  };
}

export default async function ContePage({ params }: ContePageProps) {
  const { id } = await params;
  const story = getStoryById(id);
  if (!story) notFound();
  
  return <InteractiveStoryClient story={story} />;
}

