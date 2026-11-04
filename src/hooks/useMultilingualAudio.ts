'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  useMultilingualAudio — moteur audio multilingue (Étape 3)
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Lecture Howler.js (Web Audio) des pistes du corpus, une par langue
 *    (moore, dioula, fulfulde, fr…), avec chaîne de repli par piste.
 *
 *  • Bascule de langue EN DIRECT : la position narratif est portée par la
 *    grille de référence « fr » du corpus. Au changement de langue, la
 *    nouvelle piste est seekée au prorata de sa durée et la lecture reprend
 *    en crossfade — PAS de retour à zéro, PAS de perte de seconde.
 *
 *  • Synchronisation temps réel : chapitre actif + phrase sous-titrée
 *    résolus par timecodes purs (src/lib/audio-timeline.ts, testés Node),
 *    rafraîchis à ~20 Hz (rAF + interval de secours en onglet caché).
 *
 *  • Robustesse :
 *      – cache de Howls AU NIVEAU MODULE (clé « récit::langue ») avec
 *        compteur de montages : survit aux remonts du composant, purge
 *        réelle quand le dernier consommateur d'un récit disparaît ;
 *      – préchargement fetch() → blob local (l'XHR interne de Howler peut
 *        être intercepté par certains environnements embarqués) ;
 *      – Howler importé dynamiquement (module touchant `window` : SSG-safe) ;
 *      – onplayerror → retry officiel sur « unlock » (autoplay 1er geste) ;
 *      – erreurs de chargement → chaîne de repli → état d'erreur propre.
 *
 *  Debug : `window.__VDF_DEBUG__ = true` avant interaction active la trace.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Howl } from 'howler';

import {
  activeCueAt,
  chapterIndexAt,
  clampToTimeline,
  referenceDuration,
  referenceToTrack,
  trackFor,
  trackToReference,
} from '@/lib/audio-timeline';
import type { AudioTrack, Chapter, LanguageCode, Story } from '@/types';

/* ── Options & état public ─────────────────────────────────────────────────── */

export interface UseMultilingualAudioOptions {
  /** Récit à lire (ses pistes `languages`, chapitres et cues horodatés). */
  story: Story;
  /** Langue initiale — défaut : `story.defaultLanguage`. */
  initialLanguage?: LanguageCode;
  /** Volume maître 0–1 (défaut 1). */
  volume?: number;
  /** Durée des fondues de bascule de langue, en ms (défaut 180). */
  crossfadeMs?: number;
}

export interface MultilingualAudioState {
  /** Piste chargée et prête à jouer. */
  ready: boolean;
  isPlaying: boolean;
  /** Langue demandée par l'utilisateur. */
  language: LanguageCode;
  /** Langue de la piste effectivement chargée (après repli éventuel). */
  effectiveLanguage: LanguageCode | null;
  /** Langues réellement disponibles pour ce récit. */
  availableLanguages: readonly LanguageCode[];
  /** Position courante sur la GRILLE DE RÉFÉRENCE (secondes). */
  currentTime: number;
  /** Durée totale sur la grille de référence (secondes) — base des scrubs. */
  timelineDuration: number;
  /** Durée réelle de la piste chargée (secondes). */
  duration: number;
  /** Progression normalisée 0–1 (grille de référence). */
  progress: number;
  /** Chapitre actif résolu par timecodes (`null` avant le début). */
  activeChapter: Chapter | null;
  activeChapterIndex: number;
  /** Cue sous-titré actif (+ langue effective du cue, repli fr inclus). */
  activeSubtitle: ReturnType<typeof activeCueAt>;
  /** Repli effectué, ex. « moore » demandé → piste « fr » chargée. */
  fallbackFrom: LanguageCode | null;
  /** Message d'erreur lisible (pistes indisponibles…), sinon `null`. */
  error: string | null;
  muted: boolean;
  volume: number;
}

export interface MultilingualAudioControls {
  play(): Promise<void>;
  pause(): void;
  toggle(): void;
  /** Positionne la lecture sur la grille de référence (secondes). */
  seek(referenceTime: number): void;
  /** Saut relatif (± secondes, grille de référence). */
  skip(deltaSeconds: number): void;
  /** Bascule de langue en direct, position narratif conservée. */
  setLanguage(language: LanguageCode): void;
  setVolume(volume: number): void;
  mute(muted: boolean): void;
  toggleMute(): void;
  /** Positionne la lecture au début d'un chapitre (`audioStart`). */
  goToChapter(chapterIndex: number): void;
}

export type MultilingualAudio = MultilingualAudioState & MultilingualAudioControls;

