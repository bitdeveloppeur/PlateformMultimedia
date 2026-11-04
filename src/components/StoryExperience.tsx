'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  StoryExperience — page récit plein cadre (Étape 4 · 1/2)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Fiche éditoriale (cover, ère, peuples, crédits) + scrollytelling chapitre
 *  par chapitre, avec carte 3D sticky qui vole au décor de chaque chapitre.
 *
 *  Synchronisation audio ↔ scroll ↔ caméra — UNE instance du moteur
 *  useMultilingualAudio (propriétaire unique, partagée avec le lecteur
 *  compact par injection — le cache module-level de Howls interdit deux
 *  moteurs sur le même récit) :
 *   • scroll → audio : IntersectionObserver ; le panneau le plus visible
 *     (≥ 55 %) devenant le chapitre courant → goToChapter (seek) ;
 *   • audio → scroll : pendant la lecture, chaque frontière de chapitre
 *     franchie amène en douceur son panneau au bord haut — SUPPRIMÉ pendant
 *     800 ms après un geste de scroll utilisateur (jamais de lutte) et en
 *     `prefers-reduced-motion` ;
 *   • chapitre → caméra : flyToStory(cameraViewFromChapter) à chaque
 *     changement de chapitre actif, quelle que soit la source du changement.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import Map3D, {
  cameraViewFromChapter,
  cameraViewFromStory,
  formatDuration,
  type Map3DHandle,
} from './Map3D';
import StoryPlayerCard from './StoryPlayerCard';
import { useMultilingualAudio } from '@/hooks/useMultilingualAudio';
import { LANGUAGE_LABELS, STORY_CATEGORY_LABELS, type Story } from '@/types';

/** Fenêtre pendant laquelle l'auto-suivi renonce après un scroll utilisateur. */
const USER_SCROLL_GRACE_MS = 800;
/**
 * Fenêtre pendant laquelle l'observateur scroll→audio s'abstient après un
 * changement de chapitre d'origine AUDIO (frontière franchie en lecture, clic
 * waveform, « Écouter ce chapitre ») : sans elle, l'observateur verrait encore
 * l'ANCIEN panneau majoritairement visible et annulerait le seek — puis
 * l'auto-suivi re-seekerait, en boucle. Le délai couvre le scroll fluide vers
 * le nouveau panneau.
 */
const PROGRAMMATIC_GRACE_MS = 1400;
/** Visibilité minimale d'un panneau pour devenir le chapitre courant. */
const PANEL_ACTIVATION_RATIO = 0.55;

