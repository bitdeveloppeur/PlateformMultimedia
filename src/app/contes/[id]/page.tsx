/**
 * Page conte interactive — redirection vers la vraie page interactive
 * Cette route /contes/ est obsolète, redirige vers /recits/[id]/conte
 */
import { redirect } from 'next/navigation';
import { stories } from '@/data/stories';

interface ContePageProps {
  params: Promise<{ id: string }>;
}

/** Pré-rendu statique des trois récits du corpus. */
export function generateStaticParams(): { id: string }[] {
  return stories.map((story) => ({ id: story.id }));
}

export default async function ContePage({ params }: ContePageProps) {
  const { id } = await params;
  
  // Rediriger vers la vraie page interactive
  redirect(`/recits/${id}/conte`);
}

