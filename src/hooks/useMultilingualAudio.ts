'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  useMultilingualAudio — moteur audio multilingue (Étape 3 · 1/2)
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Lecture Howler.js (Web Audio) des pistes du corpus, une par langue
 *    (moore, dioula, fulfulde, fr…), avec chaîne de repli par piste.
 *
 *  • Bascule de langue EN DIRECT : la position narratif est portée par la
 *    grille de référence « fr » du corpus (timecodes des chapitres et des
 *    cues). Au changement de langue, la nouvelle piste est seekée au prorata
 *    de sa durée (`t_langue = t_réf × durée_langue / durée_réf`) et la lecture
 *    reprend en crossfade — PAS de retour à zéro, PAS de perte de seconde.
 *
 *  • Synchronisation temps réel : à chaque tick (~20 Hz), expose le chapitre
 *    actif et la phrase sous-titrée courante, résolus par timecodes purs
 *    (src/lib/audio-timeline.ts, testés sous Node).
 *
 *  • Résilience démo : fichiers audio non fournis → chaîne de repli puis état
 *    d'erreur propre (`error`), sans jamais casser l'interface. Le hook est
 *    « drop-in » dès que les vrais masters sont publiés dans /audio.
 *
 *  Usage :
 *    const audio = useMultilingualAudio({ story });
 *    audio.play();
 *    audio.setLanguage('moore');   // bascule en direct, position conservée
 *    audio.activeChapter           // chapitre courant (grille de référence)
 *    audio.activeSubtitle?.cue.text // phrase sous-titrée courante
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Howl } from 'howler';

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
  /** Phrase sous-titrée active (cue + langue effective du cue). */
  activeSubtitle: ReturnType<typeof activeCueAt>;
  /** Repli effectué, ex. « moore » demandé → piste « fr » chargée. */
  fallbackFrom: LanguageCode | null;
  /** Message d'erreur lisible (pistes indisponibles…), sinon `null`. */
  error: string | null;
  muted: boolean;
  volume: number;
}

export interface MultilingualAudioControls {
  /** Lance la lecture (geste utilisateur requis par les navigateurs). */
  play(): Promise<void>;
  pause(): void;
  toggle(): void;
  /** Positionne la lecture sur la grille de référence (secondes). */
  seek(referenceTime: number): void;
  /** Saut relatif (± secondes, grille de référence). */
  skip(deltaSeconds: number): void;
  /**
   * Bascule de langue EN DIRECT : conserve la position narratif exacte
   * (mapping proportionnel) et reprend la lecture avec un crossfade doux
   * si le récit était en cours.
   */
  setLanguage(language: LanguageCode): void;
  /** Volume maître 0–1 (appliqué à toutes les pistes en cache). */
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
  /** Durée réelle dès que connue, sinon le `durationHint` du corpus. */
  duration(): number;
  /** `true` si la piste a pu être chargée. */
  loaded: Promise<boolean>;
}

const TIME_EPSILON = 0.05; // seconde — plancher de mise à jour de l'état temps.

/* ── Hook ──────────────────────────────────────────────────────────────────── */

export function useMultilingualAudio({
  story,
  initialLanguage,
  volume: initialVolume = 1,
  crossfadeMs = 180,
}: UseMultilingualAudioOptions): MultilingualAudio {
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

  /* Références « latest » (lisibles dans les callbacks Howler stables) */
  const cacheRef = useRef<Map<LanguageCode, HowlCacheEntry>>(new Map());
  const currentRef = useRef<HowlCacheEntry | null>(null);
  const rafRef = useRef<number | null>(null);
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

  /* ── Boucle temps : lecture ~20 Hz de la position réelle du Howl ────────── */

  const stopTicking = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startTicking = useCallback(() => {
    if (rafRef.current !== null) return;
    const loop = () => {
      const entry = currentRef.current;
      if (entry) {
        const seconds = entry.howl.seek() as number;
        setTrackTime((previous) =>
          Math.abs(previous - seconds) >= TIME_EPSILON ? seconds : previous,
        );
        narrationRef.current = trackToReference(
          seconds,
          refDurationRef.current,
          durationRef.current,
        );
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  /* ── Chargement piste + chaîne de repli ────────────────────────────────── */

  const getOrCreateEntry = useCallback((track: AudioTrack): HowlCacheEntry => {
    const cached = cacheRef.current.get(track.language);
    if (cached) return cached;

    let entry!: HowlCacheEntry;
    const loaded = new Promise<boolean>((resolve) => {
      const howl = new Howl({
        src: [track.src],
        format: [track.format],
        html5: false, // Web Audio : seek précis pour la synchro sous-titres.
        volume: volumeRef.current,
        mute: mutedRef.current,
        onload: () => resolve(true),
        onloaderror: () => resolve(false),
        onplay: () => {
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
        // Blocage d'autoplay mobile : Howler retentera au « unlock ».
        onplayerror: () => undefined,
      });
      entry = {
        howl,
        track,
        duration: () => howl.duration() || track.durationHint,
        loaded,
      };
      if (howl.state() === 'loaded') resolve(true);
    });

    cacheRef.current.set(track.language, entry);
    return entry;
  }, [startTicking, stopTicking]);

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

      for (const candidate of chain) {
        const track = trackFor(currentStory, candidate);
        if (!track) continue;
        const entry = getOrCreateEntry(track);
        if (await entry.loaded) return { entry, effective: candidate };
      }
      return null;
    },
    [getOrCreateEntry],
  );

  /* ── Effet 1 : changement de récit → purge complète et remise à zéro ────── */

  useEffect(() => {
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
      stopTicking();
      cacheRef.current.forEach((entry) => entry.howl.unload());
      cacheRef.current.clear();
      currentRef.current = null;
      resumeOnLoadRef.current = null;
    };
  }, [story, stopTicking]);

  /* ── Effet 2 : chargement / bascule de langue ──────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await ensureLoaded(language);
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

  const trackDuration = loadedDuration ?? trackFor(story, language)?.durationHint ?? referenceDurationSeconds;
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
    if (refDurationRef.current > 0 && narrationRef.current >= refDurationRef.current - TIME_EPSILON) {
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

  const setLanguage = useCallback(
    (next: LanguageCode) => {
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
    },
    [],
  );

  const setVolume = useCallback((next: number) => {
    const clamped = Math.min(Math.max(next, 0), 1);
    volumeRef.current = clamped;
    setVolumeState(clamped);
    cacheRef.current.forEach((entry) => entry.howl.volume(clamped));
  }, []);

  const mute = useCallback((next: boolean) => {
    mutedRef.current = next;
    setMuted(next);
    cacheRef.current.forEach((entry) => entry.howl.mute(next));
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