export default function StoryExperience({ story }: { story: Story }) {
  const mapRef = useRef<Map3DHandle | null>(null);
  /* L'unique moteur audio du récit — partagé avec le lecteur injecté. */
  const audio = useMultilingualAudio({ story });

  const [reducedMotion, setReducedMotion] = useState(false);

  /* ── Chorégraphie du scroll ──────────────────────────────────────────────── */
  const panelsRef = useRef<(HTMLElement | null)[]>([]);
  /** Horodatage jusqu'auquel l'auto-suivi est suspendu (geste utilisateur). */
  const userScrollUntilRef = useRef(0);
  /** Horodatage jusqu'auquel l'observateur scroll→audio s'abstient (grâce
   *  programme : changement de chapitre venu de l'audio). */
  const programmaticUntilRef = useRef(0);
  /** Dernier chapitre vers lequel l'auto-suivi a défilé (anti-oscillation). */
  const lastFollowedChapterRef = useRef(-1);
  /** Le premier vol caméra vient de `initialView` de la carte (anti-doublon). */
  const skippedFirstFlyRef = useRef(false);

  /* Moteur toujours frais pour les callbacks hors React (observer). */
  const audioRef = useRef(audio);
  audioRef.current = audio;

  /* 0. Réduction de mouvement : pas d'auto-scroll ni de vols doux. */
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  /* 1. Geste de scroll utilisateur → suspension temporaire de l'auto-suivi. */
  useEffect(() => {
    const markUserScroll = () => {
      userScrollUntilRef.current = performance.now() + USER_SCROLL_GRACE_MS;
    };
    window.addEventListener('wheel', markUserScroll, { passive: true });
    window.addEventListener('touchmove', markUserScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', markUserScroll);
      window.removeEventListener('touchmove', markUserScroll);
    };
  }, []);

  /* 2. scroll → audio : le panneau le plus visible devient le chapitre lu —
   *     SAUF pendant la grâce programme : un chapitre vient de changer côté
   *     audio (lecture, clic), l'auto-scroll amène son panneau ; laisser
   *     l'observateur agir maintenant annulerait ce changement (guerre de
   *     seek entre les deux sens de synchronisation). */
  useEffect(() => {
    const ratios = new Array<number>(story.chapters.length).fill(0);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.chapterIndex);
          if (Number.isFinite(index)) ratios[index] = entry.intersectionRatio;
        }
        if (performance.now() < programmaticUntilRef.current) return;
        let best = -1;
        let bestRatio = 0;
        ratios.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = index;
          }
        });
        const engine = audioRef.current;
        if (best >= 0 && bestRatio >= PANEL_ACTIVATION_RATIO && best !== engine.activeChapterIndex) {
          engine.goToChapter(best);
        }
      },
      { threshold: [0, 0.25, 0.55, 0.8] },
    );

    for (const panel of panelsRef.current) panel && observer.observe(panel);
    return () => observer.disconnect();
  }, [story]);

  /* 2 bis. Toute transition de chapitre d'origine AUDIO (lecture qui franchit
   *     une frontière, clic waveform, « Écouter ce chapitre ») ouvre la grâce
   *     programme : l'observateur scroll→audio s'abstient le temps que
   *     l'auto-suivi amène le panneau correspondant. */
  useEffect(() => {
    programmaticUntilRef.current = performance.now() + PROGRAMMATIC_GRACE_MS;
  }, [audio.activeChapterIndex, audio.isPlaying]);

  /* 3. audio → scroll : suivre le panneau du chapitre actif pendant la
   *     lecture, sauf geste utilisateur récent ou réduction de mouvement. */
  useEffect(() => {
    const chapter = audio.activeChapterIndex;
    if (!audio.isPlaying || reducedMotion || chapter < 0) return;
    if (performance.now() < userScrollUntilRef.current) return;
    if (chapter === lastFollowedChapterRef.current) return;
    lastFollowedChapterRef.current = chapter;
    panelsRef.current[chapter]?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [audio.activeChapterIndex, audio.isPlaying, reducedMotion]);

  /* 4. chapitre → caméra : la carte sticky vole au décor du chapitre actif.
   *     Le tout premier vol est celui de `initialView` (montage de la carte). */
  useEffect(() => {
    if (!skippedFirstFlyRef.current) {
      skippedFirstFlyRef.current = true;
      return;
    }
    if (audio.activeChapterIndex < 0) return;
    mapRef.current?.flyToStory(
      reducedMotion
        ? { ...cameraViewFromChapter(story, audio.activeChapterIndex), durationMs: 0 }
        : cameraViewFromChapter(story, audio.activeChapterIndex),
    );
  }, [audio.activeChapterIndex, reducedMotion, story]);

  /* ── Interactions ponctuelles ────────────────────────────────────────────── */

  const handleListen = useCallback(() => {
    audioRef.current.toggle();
  }, []);

  const handleListenChapter = useCallback((chapterIndex: number) => {
    const engine = audioRef.current;
    engine.goToChapter(chapterIndex);
    if (!engine.isPlaying) void engine.play();
  }, []);

  /* ── Contenu dérivé ──────────────────────────────────────────────────────── */

  const narrators = useMemo(
    () =>
      story.languages
        .map((track) => track.narrator)
        .filter((narrator): narrator is string => !!narrator)
        .join(' · '),
    [story.languages],
  );
  const languagesLine = useMemo(
    () => story.languages.map((track) => LANGUAGE_LABELS[track.language].native).join(' · '),
    [story.languages],
  );
  const coverAlt = story.cover.alt.fr;

  return (
    <div className={`sxp cat--${story.category}`}>
      <header className="sxp__header">
        <Link className="sxp__back" href="/" title="Retour à l'atlas sonore">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M19 12H5m0 0 6-6m-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Atlas
        </Link>
        <p className="sxp__eyebrow">
          <span className="cat-chip">{STORY_CATEGORY_LABELS[story.category]}</span>
          {story.era}
        </p>
      </header>

      <div className="sxp__body">
        {/* ── Colonne narrative (scroll) ─────────────────────────────────── */}
        <div className="sxp__scroll">
          <section className="sxp__hero" aria-labelledby="sxp-title">
            <figure className="sxp__cover">
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG statique généré, pas d'optimisation utile */}
              <img src={story.cover.image} alt={coverAlt} />
            </figure>
            <div className="sxp__hero-body">
              <h1 className="sxp__title" id="sxp-title">
                {story.title.fr}
              </h1>
              {story.subtitle?.fr && <p className="sxp__subtitle">{story.subtitle.fr}</p>}
              <dl className="sxp__meta">
                <div>
                  <dt>Région</dt>
                  <dd>
                    {story.region.name} — {story.region.department}
                  </dd>
                </div>
                <div>
                  <dt>Peuple dépositaire</dt>
                  <dd>{story.people}</dd>
                </div>
                <div>
                  <dt>Langues</dt>
                  <dd>{languagesLine}</dd>
                </div>
                <div>
                  <dt>Durée</dt>
                  <dd>
                    {formatDuration(audio.timelineDuration)} · {story.chapters.length} chapitres
                  </dd>
                </div>
              </dl>
              <div className="sxp__actions">
                <button type="button" className="sxp__cta" onClick={handleListen}>
                  {audio.isPlaying ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                      </svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M6 4.5v15l13-7.5-13-7.5z" />
                      </svg>
                      Écouter le récit
                    </>
                  )}
                </button>
                <p className="sxp__hint">
                  La carte suit la narration ; le scroll change de chapitre.
                </p>
              </div>
            </div>
          </section>

          {story.chapters.map((chapter, index) => {
            const image = chapter.triggers.find(
              (trigger) => trigger.type === 'visual:image',
            );
            const state =
              index === audio.activeChapterIndex ? 'active' : index < audio.activeChapterIndex ? 'past' : 'future';
            /* Narration dans la langue d'écoute quand elle existera, repli fr. */
            const narration = chapter.narration[audio.language] ?? chapter.narration.fr;
            return (
              <section
                key={chapter.id}
                ref={(el) => {
                  panelsRef.current[index] = el;
                }}
                data-chapter-index={index}
                data-state={state}
                className={`sxp-panel${index === audio.activeChapterIndex ? ' is-active' : ''}`}
                aria-labelledby={`sxp-panel-${chapter.id}`}
              >
                <p className="sxp-panel__index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <div className="sxp-panel__head">
                  <h2 className="sxp-panel__title" id={`sxp-panel-${chapter.id}`}>
                    {chapter.title.fr}
                  </h2>
                  <p className="sxp-panel__time">
                    {formatDuration(chapter.audioStart)} — {formatDuration(chapter.audioEnd)}
                  </p>
                </div>

                {image && image.type === 'visual:image' && (
                  <figure className={`sxp-panel__figure t-${image.treatment ?? 'fade'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- illustration SVG générée */}
                    <img src={image.src} alt={image.alt.fr} loading="lazy" />
                  </figure>
                )}

                <p className="sxp-panel__narration">{narration}</p>

                <button
                  type="button"
                  className="sxp-panel__listen"
                  onClick={() => handleListenChapter(index)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M6 4.5v15l13-7.5-13-7.5z" />
                  </svg>
                  {audio.activeChapterIndex === index && audio.isPlaying
                    ? 'En lecture…'
                    : 'Écouter ce chapitre'}
                </button>
              </section>
            );
          })}

          <footer className="sxp__credits">
            <h2 className="sxp__credits-title">Collectage & sources</h2>
            <p className="sxp__credits-line">{story.credits.collectedAt}</p>
            <ul className="sxp__credits-sources">
              {story.credits.sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
            <p className="sxp__credits-line">{story.credits.license}</p>
            {narrators && (
              <p className="sxp__credits-line">
                Voix : {narrators} <em>(démonstration)</em>
              </p>
            )}
            <Link className="sxp__back-cta" href="/">
              ← Retour à l'atlas sonore
            </Link>
          </footer>
        </div>

        {/* ── Scène sticky : carte 3D + lecteur compact ───────────────────── */}
        <aside className="sxp__stage" aria-label="Scène cartographique du récit">
          <Map3D
            ref={mapRef}
            stories={[story]}
            selectedStoryId={story.id}
            visibleStoryIds={[story.id]}
            initialView={cameraViewFromStory(story)}
          />
          <StoryPlayerCard
            story={story}
            audio={audio}
            onChapterChange={(chapterIndex) =>
              mapRef.current?.flyToStory(cameraViewFromChapter(story, chapterIndex))
            }
          />
        </aside>
      </div>
    </div>
  );
}
