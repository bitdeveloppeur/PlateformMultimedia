'use client';

/**
 * AtlasExperience — interface « atlas lumineux » (refonte d'après maquette).
 * En-tête de navigation + corps en deux colonnes : sidebar éditoriale
 * (stats, filtres, fiches numérotées) et panneau carte (fond, contrôles,
 * mini-lecteur flottant) — le tout câblé sur le moteur Map3D (Étape 2).
 */
import { useCallback, useMemo, useRef, useState } from 'react';

import Map3D, {
  cameraViewFromChapter,
  cameraViewFromStory,
  formatDuration,
  type Map3DHandle,
} from './Map3D';
import StoryPlayerCard from './StoryPlayerCard';
import {
  LANGUAGE_LABELS,
  STORY_CATEGORY_LABELS,
  type LanguageCode,
  type Story,
  type StoryCategory,
} from '@/types';

type CategoryFilter = 'tous' | StoryCategory;

const FILTERS: readonly { id: CategoryFilter; label: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'legende', label: 'Légendes' },
  { id: 'conte', label: 'Contes' },
  { id: 'histoire', label: 'Histoire' },
];

const NAV_ITEMS = ['Carte', 'Récits', 'Langues', 'Conteurs', 'À propos'] as const;

export default function AtlasExperience({ stories }: { stories: Story[] }) {
  const mapRef = useRef<Map3DHandle | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>('tous');

  const selected = useMemo(
    () => stories.find((s) => s.id === selectedId) ?? null,
    [stories, selectedId],
  );

  const stats = useMemo(
    () => ({
      recits: stories.length,
      chapitres: stories.reduce((n, s) => n + s.chapters.length, 0),
      langues: new Set(stories.flatMap((s) => s.languages.map((t) => t.language))).size,
      minutes: Math.round(
        stories.reduce(
          (n, s) => n + (s.languages.find((t) => t.language === 'fr')?.durationHint ?? 0),
          0,
        ) / 60,
      ),
    }),
    [stories],
  );

  const visible = useMemo(
    () => (filter === 'tous' ? stories : stories.filter((s) => s.category === filter)),
    [stories, filter],
  );
  const visibleIds = useMemo(() => visible.map((s) => s.id), [visible]);

  /** Sélection (marqueur ou fiche) → surbrillance + vol caméra narratif. */
  const handleSelect = useCallback((story: Story) => {
    setSelectedId(story.id);
    mapRef.current?.flyToStory(cameraViewFromStory(story));
  }, []);

  const handleReset = useCallback(() => {
    setSelectedId(null);
    mapRef.current?.resetView();
  }, []);

  /** Choix de chapitre (scruber) → vol vers le décor du chapitre.
   *  La position audio, elle, est portée par le lecteur (useMultilingualAudio). */
  const handleChapterChange = useCallback((story: Story, chapterIndex: number) => {
    setSelectedId(story.id);
    mapRef.current?.flyToStory(cameraViewFromChapter(story, chapterIndex));
  }, []);

  return (
    <div className="atlas">
      <header className="atlas__header">
        <div className="brand">
          <span className="brand__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
            </svg>
          </span>
          <strong>Voix du Faso</strong>
        </div>
        <nav className="atlas__nav" aria-label="Navigation principale">
          {NAV_ITEMS.map((item, index) => (
            <a
              key={item}
              href="#"
              className={index === 0 ? 'is-active' : undefined}
              aria-current={index === 0 ? 'page' : undefined}
              onClick={(e) => e.preventDefault()}
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="atlas__header-actions">
          <button type="button" className="lang-btn" title="Langue de l'interface — à venir">
            FR ▾
          </button>
          <button type="button" className="cta-btn" title="Formulaire de collecte — à venir">
            Proposer un récit
          </button>
        </div>
      </header>

      <div className="atlas__body">
        <aside className="sidebar" aria-label="Récits du corpus">
          <p className="eyebrow" style={{ margin: 0 }}>Atlas sonore · Burkina Faso</p>
          <h1 className="sidebar__title">Écoutez les récits là où ils sont nés</h1>

          <div className="stats">
            <div className="stat"><b>{stats.recits}</b><span>récits</span></div>
            <div className="stat"><b>{stats.chapitres}</b><span>chapitres</span></div>
            <div className="stat"><b>{stats.langues}</b><span>langues</span></div>
            <div className="stat"><b>{stats.minutes}</b><span>minutes</span></div>
          </div>

          <div className="filters" role="group" aria-label="Filtrer par catégorie">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`chip${filter === f.id ? ' is-active' : ''}`}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
              >
                {f.label}
              </button>
            ))}
          </div>

          {visible.map((story) => {
            const order = stories.indexOf(story) + 1;
            const frTrack =
              story.languages.find((t) => t.language === 'fr') ?? story.languages[0];
            const languages = story.languages
              .map((t) => LANGUAGE_LABELS[t.language].native)
              .join(', ');
            return (
              <button
                key={story.id}
                type="button"
                className={`story-card cat--${story.category}${story.id === selectedId ? ' is-selected' : ''}`}
                onClick={() => handleSelect(story)}
                aria-pressed={story.id === selectedId}
              >
                <span className="story-card__badge" aria-hidden="true">{order}</span>
                <span className="story-card__body">
                  <span className="story-card__eyebrow" style={{ display: 'block' }}>
                    {STORY_CATEGORY_LABELS[story.category]} · {formatDuration(frTrack.durationHint)}
                  </span>
                  <span className="story-card__title" style={{ display: 'block' }}>
                    {story.title.fr}
                  </span>
                  {story.subtitle && (
                    <span className="story-card__subtitle" style={{ display: 'block' }}>
                      {story.subtitle.fr}
                    </span>
                  )}
                  <span className="story-card__meta" style={{ display: 'block' }}>
                    {story.region.name} · {languages}
                  </span>
                </span>
              </button>
            );
          })}

          {selected && (
            <button type="button" className="chip" onClick={handleReset}>
              ← Vue d&apos;ensemble du Burkina
            </button>
          )}
        </aside>

        <div className="map-panel">
          <Map3D
            ref={mapRef}
            stories={stories}
            selectedStoryId={selectedId ?? undefined}
            visibleStoryIds={visibleIds}
            onSelectStory={handleSelect}
          />

          {/* Mini-lecteur flottant — moteur useMultilingualAudio (Étape 3) */}
          {selected && (
            <StoryPlayerCard
              story={selected}
              onChapterChange={(chapterIndex) => handleChapterChange(selected, chapterIndex)}
              openHref={`/recits/${selected.id}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
