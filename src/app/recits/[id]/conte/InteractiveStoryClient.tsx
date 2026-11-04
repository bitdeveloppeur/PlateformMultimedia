'use client';

/**
 * Wrapper client du conte interactif : possède l'UNIQUE instance du moteur
 * audio du récit (contrat d'injection partagé avec StoryPlayerCard) et la
 * passe au stage interactif.
 */
import InteractiveStory from '@/components/InteractiveStory';
import { useMultilingualAudio } from '@/hooks/useMultilingualAudio';
import type { StageBook, Story } from '@/types';

export default function InteractiveStoryPage({ story, book }: { story: Story; book: StageBook }) {
  const audio = useMultilingualAudio({ story });
  return <InteractiveStory story={story} book={book} audio={audio} />;
}
