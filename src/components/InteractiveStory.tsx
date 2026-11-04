'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  InteractiveStory — conte page-par-page sur stage SVG (design story.pen)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Portage React du prototype Pencil : une scène 1600×900 où les acteurs
 *  (cavalière, roi, gombo, chasseur, forêt, mère, buissons) glissent entre
 *  les poses de chaque page (transitions CSS retargetées), avec une
 *  micro-tâche tactile par chapitre et un anneau d'indication.
 *
 *  Apports vs prototype :
 *  • AUDIO RÉEL injecté (prop `audio` — useMultilingualAudio, propriété de la
 *    page route) : « Écouter » joue la narration TTS du chapitre de la page
 *    (speechSynthesis du prototype remplacée) ; sous-titre cue actif affiché ;
 *    changer de page pendant la lecture seek le chapitre correspondant ;
 *  • calques SVG publics chargés en ligne (fetch + cache module) — requis
 *    pour animer leurs classes CSS ;
 *  • a11y : cibles = boutons (focus, Entrée/Espace), flèches clavier,
 *    prefers-reduced-motion.
 *
 *  Choregraphie impérative : les poses sont pilotées par React (styles), les
 *  animations ponctuelles (galop, secousse, semis, étoiles, buissons, câlin)
 *  manipulent des classes via refs — comme le prototype.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import type { MultilingualAudio } from '@/hooks/useMultilingualAudio';
import type { StageBook, StagePose, StageScene } from '@/types/stage';
import type { Story } from '@/types/story';

/* ── Chargement des calques SVG publics (en ligne, cache module) ──────────── */
const LAYER_CACHE = new Map<string, string>();

async function loadLayer(storyId: string, name: string): Promise<string> {
  const key = `${storyId}/${name}`;
  const cached = LAYER_CACHE.get(key);
  if (cached !== undefined) return cached;
  const response = await fetch(`/stage/${storyId}/${name}.svg`);
  if (!response.ok) throw new Error(`calque ${key} : HTTP ${response.status}`);
  const text = await response.text();
  LAYER_CACHE.set(key, text);
  return text;
}

const LAYER_NAMES = ['savane', 'yennenga', 'roi', 'gombo', 'chasseur', 'foret', 'mere', 'buisson'] as const;

function useStageLayers(storyId: string): Partial<Record<string, string>> {
  const [layers, setLayers] = useState<Partial<Record<string, string>>>({});
  useEffect(() => {
    let alive = true;
    void (async () => {
      const entries = await Promise.all(
        LAYER_NAMES.map(async (name) => [name, await loadLayer(storyId, name)] as const),
      );
      if (alive) setLayers(Object.fromEntries(entries));
    })();
    return () => {
      alive = false;
    };
  }, [storyId]);
  return layers;
}

/** PRNG mulberry32 — étoiles de fond déterministes (pas d'écart d'hydratation). */
function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const STAR_PATH = 'M0-26L7-8 26-7 11 5 16 24 0 13-16 24-11 5-26-7-7-8Z';

/** Style de pose d'un acteur (ou fondu hors scène si `null`). */
const poseStyle = (pose: StagePose | null | undefined): React.CSSProperties =>
  !pose
    ? { opacity: 0, pointerEvents: 'none', transform: 'translate(0px, 0px) scale(1)' }
    : {
        opacity: pose.o ?? 1,
        transform: `translate(${pose.x || 0}px, ${pose.y || 0}px) scale(${pose.s || 1})`,
      };

export interface InteractiveStoryProps {
  story: Story;
  book: StageBook;
  /** Moteur audio du récit — propriété de la page route (injection). */
  audio: MultilingualAudio;
}