/* ── Internes ──────────────────────────────────────────────────────────────── */

interface HowlCacheEntry {
  howl: Howl;
  track: AudioTrack;
  /** URL blob locale — révoquée à la purge du cache. */
  objectUrl: string;
  /** Durée réelle dès que connue, sinon le `durationHint` du corpus. */
  duration(): number;
  /** `true` si la piste a pu être chargée. */
  loaded: Promise<boolean>;
}

const TIME_EPSILON = 0.05; // seconde — plancher de mise à jour de l'état temps.

/** Trace de diagnostic (activée par window.__VDF_DEBUG__ = true). */
const trace = (where: string, data?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && (window as { __VDF_DEBUG__?: boolean }).__VDF_DEBUG__) {
    ((window as { __VDF_TRACE?: unknown[] }).__VDF_TRACE ??= []).push({
      t: Math.round(performance.now()),
      where,
      ...data,
    });
  }
};

/**
 * ÉTAT PARTAGÉ ANCRÉ SUR globalThis — clé « récit::langue ».
 * Le bundler peut évaluer ce module en plusieurs exemplaires (chunks) ; en
 * ancrant cache et compteur sur globalThis, UNE SEULE instance existe quoi
 * qu'il arrive : les Howls et blobs sont partagés, purgés quand le dernier
 * consommateur d'un récit disparaît (compteur de montages).
 */
interface AudioRuntime {
  cache: Map<string, HowlCacheEntry>;
  pending: Map<string, Promise<HowlCacheEntry>>;
  mountCounts: Map<string, number>;
  howlCtor: (new (options: object) => Howl) | null;
}
const audioRuntime: AudioRuntime = ((globalThis as { __VDF_AUDIO__?: AudioRuntime }).__VDF_AUDIO__ ??= {
  cache: new Map(),
  pending: new Map(),
  mountCounts: new Map(),
  howlCtor: null,
});
const { cache: HOWL_CACHE, pending: HOWL_PENDING, mountCounts: MOUNT_COUNTS } = audioRuntime;

const cacheKey = (storyId: string, language: LanguageCode) => `${storyId}::${language}`;

/* ── Hook ──────────────────────────────────────────────────────────────────── */

