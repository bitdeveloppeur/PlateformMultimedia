/**
 * Page d'accueil — La veillée interactive
 */
import HomeHero from '@/components/HomeHero';
import { stories } from '@/data/stories';
import './home.css';

export default function HomePage() {
  return <HomeHero stories={stories} />;
}
