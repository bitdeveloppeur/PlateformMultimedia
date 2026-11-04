/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  GÉNÉRATEUR DE NARRATION FRANÇAISE TTS (bénévole de l'Étape 3+)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Remplace la piste « fr » de chaque récit (drone de démo) par une narration
 *  RÉELLE : les textes `chapter.narration.fr` du corpus, lus par la voix
 *  neuronale fr-FR-Denise (service « Read Aloud » d'Edge, gratuit, sans clé —
 *  client canonique `edge-tts` en Python : `pip install edge-tts`).
 *
 *  • Un MP3 par chapitre (24 kHz, CBR 48 kbit/s, mono) ;
 *  • ASSEMBLAGE PAR CONCATÉNATION DE TRAMES MP3 : silences générés par lamejs
 *    (mêmes paramètres de trames) entre les chapitres — pas de décodage, pas
 *    de ffmpeg ; les navigateurs décodent le flux concaténé sans couture ;
 *  • GRILLE DU CORPUS CONSERVÉE : chaque voix démarre pile à
 *    `chapter.audioStart`, la piste totale dure exactement `durationHint` —
 *    timecodes, scruber et caméra restent justes d'office ;
 *  • si la voix déborde du créneau du chapitre, relance automatique avec un
 *    débit accéléré (rate) jusqu'à tenir ;
 *  • SOUS-TITRES RECALÉS : les cues existants (chapitres 1ers) sont mis à
 *    l'échelle du débit réel de la voix, proportionnellement au créneau ;
 *  • idempotent : cache `.tts-cache/` par hash (texte+voix+débit) ;
 *  • pistes nationales (moore, dioula, fulfulde) : AUCUN TTS n'existe pour
 *    elles — elles restent les drones de démo différenciés par hauteur.
 *
 *  Usage :  npm run assets:voice
 *           → public/audio/stories/<id>/<id>-fr.mp3 + stories.json mis à jour
 *  Dépendances : Python + pip install edge-tts ; npm i -D @breezystack/lamejs
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import lamejs from '@breezystack/lamejs';

const VOICE = 'fr-FR-DeniseNeural';
const BITRATE_KBPS = 48;
const BYTES_PER_SEC = (BITRATE_KBPS * 1000) / 8; // CBR → durée ≈ octets / 6000
const STORIES_PATH = 'src/data/stories.json';
const CACHE_DIR = '.tts-cache';

/** Durée (s) d'un MP3 CBR, corrigée des ~26 ms de délai d'encodeur. */
const mp3Duration = (bytes) => Math.max(0, bytes / BYTES_PER_SEC - 0.026);

/** Interpréteur Python portant edge-tts (la machine peut en compter plusieurs). */
const PYTHON = (() => {
  for (const candidate of ['py -3.11', 'python']) {
    const parts = candidate.split(' ');
    const probe = spawnSync(parts[0], [...parts.slice(1), '-c', 'import edge_tts'], { encoding: 'utf8' });
    if (probe.status === 0) return parts;
  }
  throw new Error('Aucun Python avec edge_tts — `pip install edge-tts` d’abord');
})();

/** Synthétise un texte (avec cache) → chemin du MP3. Lève si le service échoue. */
function synthesize(text, ratePercent = 0) {
  const key = createHash('sha256').update(`${VOICE}|${ratePercent}|${text}`).digest('hex').slice(0, 16);
  const out = join(CACHE_DIR, `${key}.mp3`);
  try {
    if (statSync(out).size > 800) return { path: out, cached: true };
  } catch { /* pas encore en cache */ }

  const args = [...PYTHON.slice(1), '-m', 'edge_tts', '--voice', VOICE, '--text', text, '--write-media', out];
  if (ratePercent) args.push('--rate', `${ratePercent > 0 ? '+' : ''}${ratePercent}%`);

  /* Le service en ligne lâche parfois la connexion : reprise avec pause. */
  for (let attempt = 1; attempt <= 4; attempt++) {
    const run = spawnSync(PYTHON[0], args, { encoding: 'utf8', timeout: 90_000 });
    let size = 0;
    try { size = statSync(out).size; } catch { /* fichier non créé */ }
    if (run.status === 0 && size > 800) return { path: out, cached: false };
    console.warn(`  ↻ essai ${attempt} échoué (statut ${run.status}) — nouvelle tentative…`);
    spawnSync(PYTHON[0], ['-c', 'import time; time.sleep(3)']);
  }
  throw new Error(`edge-tts a échoué après 4 essais : ${text.slice(0, 60)}…`);
}

/** 1 s de silence MP3 (trames 24 kHz CBR 48 kbit/s mono, compatibles edge-tts). */
const SILENCE_1S = (() => {
  const encoder = new lamejs.Mp3Encoder(1, 24000, BITRATE_KBPS);
  const chunks = [];
  const samples = new Int16Array(24000);
  for (let i = 0; i < samples.length; i += 1152) {
    const out = encoder.encodeBuffer(samples.subarray(i, Math.min(i + 1152, samples.length)));
    if (out.length) chunks.push(Buffer.from(out));
  }
  const flush = encoder.flush();
  if (flush.length) chunks.push(Buffer.from(flush));
  return Buffer.concat(chunks);
})();

/** Append du silence jusqu'à ce que `buf` atteigne `targetSec` (± 30 ms). */
function padTo(buffer, targetSec) {
  const chunks = [buffer];
  let seconds = mp3Duration(buffer.length);
  while (targetSec - seconds > 0.03) {
    chunks.push(SILENCE_1S);
    seconds += mp3Duration(SILENCE_1S.length);
  }
  return Buffer.concat(chunks);
}

/* ── Parcours du corpus ────────────────────────────────────────────────────── */
mkdirSync(CACHE_DIR, { recursive: true });
const stories = JSON.parse(readFileSync(STORIES_PATH, 'utf8'));
const cueUpdates = []; // journal lisible des recalages de sous-titres
let chaptersDone = 0;

for (const story of stories) {
  const trackIndex = story.languages.findIndex((t) => t.language === 'fr');
  if (trackIndex < 0) continue; // pivot fr requis par la validation — théorique
  const track = story.languages[trackIndex];
  const totalDuration = track.durationHint;

  /* 1. Synthèse chapitre par chapitre, débit auto-ajusté au créneau. */
  const chapterAudio = [];
  let storyChaptersDone = 0;
  for (const [index, chapter] of story.chapters.entries()) {
    const slot = chapter.audioEnd - chapter.audioStart;
    let rate = 0;
    let synth;
    for (let attempt = 0; attempt < 4; attempt++) {
      synth = synthesize(chapter.narration.fr, rate);
      const duration = mp3Duration(statSync(synth.path).size);
      if (duration <= slot - 0.4) {
        chapterAudio.push({ index, mp3: readFileSync(synth.path), duration, rate });
        chaptersDone++;
        storyChaptersDone++;
        break;
      }
      /* Déborde du créneau : débit proportionnel à la compression nécessaire + marge. */
      rate = -Math.ceil(((duration / (slot - 0.5)) - 1) * 100 + 4);
      if (rate <= -60) throw new Error(`${story.id} ch.${index + 1} : narration trop longue même accélérée`);
    }
    if (chapterAudio.length <= index) throw new Error(`${story.id} ch.${index + 1} : synthèse incomplète`);
  }

  /* 2. Assemblage : voix à `audioStart` pile, silences entre, durée finale exacte. */
  let assembled = padTo(Buffer.alloc(0), 0);
  let cursor = 0;
  for (const { index, mp3, duration } of chapterAudio) {
    const chapter = story.chapters[index];
    const start = Math.max(chapter.audioStart, cursor);
    if (start > chapter.audioStart + 0.5) {
      console.warn(`  ⚠ ${story.id} ch.${index + 1} : voix décalée de ${(start - chapter.audioStart).toFixed(1)} s`);
    }
    assembled = padTo(assembled, start);
    assembled = Buffer.concat([assembled, mp3]);
    cursor = start + duration;

    /* 3. Recalage proportionnel des cues du chapitre sur le débit réel. */
    if (chapter.cues?.length) {
      const slot = chapter.audioEnd - chapter.audioStart;
      const factor = Math.min(1, duration / slot);
      chapter.cues = chapter.cues.map((cue) => ({
        ...cue,
        start: Math.round((start + (cue.start - chapter.audioStart) * factor) * 10) / 10,
        end: Math.round((start + (cue.end - chapter.audioStart) * factor) * 10) / 10,
      }));
      cueUpdates.push(`${story.id}/${chapter.id} : ${chapter.cues.length} cues × ${(factor * 100).toFixed(0)} %`);
    }
  }
  assembled = padTo(assembled, totalDuration);

  /* 4. Écriture du master + métadonnées de piste honnêtes. */
  const outPath = `public/audio/stories/${story.id}/${story.id}-fr.mp3`;
  writeFileSync(outPath, assembled);
  track.src = `/${outPath.replace('public/', '')}`;
  track.format = 'mp3';
  track.narrator = 'Voix neuronale fr-FR (démonstration)';

  const seconds = mp3Duration(assembled.length);
  console.log(
    `✓ ${story.id} — ${storyChaptersDone} chapitres, ${(assembled.length / 1024 / 1024).toFixed(2)} Mio, ${(seconds / 60).toFixed(1)} min`,
  );
}

/* 5. Réécriture du corpus (indentation 2 espaces, comme le fichier d'origine). */
writeFileSync(STORIES_PATH, `${JSON.stringify(stories, null, 2)}\n`);

if (cueUpdates.length) console.log('Cues recalés :\n  ' + cueUpdates.join('\n  '));
console.log(`→ ${chaptersDone} chapitres narrés en ${VOICE}`);
