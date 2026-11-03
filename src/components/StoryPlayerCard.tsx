'use client';

/**
 * StoryPlayerCard — mini-lecteur flottant de la maquette (design « atlas »).
 * Coquille honnête : la lecture audio arrive à l'Étape 3, mais tout ce qui
 * s'affiche est déjà réel et interactif —
 *  • scruber « waveform » segmenté par CHAPITRES du corpus (clic = chapitre) ;
 *  • bascule de LANGUE (met à jour durée et grille de timecodes) ;
 *  • numérotation « Chapitre N sur X · position / durée ».
 * Les barres sont générées de façon déterministe (PRNG semé par l'id du récit) :
 * stables d'un rendu à l'autre, jamais de scintillement.
 */
import { useMemo } from 'react';

import { formatDuration } from './Map3D';
import {
  LANGUAGE_LABELS,
  type Chapter,
  type LanguageCode,
  type Story,
} from '@/types';

/** PRNG mulberry32 — barres identiques à chaque rendu pour un même récit. */
function seededBars(seed: string, count: number): number[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const next = () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, (_, i) => {
    // Bosses régulières pour un rythme « parole » plutôt que bruit sec.
    const speech = 0.55 + 0.45 * Math.sin((i / count) * Math.PI * 7.3);
    return Math.max(0.14, Math.min(1, speech * (0.55 + next() * 0.6)));
  });
}

const TOTAL_BARS = 56;

export interface StoryPlayerCardProps {
  story: Story;
  language: LanguageCode;
  activeChapterIndex: number;
  onLanguageChange: (language: LanguageCode) => void;
  onChapterChange: (chapterIndex: number) => void;
}

export default function StoryPlayerCard({
  story,
  language,
  activeChapterIndex,
  onLanguageChange,
  onChapterChange,
}: StoryPlayerCardProps) {
  const track =
    story.languages.find((t) => t.language === language) ??
    story.languages.find((t) => t.language === 'fr') ??
    story.languages[0];

  const totalSeconds = track.durationHint;
  const activeChapter: Chapter | undefined = story.chapters[activeChapterIndex];

  /** Segments de barres proportionnels à la durée réelle des chapitres. */
  const segments = useMemo(() => {
    const bars = seededBars(story.id, TOTAL_BARS);
    const weights = story.chapters.map(
      (c) => Math.max(1, c.audioEnd - c.audioStart),
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let cursor = 0;
    return story.chapters.map((chapter, i) => {
      const barCount =
        i === story.chapters.length - 1
          ? TOTAL_BARS - cursor
          : Math.max(2, Math.round((weights[i] / totalWeight) * TOTAL_BARS));
      const slice = bars.slice(cursor, cursor + barCount);
      cursor += barCount;
      return { chapter, bars: slice };
    });
  }, [story]);

  return (
    <section className="player" aria-label={`Mini-lecteur — ${story.title.fr}`}>
      <div className="player__top">
        <button
          type="button"
          className="player__btn"
          disabled
          title="Lecture audio multilingue — Étape 3"
          aria-label="Lecture (disponible à l'Étape 3)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 4.5v15l13-7.5-13-7.5z" />
          </svg>
        </button>
        <div style={{ minWidth: 0 }}>
          <p className="player__title">{story.title.fr}</p>
          <p className="player__meta">
            {activeChapter
              ? `Chapitre ${activeChapterIndex + 1} sur ${story.chapters.length} · ${formatDuration(activeChapter.audioStart)} / ${formatDuration(totalSeconds)}`
              : `${formatDuration(totalSeconds)}`}
          </p>
        </div>
        <div
          className="player__langs"
          role="group"
          aria-label="Langue de la narration"
        >
          {story.languages.map((t) => (
            <button
              key={t.language}
              type="button"
              className={`lang-chip${t.language === language ? ' is-active' : ''}`}
              onClick={() => onLanguageChange(t.language)}
              aria-pressed={t.language === language}
            >
              {LANGUAGE_LABELS[t.language].native}
            </button>
          ))}
        </div>
      </div>

      <div className="player__wave">
        <div className="wave__bars" role="group" aria-label="Chapitres du récit">
          {segments.map(({ chapter, bars }, index) => (
            <button
              key={chapter.id}
              type="button"
              className={`wave__chapter${index === activeChapterIndex ? ' is-active' : ''}`}
              style={{ flexGrow: bars.length }}
              onClick={() => onChapterChange(index)}
              title={`${index + 1}. ${chapter.title.fr} — ${formatDuration(chapter.audioStart)}`}
              aria-label={`Chapitre ${index + 1} : ${chapter.title.fr}`}
              aria-current={index === activeChapterIndex || undefined}
            >
              {bars.map((height, barIndex) => (
                <span
                  key={barIndex}
                  className="wave__bar"
                  style={{ ['--h' as string]: `${Math.round(height * 100)}%` }}
                />
              ))}
            </button>
          ))}
        </div>
        <div className="wave__ticks" aria-hidden="true">
          {story.chapters.map((chapter, index) => (
            <span
              key={chapter.id}
              className={`wave__tick${index === activeChapterIndex ? ' is-active' : ''}`}
              style={{ left: `${(chapter.audioStart / totalSeconds) * 100}%` }}
            >
              {formatDuration(chapter.audioStart)}
            </span>
          ))}
          <span
            className="wave__tick"
            style={{ left: '100%', transform: 'translateX(-100%)' }}
          >
            {formatDuration(totalSeconds)}
          </span>
        </div>
      </div>
    </section>
  );
}