export default function InteractiveStory({ story, book, audio }: InteractiveStoryProps) {
  const layers = useStageLayers(story.id);
  const { width: W, height: H } = book.stage;
  const pageCount = book.pages.length;

  /* ── État du livre ────────────────────────────────────────────────────────── */
  const [page, setPage] = useState(0);
  const [donePages, setDonePages] = useState<ReadonlySet<number>>(new Set());
  const [hint, setHint] = useState<{ x: number; y: number; r: number } | null>(null);
  const [bubbleShown, setBubbleShown] = useState(false);
  const [hunterFound, setHunterFound] = useState(false);
  const [forestX, setForestX] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const scene = book.pages[page] as StageScene;
  const isDone = donePages.has(page);

  /* Refs d'animation impérative (classes CSS, comme le prototype). */
  const riderRef = useRef<SVGGElement | null>(null);
  const kingInnerRef = useRef<SVGGElement | null>(null);
  const motherInnerRef = useRef<SVGGElement | null>(null);
  const plantRefs = useRef<(SVGGElement | null)[]>([]);
  const bushRefs = useRef<(SVGGElement | null)[]>([]);
  const starRefs = useRef<(SVGPathElement | null)[]>([]);
  const busyRef = useRef(false);
  const tapsRef = useRef(0);

  /* Étoiles de fond déterministes (une fois par livre). */
  const bgStars = useMemo(() => {
    const rnd = seededRandom(story.id);
    return Array.from({ length: 70 }, () => ({
      cx: rnd() * W,
      cy: rnd() * (H * 0.58),
      r: rnd() * 2 + 0.6,
      opacity: rnd() * 0.6 + 0.2,
    }));
  }, [story.id, W, H]);

  /* ── Réduction de mouvement ─────────────────────────────────────────────── */
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  /* ── Galop : le cheval bondit, la poussière fusienn ─────────────────────── */
  const gallop = useCallback(
    (durationMs = 2400) => {
      const rider = riderRef.current;
      if (!rider || busyRef.current || reducedMotion) return;
      busyRef.current = true;
      rider.classList.add('ikt-galloping');
      const pose = scene.rider;
      if (pose) {
        const back = `translate(${pose.x}px, ${pose.y}px) scale(${pose.s || 1})`;
        rider.style.transform = `translate(${pose.x + 520}px, ${pose.y}px) scale(${pose.s || 1})`;
        setTimeout(() => {
          rider.style.transform = back;
        }, durationMs / 2);
      }
      setTimeout(() => {
        rider.classList.remove('ikt-galloping');
        busyRef.current = false;
      }, durationMs);
    },
    [scene.rider, reducedMotion],
  );

  const complete = useCallback(() => {
    setDonePages((prev) => (prev.has(page) ? prev : new Set(prev).add(page)));
    setHint(null);
  }, [page]);

  /* ── Navigation ──────────────────────────────────────────────────────────── */
  const goNext = useCallback(() => {
    setPage((current) => (current === pageCount - 1 ? 0 : current + 1));
  }, [pageCount]);
  const goPrev = useCallback(() => setPage((current) => Math.max(0, current - 1)), []);

  /* Reset des tâches + anneau d'indication + suivi audio à chaque page. */
  useEffect(() => {
    tapsRef.current = 0;
    setBubbleShown(false);
    setHunterFound(false);
    setForestX(null);
    setHint(null);
    for (const plant of plantRefs.current) plant?.classList.remove('ikt-grown', 'ikt-dry');
    for (const bush of bushRefs.current) bush?.classList.remove('ikt-open');
    for (const star of starRefs.current) star?.classList.replace('ikt-on', 'ikt-off');

    if (scene.act && !donePages.has(page)) {
      const timer = setTimeout(() => {
        const p = book.pages[page];
        if (p.act === 'gallop' && p.rider) setHint({ x: p.rider.x + 300 * (p.rider.s || 1), y: p.rider.y + 260 * (p.rider.s || 1), r: 110 });
        else if (p.act === 'king' && p.king) setHint({ x: p.king.x + 170, y: p.king.y + 190, r: 110 });
        else if (p.act === 'okra') setHint({ x: book.holes[0][0], y: book.holes[0][1] - 30, r: 60 });
        else if (p.act === 'stars') setHint({ x: book.starPos[0][0], y: book.starPos[0][1], r: 50 });
        else if (p.act === 'bushes') setHint({ x: book.bushPos[0][0] + 171, y: book.bushPos[0][1] + 126, r: 120 });
        else if (p.act === 'baby' && p.mother) setHint({ x: p.mother.x + 360 * (p.mother.s || 1), y: p.mother.y + 100 * (p.mother.s || 1), r: 90 });
      }, 950);
      return () => clearTimeout(timer);
    }
  }, [page, scene, book, donePages]);

  /* Audio : la lecture suit la page (chapitre N-1), la voix démarre au bon endroit. */
  const audioRef = useRef(audio);
  audioRef.current = audio;
  useEffect(() => {
    if (page > 0 && audioRef.current.isPlaying) {
      audioRef.current.goToChapter(page - 1);
    }
  }, [page]);

  /* Flèches clavier : page précédente / suivante. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  /* ── Écouter : narration TTS du chapitre de la page ─────────────────────── */
  const handleListen = useCallback(() => {
    const engine = audioRef.current;
    engine.goToChapter(Math.max(0, page - 1));
    void engine.play();
  }, [page]);

  const pauseNarration = useCallback(() => audioRef.current.pause(), []);

  /* ── Interactions par tâche ──────────────────────────────────────────────── */
  const handleRiderClick = useCallback(() => {
    if (scene.act === 'gallop') {
      gallop();
      complete();
    } else if (scene.act !== 'baby') {
      gallop();
    }
  }, [scene.act, gallop, complete]);

  const handleKingClick = useCallback(() => {
    if (scene.act !== 'king') return;
    const inner = kingInnerRef.current;
    if (inner) {
      inner.classList.remove('ikt-shake');
      void inner.getBBox(); /* reflow : relance l'animation */
      inner.classList.add('ikt-shake');
    }
    setBubbleShown(true);
    complete();
  }, [scene.act, complete]);

  const handleMotherClick = useCallback(() => {
    if (scene.act !== 'baby') return;
    const inner = motherInnerRef.current;
    if (inner) {
      inner.classList.remove('ikt-nuzzle');
      void inner.getBBox();
      inner.classList.add('ikt-nuzzle');
    }
    complete();
  }, [scene.act, complete]);

  /* Semis : clic converti en coordonnées stage (comme le prototype). */
  const handleStageClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (scene.act !== 'okra' || isDone) return;
      const stage = event.currentTarget;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        stage.getScreenCTM()?.inverse() ?? undefined,
      );
      if (event.detail !== 0 && point.y < 560) return; /* seulement la terre */
      const plant = plantRefs.current[tapsRef.current];
      plant?.classList.add('ikt-grown');
      tapsRef.current++;
      if (tapsRef.current < book.holes.length) {
        const [x, y] = book.holes[tapsRef.current];
        setHint({ x, y: y - 30, r: 60 });
      } else {
        setHint(null);
        setTimeout(() => {
          for (const p of plantRefs.current) p?.classList.add('ikt-dry');
        }, 1900);
        setTimeout(complete, 2600);
      }
    },
    [scene.act, isDone, book.holes, complete],
  );

  const handleStarClick = useCallback(
    (index: number) => {
      if (scene.act !== 'stars') return;
      const star = starRefs.current[index];
      if (!star || star.classList.contains('ikt-on')) return;
      star.classList.replace('ikt-off', 'ikt-on');
      const lit = starRefs.current.filter((s) => s?.classList.contains('ikt-on')).length;
      const nextIndex = starRefs.current.findIndex((s) => s?.classList.contains('ikt-off'));
      if (nextIndex >= 0) {
        const [x, y] = book.starPos[nextIndex];
        setHint({ x, y, r: 50 });
      }
      if (lit === book.starPos.length) {
        setHint(null);
        setForestX((scene.forest?.x ?? 1700) - 300);
        gallop(3000);
        complete();
      }
    },
    [scene.act, scene.forest, book.starPos, gallop, complete],
  );

  const handleBushClick = useCallback(
    (index: number) => {
      if (scene.act !== 'bushes' || isDone) return;
      bushRefs.current[index]?.classList.add('ikt-open');
      if (index === book.hiddenBushIndex) {
        setHunterFound(true);
        complete();
      } else {
        const next = bushRefs.current.findIndex((b) => !b?.classList.contains('ikt-open'));
        if (next >= 0) {
          const [x, y] = book.bushPos[next];
          setHint({ x: x + 171, y: y + 126, r: 120 });
        }
      }
    },
    [scene.act, isDone, book, complete],
  );

  /* Entrée / Espace sur les cibles tactiles du stage (a11y, comme le prototype). */
  const handleStageKeyDown = useCallback((event: React.KeyboardEvent<SVGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target as SVGElement;
    if (target.closest('.ikt-stage [role=button]')) {
      event.preventDefault();
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    }
  }, []);

  /* Sous-titre cue actif pendant la narration. */
  const caption = audio.isPlaying ? audio.activeSubtitle?.cue.text ?? null : null;
  const chapterAhead = audio.isPlaying && page > 0 && audio.activeChapterIndex >= page;

  const savaneOpacity = (forestX ?? scene.forest?.x ?? 1700) < 1000 ? 0.25 : 1;
  const hunterPose = hunterFound ? { x: 1060, y: 430, s: 0.95 } : scene.hunter;

  return (
    <div className="ikt">
      <header className="ikt__bar">
        <Link className="ikt__brand" href={`/recits/${story.id}`}>
          <i aria-hidden="true" />
          <span>Voix du Faso</span>
          <em>← le récit</em>
        </Link>
        <p className="ikt__mode">conte interactif</p>
      </header>

      <main className="ikt__main">
        <div className="ikt__prog" aria-hidden="true">
          {book.pages.map((_, index) => (
            <i
              key={index}
              className={index < page ? 'ikt-done' : index === page ? 'ikt-now' : ''}
            />
          ))}
        </div>

        <div className="ikt__stagewrap">
          <svg
            className="ikt-stage"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-label={`Illustration animée du conte de ${story.title.fr}`}
            onClick={handleStageClick}
            onKeyDown={handleStageKeyDown}
          >
            <rect className="ikt-sky" x="0" y="0" width={W} height={H} fill={scene.sky} />
            <g className="ikt-layer" style={{ opacity: scene.stars }}>
              {bgStars.map((star, index) => (
                <circle key={index} cx={star.cx} cy={star.cy} r={star.r} fill="#F2E6D3" opacity={star.opacity} />
              ))}
            </g>
            <circle
              className="ikt-actor"
              cx="1250"
              cy="230"
              r="70"
              fill="#F2E6D3"
              style={poseStyle(scene.sun)}
            />
            <g className="ikt-layer" style={{ opacity: savaneOpacity }}>
              <rect x="0" y="560" width={W} height={H - 560} fill="#DB9D48" />
              <g dangerouslySetInnerHTML={{ __html: layers.savane ?? '' }} />
            </g>
            <rect
              className="ikt-layer"
              x="0"
              y="0"
              width={W}
              height={H}
              fill="#1b2347"
              opacity={scene.night}
              style={{ mixBlendMode: 'multiply' }}
            />
            <g style={{ opacity: scene.act === 'stars' ? 1 : 0 }} className="ikt-layer">
              {book.starPos.map(([x, y], index) => (
                <g key={index} transform={`translate(${x} ${y})`} role="button" tabIndex={-1} aria-label={`Étoile ${index + 1}`} className="ikt-tap" onClick={() => handleStarClick(index)}>
                  <path ref={(el) => { starRefs.current[index] = el; }} className="ikt-star ikt-off" d={STAR_PATH} fill="#E0A84B" />
                  <circle r="46" fill="transparent" />
                </g>
              ))}
            </g>
            <g
              className="ikt-actor"
              style={{ transform: `translate(${forestX ?? scene.forest?.x ?? 1700}px, 0px)` }}
            >
              <g transform="translate(0 520)" dangerouslySetInnerHTML={{ __html: layers.foret ?? '' }} />
              <g transform="translate(1100 520)" dangerouslySetInnerHTML={{ __html: layers.foret ?? '' }} />
            </g>
            <g
              className="ikt-actor ikt-tap"
              role="button"
              tabIndex={-1}
              aria-label="Le roi Nedega"
              style={poseStyle(scene.king)}
              onClick={handleKingClick}
            >
              <g ref={kingInnerRef} dangerouslySetInnerHTML={{ __html: layers.roi ?? '' }} />
            </g>
            <g
              transform={
                scene.king
                  ? `translate(${scene.king.x + 300} ${scene.king.y - 110})`
                  : 'translate(0 0)'
              }
            >
              <g className={`ikt-bubble${bubbleShown ? ' ikt-show' : ''}`}>
                <rect x="0" y="0" width="190" height="86" rx="43" fill="#F2E6D3" />
                <path d="M30 80 L18 112 L62 84Z" fill="#F2E6D3" />
                <text x="95" y="56" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="38" fill="#2A1D14">
                  {book.bubbleText}
                </text>
              </g>
            </g>
            <rect
              x="0"
              y="600"
              width={W}
              height={H - 600}
              fill="transparent"
              tabIndex={-1}
              role="button"
              aria-label="Semer du gombo"
              style={{ display: scene.act === 'okra' ? '' : 'none' }}
            />
            <g className="ikt-layer" style={{ opacity: scene.act === 'okra' ? 1 : 0, pointerEvents: scene.act === 'okra' ? 'auto' : 'none' }}>
              {book.holes.map(([x, y], index) => (
                <g key={index} transform={`translate(${x - 140} ${y - 430}) scale(1.4)`}>
                  <g
                    ref={(el) => { plantRefs.current[index] = el; }}
                    className="ikt-plant"
                    dangerouslySetInnerHTML={{ __html: layers.gombo ?? '' }}
                  />
                </g>
              ))}
            </g>
            <g className="ikt-actor" style={poseStyle(hunterPose)}>
              <g dangerouslySetInnerHTML={{ __html: layers.chasseur ?? '' }} />
            </g>
            <g
              className="ikt-layer"
              style={{
                opacity: scene.act === 'bushes' ? 1 : 0,
                pointerEvents: scene.act === 'bushes' && !isDone ? 'auto' : 'none',
              }}
            >
              {book.bushPos.map(([x, y], index) => (
                <g key={index} transform={`translate(${x} ${y}) scale(.9)`} role="button" tabIndex={-1} aria-label={`Buisson ${index + 1}`} className="ikt-tap" onClick={() => handleBushClick(index)}>
                  <g
                    ref={(el) => { bushRefs.current[index] = el; }}
                    className="ikt-bush"
                    dangerouslySetInnerHTML={{ __html: layers.buisson ?? '' }}
                  />
                </g>
              ))}
            </g>
            <g
              className="ikt-actor ikt-tap"
              role="button"
              tabIndex={-1}
              aria-label="Le cheval et le bébé"
              style={poseStyle(scene.mother)}
              onClick={handleMotherClick}
            >
              <g ref={motherInnerRef} dangerouslySetInnerHTML={{ __html: layers.mere ?? '' }} />
            </g>
            <g
              ref={riderRef}
              className="ikt-actor ikt-tap"
              role="button"
              tabIndex={-1}
              aria-label="Le cheval de Yennenga"
              style={poseStyle(scene.rider)}
              onClick={handleRiderClick}
            >
              <g className="ikt-bob" dangerouslySetInnerHTML={{ __html: layers.yennenga ?? '' }} />
              <g className="ikt-dust" fill="#E0A84B">
                <circle cx="120" cy="500" r="26" />
                <circle cx="170" cy="510" r="18" style={{ animationDelay: '.25s' }} />
                <circle cx="90" cy="490" r="14" style={{ animationDelay: '.45s' }} />
              </g>
            </g>
            <circle
              className={`ikt-hint${hint ? ' ikt-show' : ''}`}
              cx={hint?.x ?? 0}
              cy={hint?.y ?? 0}
              r={hint?.r ?? 70}
              fill="none"
              stroke="#F2E6D3"
              strokeWidth="6"
            />
          </svg>

          {scene.cover && (
            <div className="ikt__cover">
              <h1>{book.coverTitle}</h1>
              <p>{book.coverSubtitle}</p>
            </div>
          )}
        </div>

        <section className="ikt__page" aria-live="polite">
          <div>
            <p className="ikt__chap">
              {scene.cover ? 'Un conte du Centre-Est' : `${scene.chap} / ${pageCount - 1}`}
            </p>
            <p className="ikt__say">{scene.text}</p>
            {caption && <p className="ikt__caption" key={`${audio.activeSubtitle?.cue.start ?? 'x'}`}>{caption}</p>}
            {scene.task && !isDone && (
              <p className="ikt__task">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M9 11V5a2 2 0 0 1 4 0v6m0-2a2 2 0 0 1 4 0v3a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2-4a1.6 1.6 0 0 1 2.7-1.7L9 14" />
                </svg>
                <span>{scene.task}</span>
              </p>
            )}
          </div>
          <div className="ikt__ctl">
            <button type="button" className="ikt__round" onClick={goPrev} disabled={page === 0} aria-label="Page précédente">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M19 12H5m6-6-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              className="ikt__round ikt__round--listen"
              aria-pressed={audio.isPlaying}
              onClick={audio.isPlaying ? pauseNarration : handleListen}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4V5zm4.5 3.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
              </svg>
              <span>{audio.isPlaying ? 'Pause' : 'Écouter'}</span>
            </button>
            <button
              type="button"
              className={`ikt__round ikt__round--go${(chapterAhead || !scene.task || isDone) ? ' ikt-nudge' : ''}`}
              onClick={goNext}
              aria-label={page === pageCount - 1 ? 'Recommencer le conte' : 'Page suivante'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
