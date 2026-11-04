/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  GÉNÉRATEUR D'AUDIO DE DÉMONSTRATION (Étape 3)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Produit, pour chaque piste du corpus, un WAV 8 bits / 4 kHz :
 *   • un drone doux dont la hauteur dépend de la LANGUE (Sol, Fa, Mib, Ré) —
 *     la bascule de langue s'entend donc à l'oreille ;
 *   • un « blip » harmonique à chaque frontière de CHAPITRE, positionné au
 *     prorata de la durée de la piste (mapping grille fr → piste langue) :
 *     le hook useMultilingualAudio se vérifie ainsi auditivement ;
 *   • fondu global de 2 s en tête et en queue.
 *
 *  Usage :  npm run assets:audio   →  public/audio/stories/<id>/<id>-<lang>.wav
 *  (Durées = durationHint exactes du corpus : le scruber et les timecodes
 *   tombent juste d'office.)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SAMPLE_RATE = 4000;
/** Hauteurs de drone par langue (Hz) — repères auditifs distincts. */
const TONES = { fr: 196.0, moore: 174.6, dioula: 155.6, fulfulde: 146.8 };

const stories = JSON.parse(readFileSync('src/data/stories.json', 'utf8'));

function wavHeader(dataLength, sampleRate) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // taille bloc fmt
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate, 28); // byteRate = SR × 1 octet
  header.writeUInt16LE(1, 32); // blockAlign
  header.writeUInt16LE(8, 34); // 8 bits
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

let totalFiles = 0;
let totalBytes = 0;

for (const story of stories) {
  const referenceTrack = story.languages.find((t) => t.language === 'fr') ?? story.languages[0];
  const referenceDuration = referenceTrack.durationHint;

  for (const track of story.languages) {
    const duration = track.durationHint;
    const scale = duration / referenceDuration; // mapping grille fr → piste langue
    const base = TONES[track.language] ?? 196;
    const sampleCount = Math.round(duration * SAMPLE_RATE);
    const data = Buffer.alloc(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      const t = i / SAMPLE_RATE;
      const breath = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.1 * t); // LFO lent
      let sample = 0.16 * breath * Math.sin(2 * Math.PI * base * t);

      // Blips aux frontières de chapitres, position mappée à la durée de la piste.
      for (const chapter of story.chapters) {
        const blipAt = chapter.audioStart * scale;
        const delta = t - blipAt;
        if (delta >= 0 && delta < 0.35) {
          const envelope = Math.sin((Math.PI * delta) / 0.35);
          sample += 0.22 * envelope * Math.sin(2 * Math.PI * base * 2 * delta);
        }
      }

      const fade = Math.min(1, t / 2, (duration - t) / 2);
      const clamped = Math.max(-1, Math.min(1, sample * fade));
      data[i] = Math.round(128 + clamped * 120);
    }

    const outPath = join('public', 'audio', 'stories', story.id, `${story.id}-${track.language}.wav`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, Buffer.concat([wavHeader(sampleCount, SAMPLE_RATE), data]));
    totalFiles += 1;
    totalBytes += 44 + sampleCount;
    console.log(
      `  ${story.id}-${track.language}.wav  ${duration}s  (${((44 + sampleCount) / 1024).toFixed(0)} Ko)`,
    );
  }
}

console.log(`\n${totalFiles} pistes générées dans public/audio/stories/ (${(totalBytes / 1024 / 1024).toFixed(1)} Mo)`);
