'use client';

/**
 * StoryPlayerCard — lecteur flottant (Étape 3 · 2/2).
 * Branché sur le moteur useMultilingualAudio :
 *  • lecture / pause vivantes, position réelle sur la grille de référence ;
 *  • scruber « waveform » segmenté par chapitres : la tête de lecture suit
 *    currentTime, un clic (chapitre) seek + fait voler la caméra (callback) ;
 *  • chips de langue → bascule EN DIRECT, position narratif conservée ;
 *  • phrase sous-titrée active affichée en temps réel (cue horodaté) ;
 *  • chaîne de repli + message d'erreur propre si les masters manquent.
 * Les barres sont générées de façon déterministe (PRNG semé par l'id du récit).
 */
import { useMemo } from 'react';

import { formatDuration } from './Map3D';
import { useMultilingualAudio } from '@/hooks/useMultilingualAudio';
import { LANGUAGE_LABELS } from '@/types';

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
  /** Récit lu — changer de récit remet le moteur à zéro dans sa langue par défaut. */
  story: Parameters<typeof useMultilingualAudio>[0]['story'];
  /** Chapitre choisi (clic scruber) → la scène carte vole vers son décor. */
  onChapterChange: (chapterIndex: number) => void;
}

export default function StoryPlayerCard({ story, onChapterChange }: StoryPlayerCardProps) {
  const audio = useMultilingualAudio({ story });
  const totalSeconds = audio.timelineDuration;

  /** Segments de barres proportionnels à la durée réelle des chapitres. */
  const segments = useMemo(() => {
    const bars = seededBars(story.id, TOTAL_BARS);
    const weights = story.chapters.map(
      (chapter) => Math.max(1, chapter.audioEnd - chapter.audioStart),
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

  const playLabel = audio.isPlaying ? 'Pause' : 'Lecture';
  const subtitleText = audio.activeSubtitle?.cue.text ?? null;
  const subtitleKey = `${audio.activeSubtitle?.cue.start ?? 'x'}-${audio.activeSubtitle?.cueLanguage ?? 'x'}`;

  return (
    <section className="player" aria-label={`Lecteur — ${story.title.fr}`}>
      <div className="player__top">
        <button
          type="button"
          className="player__btn"
          onClick={audio.toggle}
          disabled={!!audio.error}
          aria-label={audio.error ? 'Lecture indisponible' : playLabel}
          title={audio.error ?? playLabel}
        >
          {audio.isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginLeft: 0 }}>
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 4.5v15l13-7.5-13-7.5z" />
            </svg>
          )}
        </button>
        <div style={{ minWidth: 0 }}>
          <p className="player__title">{story.title.fr}</p>
          <p className="player__meta">
            {audio.activeChapter
              ? `Chapitre ${audio.activeChapterIndex + 1} sur ${story.chapters.length} · ${formatDuration(audio.currentTime)} / ${formatDuration(totalSeconds)}`
              : `${formatDuration(totalSeconds)}`}
            {audio.fallbackFrom && (
              <span title={`Piste « ${audio.fallbackFrom} » indisponible`}>
                {' '}· piste {audio.effectiveLanguage ? LANGUAGE_LABELS[audio.effectiveLanguage].native : '—'}
              </span>
            )}
          </p>
        </div>
        <div className="player__langs" role="group" aria-label="Langue de la narration">
          {audio.availableLanguages.map((code) => (
            <button
              key={code}
              type="button"
              className={`lang-chip${code === audio.language ? ' is-active' : ''}`}
              onClick={() => audio.setLanguage(code)}
              aria-pressed={code === audio.language}
              title={`Basculer en ${LANGUAGE_LABELS[code].native} — position conservée`}
            >
              {LANGUAGE_LABELS[code].native}
            </button>
          ))}
        </div>
      </div>

      {/* Phrase sous-titrée active (timecodes du corpus, repli fr automatique) */}
      <p
        key={subtitleKey}
        className={`player__subtitle${audio.error ? ' is-error' : ''}`}
        aria-live="polite"
      >
        {audio.error ?? subtitleText ?? '—'}
      </p>

      <div className="player__wave">
        <div className="wave__bars" role="group" aria-label="Chapitres du récit">
          {/* Voile « déjà écouté » + tête de lecture (grille de référence) */}
          <span
            className="wave__played"
            style={{ width: `${audio.progress * 100}%` }}
            aria-hidden="true"
          />
          <span
            className="wave__playhead"
            style={{ left: `${audio.progress * 100}%` }}
            aria-hidden="true"
          />
          {segments.map(({ chapter, bars }, index) => (
            <button
              key={chapter.id}
              type="button"
              className={`wave__chapter${index === audio.activeChapterIndex ? ' is-active' : ''}`}
              style={{ flexGrow: bars.length }}
              onClick={() => {
                audio.goToChapter(index);
                onChapterChange(index);
              }}
              title={`${index + 1}. ${chapter.title.fr} — ${formatDuration(chapter.audioStart)}`}
              aria-label={`Chapitre ${index + 1} : ${chapter.title.fr}`}
              aria-current={index === audio.activeChapterIndex || undefined}
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
              className={`wave__tick${index === audio.activeChapterIndex ? ' is-active' : ''}`}
              style={{ left: `${(chapter.audioStart / totalSeconds) * 100}%` }}
            >
              {formatDuration(chapter.audioStart)}
            </span>
          ))}
          <span className="wave__tick" style={{ left: '100%', transform: 'translateX(-100%)' }}>
            {formatDuration(totalSeconds)}
          </span>
        </div>
      </div>
    </section>
  );
}
