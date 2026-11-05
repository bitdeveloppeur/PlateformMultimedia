'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Story } from '@/types';

interface HomeHeroProps {
  stories: Story[];
}

export default function HomeHero({ stories }: HomeHeroProps) {
  const [selectedLang, setSelectedLang] = useState<'fr' | 'moore' | 'fulfulde' | 'dioula'>('fr');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <div className="home-hero">
      {/* Background avec effet feu de camp */}
      <div className="hero-bg" />
      
      {/* Navigation */}
      <header className="hero-nav">
        <div className="hero-brand">
          <span className="hero-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
          </span>
          <strong>Voix du Faso</strong>
        </div>
      </header>

      {/* Hero Content */}
      <main className="hero-main">
        <div className="hero-content">
          <h1 className="hero-title">Ce soir, qui raconte ?</h1>
          <p className="hero-subtitle">
            Légendes, contes et histoires du Burkina Faso, dits à voix haute par celles et ceux qui les gardent.
          </p>
          
          {/* Sélecteur de langue */}
          <div className="hero-lang-selector">
            <span className="lang-label">Écouter en :</span>
            <div className="lang-buttons">
              <button
                className={`lang-btn ${selectedLang === 'fr' ? 'active' : ''}`}
                onClick={() => setSelectedLang('fr')}
              >
                Français
              </button>
              <button
                className={`lang-btn ${selectedLang === 'moore' ? 'active' : ''}`}
                onClick={() => setSelectedLang('moore')}
              >
                Mooré
              </button>
              <button
                className={`lang-btn ${selectedLang === 'fulfulde' ? 'active' : ''}`}
                onClick={() => setSelectedLang('fulfulde')}
              >
                Fulfulde
              </button>
              <button
                className={`lang-btn ${selectedLang === 'dioula' ? 'active' : ''}`}
                onClick={() => setSelectedLang('dioula')}
              >
                Dioula
              </button>
            </div>
          </div>
        </div>

        {/* Étagère de récits */}
        <div className="hero-shelf">
          {stories.slice(0, 3).map((story, index) => {
            const frTrack = story.languages.find((t) => t.language === 'fr') ?? story.languages[0];
            const duration = Math.round(frTrack.durationHint / 60);
            const coverImages = [
              '/images/covers/mzRNU.png', // Yennenga
              '/images/covers/oaLPy.png', // Le Lièvre
              '/images/covers/kUm12.png', // Loropéni
            ];
            
            return (
              <Link
                key={story.id}
                href={`/contes/${story.id}`}
                className={`story-book cat--${story.category}`}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  transform: hoveredCard === index ? 'translateY(-12px) scale(1.05)' : 'translateY(0) scale(1)',
                }}
              >
                <div className="book-cover">
                  <img
                    src={coverImages[index]}
                    alt={story.cover.alt.fr}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                  <div className="book-glow" />
                </div>
                <div className="book-info">
                  <span className="book-category">
                    {story.category === 'legende' ? 'LÉGENDE' : story.category === 'conte' ? 'CONTE' : 'HISTOIRE'}  ·  {duration}:{frTrack.durationHint % 60 < 10 ? '0' : ''}{frTrack.durationHint % 60}
                  </span>
                  <h3 className="book-title">{story.title.fr}</h3>
                  {story.subtitle && <p className="book-subtitle">{story.subtitle.fr}</p>}
                  <div className="book-meta">
                    <span>{story.region.name}</span>
                    <span>—</span>
                    <span>{story.languages.map(t => t.language === 'fr' ? 'Français' : t.language === 'moore' ? 'Mooré' : t.language === 'fulfulde' ? 'Fulfulde' : 'Dioula').join(' · ')}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer stats */}
        <footer className="hero-footer">
          <p className="hero-stats">
            {stories.length} RÉCITS  ·  
            {stories.reduce((n, s) => n + s.chapters.length, 0)} CHAPITRES  ·  
            4 LANGUES  ·  
            {Math.round(stories.reduce((n, s) => n + (s.languages[0]?.durationHint ?? 0), 0) / 60)} MIN D'ÉCOUTE
          </p>
        </footer>
      </main>
    </div>
  );
}
