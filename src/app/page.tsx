/**
 * Page Atlas (Server Component).
 * Le corpus est validé côté serveur (frontière de confiance de `stories.ts`)
 * puis injecté — sérialisable — dans l'expérience client.
 */
import AtlasExperience from '@/components/AtlasExperience';
import { stories } from '@/data/stories';

export default function AtlasPage() {
  return <AtlasExperience stories={stories} />;
}