export function useMultilingualAudio({
  story,
  initialLanguage,
  volume: initialVolume = 1,
  crossfadeMs = 180,
}: UseMultilingualAudioOptions): MultilingualAudio {
  const instanceIdRef = useRef(Math.random().toString(36).slice(2, 6));

  /* État exposé */
  const [language, setLanguageState] = useState<LanguageCode>(
    initialLanguage ?? story.defaultLanguage,
  );
  const [effectiveLanguage, setEffectiveLanguage] = useState<LanguageCode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [trackTime, setTrackTime] = useState(0); // secondes sur la PISTE courante
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const [fallbackFrom, setFallbackFrom] = useState<LanguageCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolumeState] = useState(initialVolume);

  /* Références « latest » (lisibles dans les callbacks stables) */
  const currentRef = useRef<HowlCacheEntry | null>(null);
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playingRef = useRef(false);
  const narrationRef = useRef(0); // position sur la grille de référence
  const durationRef = useRef(0); // durée de la piste courante
  const refDurationRef = useRef(0); // durée de la grille de référence
  const resumeOnLoadRef = useRef<boolean | null>(null);
  const volumeRef = useRef(initialVolume);
  const mutedRef = useRef(false);
  const crossfadeRef = useRef(crossfadeMs);
  const storyRef = useRef(story);
  const languageRef = useRef(language);

  storyRef.current = story;
  languageRef.current = language;
  crossfadeRef.current = crossfadeMs;

  /* ── Boucle temps : lecture ~20 Hz de la position réelle ─────────────────── */

  const stopTicking = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const readPosition = useCallback(() => {
    const entry = currentRef.current;
    if (!entry) return;
    const seconds = entry.howl.seek() as number;
    setTrackTime((previous) =>
      Math.abs(previous - seconds) >= TIME_EPSILON ? seconds : previous,
    );
    narrationRef.current = trackToReference(
      seconds,
      refDurationRef.current,
      durationRef.current,
    );
  }, []);

  const startTicking = useCallback(() => {
    if (rafRef.current !== null) return;
    const loop = () => {
      readPosition();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    intervalRef.current = setInterval(readPosition, 250);
  }, [readPosition]);

  /* ── Création / récupération d'une piste (cache module) ──────────────────── */

  const getOrCreateEntry = useCallback(
    (forStory: Story, track: AudioTrack): Promise<HowlCacheEntry> => {
      const key = cacheKey(forStory.id, track.language);
      const cached = HOWL_CACHE.get(key);
      if (cached) {
        trace('getOrCreate:cache-hit', { key, inst: instanceIdRef.current });
        return Promise.resolve(cached);
      }
      const pending = HOWL_PENDING.get(key);
      if (pending) {
        trace('getOrCreate:pending-hit', { key, inst: instanceIdRef.current });
        return pending;
      }
      trace('getOrCreate:création', { key, inst: instanceIdRef.current });

      const creation = (async (): Promise<HowlCacheEntry> => {
        /* Howler chargé dynamiquement, côté navigateur uniquement (SSR-safe). */
        if (!audioRuntime.howlCtor) {
          audioRuntime.howlCtor = (await import('howler')).Howl as new (options: object) => Howl;
        }
        const HowlCtor = audioRuntime.howlCtor;

        /**
         * Préchargement fetch() → blob local : l'XHR interne de Howler peut
         * être intercepté par certains environnements embarqués, alors que
         * fetch() est fiable. Howler consomme ensuite le blob: en Web Audio,
         * hors réseau — et le futur cache offline (Étape 5) n'aura qu'à
         * traverser ce fetch.
         */
        let objectUrl: string;
        try {
          const response = await fetch(track.src);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          objectUrl = URL.createObjectURL(await response.blob());
          trace('creation:blob-ok', { key, octets: response.headers.get('content-length') });
        } catch (e) {
          trace('creation:fetch-fail', { key, err: String(e) });
          return {
            howl: new HowlCtor({ src: [''], format: [track.format] }),
            track,
            objectUrl: '',
            duration: () => track.durationHint,
            loaded: Promise.resolve(false),
          };
        }

        /**
         * Promesse « deferred » : résolue par les callbacks Howler. On ne
         * référence JAMAIS `loaded` depuis l'intérieur de son propre
         * exécuteur — l'exécuteur de `new Promise` tourne de façon
         * synchrone, avant la fin de l'initialisation de la constante
         * (TDZ : « Cannot access 'loaded' before initialization »).
         */
        let resolveLoaded!: (ok: boolean) => void;
        const loaded = new Promise<boolean>((resolve) => {
          resolveLoaded = resolve;
        });

        const howl = new HowlCtor({
          /** Le blob local préchargé — jamais l'URL réseau. */
          src: [objectUrl],
          format: [track.format],
          html5: false, // Web Audio : seek précis pour la synchro sous-titres.
          volume: volumeRef.current,
          mute: mutedRef.current,
          onload: () => {
            trace('howl:onload', { key });
            resolveLoaded(true);
          },
          onloaderror: () => {
            trace('howl:onloaderror', { key });
            resolveLoaded(false);
          },
          onplay: () => {
            trace('howl:onplay', { key, inst: instanceIdRef.current });
            playingRef.current = true;
            setIsPlaying(true);
            startTicking();
          },
          onpause: () => {
            playingRef.current = false;
            setIsPlaying(false);
            stopTicking();
          },
          onstop: () => {
            playingRef.current = false;
            setIsPlaying(false);
            stopTicking();
          },
          onend: () => {
            playingRef.current = false;
            setIsPlaying(false);
            stopTicking();
          },
          /**
           * Autoplay bloqué (1er geste) : pattern officiel Howler — retenter
           * la lecture dès le déverrouillage du contexte.
           */
          onplayerror: () => {
            window.Howler?.ctx?.resume?.();
            howl.once('unlock', () => {
              if (currentRef.current?.howl === howl) howl.play();
            });
          },
        });

        const entry: HowlCacheEntry = {
          howl,
          track,
          objectUrl,
          duration: () => howl.duration() || track.durationHint,
          loaded,
        };
        if (howl.state() === 'loaded') resolveLoaded(true);

        HOWL_CACHE.set(key, entry);
        trace('creation:retour', { key, type: typeof entry, ok: !!entry });
        return entry;
      })();

      HOWL_PENDING.set(key, creation);
      void creation.then(() => HOWL_PENDING.delete(key));
      return creation;
    },
    [startTicking, stopTicking],
  );

  /**
   * Charge la langue demandée ; en cas d'échec (404…), suit la chaîne de
   * repli de la piste puis le pivot « fr ». Retourne l'entrée chargée et la
   * langue effective, ou `null` si toute la chaîne a échoué.
   */
  const ensureLoaded = useCallback(
    async (
      requested: LanguageCode,
    ): Promise<{ entry: HowlCacheEntry; effective: LanguageCode } | null> => {
      const currentStory = storyRef.current;
      const chain: LanguageCode[] = [];
      const push = (code: LanguageCode) => {
        if (!chain.includes(code)) chain.push(code);
      };

      const requestedTrack = trackFor(currentStory, requested);
      if (requestedTrack) {
        push(requested);
        requestedTrack.fallbacks.forEach(push);
      }
      push('fr'); // pivot garanti par la validation du corpus.

      try {
        for (const candidate of chain) {
          const track = trackFor(currentStory, candidate);
          if (!track) continue;
          const entry = await getOrCreateEntry(currentStory, track);
          trace('ensureLoaded:entrée', { lang: candidate, type: typeof entry, ok: !!entry });
          if (!entry) continue;
          if (await entry.loaded) return { entry, effective: candidate };
        }
        return null;
      } catch (e) {
        /* Jamais d'échec silencieux : une piste cassée devient un état d'erreur. */
        trace('ensureLoaded:exception', { err: String(e), pile: String((e as Error)?.stack ?? '').slice(0, 400) });
        return null;
      }
    },
    [getOrCreateEntry],
  );

  /* ── Effet 1 : comptage de montages + purge du récit quitté ─────────────── */

  useEffect(() => {
    MOUNT_COUNTS.set(story.id, (MOUNT_COUNTS.get(story.id) ?? 0) + 1);
    trace('mount', { id: story.id, inst: instanceIdRef.current, count: MOUNT_COUNTS.get(story.id) });

    /* Nouveau récit pour cette instance : remise à zéro de l'état. */
    setLanguageState(story.defaultLanguage);
    setTrackTime(0);
    narrationRef.current = 0;
    playingRef.current = false;
    setLoadedDuration(null);
    setEffectiveLanguage(null);
    setFallbackFrom(null);
    setReady(false);
    setError(null);

    return () => {
      const remaining = (MOUNT_COUNTS.get(story.id) ?? 1) - 1;
      if (remaining <= 0) {
        MOUNT_COUNTS.delete(story.id);
        for (const key of [...HOWL_CACHE.keys()]) {
          if (!key.startsWith(`${story.id}::`)) continue;
          const entry = HOWL_CACHE.get(key);
          entry?.howl.unload();
          if (entry?.objectUrl) URL.revokeObjectURL(entry.objectUrl);
          HOWL_CACHE.delete(key);
        }
        trace('purge-récit', { id: story.id });
      } else {
        MOUNT_COUNTS.set(story.id, remaining);
      }
      stopTicking();
      currentRef.current = null;
      resumeOnLoadRef.current = null;
    };
  }, [story, stopTicking]);

  /* ── Effet 2 : chargement / bascule de langue ───────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    trace('load-effect', { lang: language, inst: instanceIdRef.current });
    void (async () => {
      const result = await ensureLoaded(language);
      trace('load-effect:résolu', { lang: language, ok: !!result, cancelled });

      if (cancelled) return;

      if (!result) {
        currentRef.current = null;
        setEffectiveLanguage(null);
        setReady(false);
        setError(
          `Pistes audio indisponibles pour « ${language} » et ses replis — ` +
            'les masters de démonstration ne sont pas encore publiés dans /audio.',
        );
        return;
      }

      const { entry, effective } = result;
      currentRef.current = entry;
      durationRef.current = entry.duration();
      refDurationRef.current = referenceDuration(storyRef.current);
      setLoadedDuration(durationRef.current);
      setEffectiveLanguage(effective);
      setFallbackFrom(effective === language ? null : language);
      setReady(true);
      setError(null);

      /* Restauration de la position narratif sur la nouvelle piste. */
      const referenceTime = narrationRef.current;
      const trackSeconds = referenceToTrack(
        referenceTime,
        refDurationRef.current,
        durationRef.current,
      );
      entry.howl.seek(trackSeconds);
      setTrackTime(trackSeconds);

      /* Reprise en crossfade si le récit était en cours de lecture. */
      const shouldResume = resumeOnLoadRef.current ?? playingRef.current;
      resumeOnLoadRef.current = null;
      if (shouldResume) {
        entry.howl.volume(0);
        entry.howl.play();
        entry.howl.fade(0, mutedRef.current ? 0 : volumeRef.current, crossfadeRef.current);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [story, language, ensureLoaded]);

  /* ── État dérivé (grille de référence) ─────────────────────────────────── */

  const referenceDurationSeconds = useMemo(() => referenceDuration(story), [story]);
  refDurationRef.current = referenceDurationSeconds;

  const trackDuration =
    loadedDuration ?? trackFor(story, language)?.durationHint ?? referenceDurationSeconds;
  durationRef.current = trackDuration;

  /** Position sur la grille de référence — c'est LA seconde « préservée ». */
  const currentTime = trackToReference(trackTime, referenceDurationSeconds, trackDuration);
  const progress =
    referenceDurationSeconds > 0
      ? Math.min(Math.max(currentTime / referenceDurationSeconds, 0), 1)
      : 0;

  const activeChapterIndex = chapterIndexAt(story, currentTime);
  const activeChapter = activeChapterIndex >= 0 ? story.chapters[activeChapterIndex] : null;
  const activeSubtitle = useMemo(
    () => activeCueAt(story, currentTime, language),
    [story, currentTime, language],
  );

  const availableLanguages = useMemo(
    () => story.languages.map((track) => track.language),
    [story],
  );

  /* ── Contrôles ─────────────────────────────────────────────────────────── */

  const play = useCallback(async () => {
    trace('play', { inst: instanceIdRef.current, aCurrent: !!currentRef.current });
    let entry = currentRef.current;
    if (!entry || entry.howl.state() !== 'loaded') {
      const result = await ensureLoaded(languageRef.current);
      if (!result) {
        setError(
          `Pistes audio indisponibles pour « ${languageRef.current} » et ses replis — ` +
            'les masters de démonstration ne sont pas encore publiés dans /audio.',
        );
        return;
      }
      entry = currentRef.current ?? result.entry;
    }
    if (!entry) return;

    /* Fin de récit atteinte : reprise au début (comportement lecteur classique). */
    if (
      refDurationRef.current > 0 &&
      narrationRef.current >= refDurationRef.current - TIME_EPSILON
    ) {
      entry.howl.seek(0);
      setTrackTime(0);
      narrationRef.current = 0;
    }
    entry.howl.play();
  }, [ensureLoaded]);

  const pause = useCallback(() => {
    currentRef.current?.howl.pause();
  }, []);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else void play();
  }, [pause, play]);

  const seek = useCallback((referenceTime: number) => {
    const clamped = clampToTimeline(referenceTime, refDurationRef.current);
    narrationRef.current = clamped;
    const entry = currentRef.current;
    if (entry) {
      const trackSeconds = referenceToTrack(clamped, refDurationRef.current, durationRef.current);
      entry.howl.seek(trackSeconds);
      setTrackTime(trackSeconds);
    }
  }, []);

  const skip = useCallback(
    (deltaSeconds: number) => {
      seek(narrationRef.current + deltaSeconds);
    },
    [seek],
  );

  const goToChapter = useCallback(
    (chapterIndex: number) => {
      const chapter = storyRef.current.chapters[chapterIndex];
      if (chapter) seek(chapter.audioStart);
    },
    [seek],
  );

  const setLanguage = useCallback((next: LanguageCode) => {
    if (next === languageRef.current) return;

    /* Fondu de sortie de la piste courante, puis pause discrète. */
    const entry = currentRef.current;
    const wasPlaying = playingRef.current;
    resumeOnLoadRef.current = wasPlaying;
    if (entry && wasPlaying) {
      entry.howl.fade(entry.howl.volume() as number, 0, crossfadeRef.current);
      entry.howl.once('fade', () => entry.howl.pause());
    }

    /* L'effet [language] charge, repositionne au prorata et reprend. */
    setLoadedDuration(null);
    setFallbackFrom(null);
    setLanguageState(next);
  }, []);

  const setVolume = useCallback((next: number) => {
    const clamped = Math.min(Math.max(next, 0), 1);
    volumeRef.current = clamped;
    setVolumeState(clamped);
    HOWL_CACHE.forEach((entry) => entry.howl.volume(clamped));
  }, []);

  const mute = useCallback((next: boolean) => {
    mutedRef.current = next;
    setMuted(next);
    HOWL_CACHE.forEach((entry) => entry.howl.mute(next));
  }, []);

  const toggleMute = useCallback(() => {
    mute(!mutedRef.current);
  }, [mute]);

  /* ── API publique ──────────────────────────────────────────────────────── */

  return {
    // État
    ready,
    isPlaying,
    language,
    effectiveLanguage,
    availableLanguages,
    currentTime,
    timelineDuration: referenceDurationSeconds,
    duration: trackDuration,
    progress,
    activeChapter,
    activeChapterIndex,
    activeSubtitle,
    fallbackFrom,
    error,
    muted,
    volume,
    // Contrôles
    play,
    pause,
    toggle,
    seek,
    skip,
    setLanguage,
    setVolume,
    mute,
    toggleMute,
    goToChapter,
  };
}
