/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  GÉNÉRATEUR D'ILLUSTRATIONS DE DÉMONSTRATION (Étape 4 · 1/2)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Produit, pour chaque récit du corpus, les SVG référencés par le JSON :
 *   • la COVER du récit (story.cover.image) ;
 *   • une illustration par trigger « visual:image » de chapitre (nom de
 *     fichier + traitement ken-burns / parallax / fade scriptés dans le
 *     corpus).
 *
 *  Style : « ethno-futuriste géométrique » GÉNÉRATIF et DÉTERMINISTE —
 *  PRNG mulberry32 semé par « récit/illustration » (même philosophie que
 *  l'audio démo et les waveforms : stables d'une exécution à l'autre),
 *  couleurs portées par story.cover.palette, motif central différencié
 *  par nom d'illustration (guerrière → cavalière, remparts → murailles…).
 *
 *  Usage :  npm run assets:images  →  public/images/stories/<story-id>/*.svg
 *  Drop-in : remplacer un SVG par une illustration réelle garde tout le
 *  code intact (seul le fichier change).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const W = 1200;
const H = 800;
const OUT_ROOT = 'public/images/stories';

const stories = JSON.parse(readFileSync('src/data/stories.json', 'utf8'));

/* ── PRNG mulberry32 semé par chaîne (identique aux waveforms du lecteur) ──── */
function seededRandom(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
/** Éclaircit une couleur #RRGGBB d'un facteur 0–1 (mélange vers le blanc). */
const lighten = (hex, t) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c) => Math.round(c + (255 - c) * t).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
};
/** Assombrit vers le noir. */
const darken = (hex, t) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c * (1 - t)).toString(16).padStart(2, '0');
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
};
const n2 = (v) => Math.round(v * 100) / 100;

/* ── Registre des motifs : une interprétation géométrique par illustration ───
 *  Chaque fonction reçoit (rnd, P) où P = palette [{d: foncé}, …] et rend
 *  une chaîne d'éléments SVG centrés dans viewBox 1200×800. */
const MOTIFS = {
  /* Cover : soleil rayonnant au-dessus de montagnes en plans successifs. */
  cover(rnd, P) {
    const cx = 420 + rnd() * 360;
    const cy = 300 + rnd() * 90;
    const r = 120 + rnd() * 50;
    let s = '';
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * Math.PI * 2;
      const a1 = a0 + Math.PI / 24;
      s += `<path d="M${n2(cx)} ${n2(cy)} L${n2(cx + Math.cos(a0) * W)} ${n2(cy + Math.sin(a0) * W)} L${n2(cx + Math.cos(a1) * W)} ${n2(cy + Math.sin(a1) * W)} Z" fill="${P[1]}" opacity="0.16"/>`;
    }
    s += `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}" fill="${P[1]}"/>`;
    s += `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r * 0.68)}" fill="${lighten(P[1], 0.28)}"/>`;
    const ridges = [
      { y: 620, amp: 150, fill: darken(P[0], 0.12), seedOff: 0 },
      { y: 690, amp: 110, fill: darken(P[0], 0.28), seedOff: 3 },
      { y: 760, amp: 80, fill: darken(P[0], 0.45), seedOff: 7 },
    ];
    for (const rg of ridges) {
      let d = `M0 ${H}`;
      for (let x = 0; x <= W; x += 100) {
        const y = rg.y - Math.sin((x / W) * (3 + rg.seedOff) + rg.seedOff) * rg.amp * (0.5 + rnd() * 0.5);
        d += ` L${x} ${n2(y)}`;
      }
      s += `<path d="${d} L${W} ${H} Z" fill="${rg.fill}"/>`;
    }
    return s;
  },

  /* Guerrière : cavalière au galop — corps du cheval en polygone, cavalière
   *  debout, lance diagonale, traînées de vitesse. */
  guerriere(rnd, P) {
    let s = '';
    for (let i = 0; i < 5; i++) {
      s += `<path d="M${140 + i * 40} ${520 + i * 6} q60 -26 120 0" fill="none" stroke="${P[1]}" stroke-width="${5 + rnd() * 4}" opacity="0.4" stroke-linecap="round"/>`;
    }
    s += `<path d="M330 470 L520 430 L760 440 L880 480 L820 560 L560 570 L380 545 Z" fill="${P[3]}"/>`;
    s += `<path d="M330 470 L370 400 L430 395 L470 430 Z" fill="${P[3]}"/>`;
    s += `<path d="M880 480 L1010 560 L990 585 L840 560 Z" fill="${darken(P[3], 0.2)}"/>`;
    for (const leg of [[430, 560, 400, 680], [560, 570, 545, 690], [700, 565, 715, 685], [830, 555, 870, 675]]) {
      s += `<path d="M${leg[0]} ${leg[1]} L${leg[2]} ${leg[3]} L${leg[2] + 34} ${leg[3]} L${leg[0] + 30} ${leg[1] - 8} Z" fill="${darken(P[3], 0.3)}"/>`;
    }
    s += `<circle cx="480" cy="330" r="34" fill="${P[2]}"/>`;
    s += `<path d="M470 364 L510 364 L540 455 L445 455 Z" fill="${P[1]}"/>`;
    s += `<path d="M505 320 L640 175" stroke="${P[2]}" stroke-width="10" stroke-linecap="round"/>`;
    s += `<path d="M640 175 L675 140 L660 190 Z" fill="${P[2]}"/>`;
    s += `<circle cx="480" cy="268" r="16" fill="${P[1]}"/>`;
    return s;
  },

  /* Étalon d'or : cheval cabré — encolure dynamique, crinière en dents. */
  'etalon-d-or'(rnd, P) {
    let s = '';
    s += `<path d="M300 620 Q520 700 780 660 L900 620 L860 580 Q600 640 380 590 Z" fill="${darken(P[0], 0.2)}"/>`;
    s += `<path d="M340 600 Q400 420 560 350 Q700 300 800 340 L840 430 Q740 400 660 440 Q600 470 590 560 Q580 630 520 640 L400 640 Q340 636 340 600 Z" fill="${P[1]}"/>`;
    s += `<path d="M800 340 Q880 250 960 280 Q930 330 860 380 Z" fill="${lighten(P[1], 0.15)}"/>`;
    let mane = `M790 350`;
    for (let i = 0; i < 6; i++) {
      const x = 760 - i * 38;
      const y = 380 + i * 30;
      mane += ` L${x + 26} ${y - 36} L${x} ${y + 8}`;
    }
    s += `<path d="${mane}" fill="${P[3]}" opacity="0.9"/>`;
    s += `<path d="M420 640 L390 760 L435 765 L470 645 Z" fill="${darken(P[1], 0.25)}"/>`;
    s += `<path d="M560 640 L540 775 L585 778 L610 645 Z" fill="${darken(P[1], 0.25)}"/>`;
    for (let i = 0; i < 14; i++) {
      const x = 250 + rnd() * 700, y = 120 + rnd() * 380;
      s += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${2 + rnd() * 3.5}" fill="${P[1]}" opacity="${0.3 + rnd() * 0.5}"/>`;
    }
    return s;
  },

  /* Village au clair de lune : cases en demi-cercles, lune, palmes. */
  'village-clair-de-lune'(rnd, P) {
    let s = '';
    s += `<circle cx="880" cy="200" r="95" fill="${P[2]}"/>`;
    s += `<circle cx="915" cy="180" r="88" fill="${P[0]}"/>`;
    const huts = [
      { x: 240, w: 300, h: 200 }, { x: 620, w: 220, h: 150 }, { x: 850, w: 170, h: 115 },
    ];
    for (const [i, hut] of huts.entries()) {
      s += `<path d="M${hut.x} 640 A${hut.w / 2} ${hut.h} 0 0 1 ${hut.x + hut.w} 640 Z" fill="${i === 0 ? P[3] : darken(P[3], 0.12 + i * 0.1)}"/>`;
      s += `<path d="M${hut.x + hut.w / 2 - 4} ${640 - hut.h - 22} L${hut.x + hut.w / 2 + 4} ${640 - hut.h - 22} L${hut.x + hut.w / 2 + 2} ${640 - hut.h - 48} L${hut.x + hut.w / 2 - 2} ${640 - hut.h - 48} Z" fill="${P[1]}"/>`;
    }
    s += `<path d="M340 640 L360 500 L378 640 M362 520 L300 470 M366 530 L430 478" stroke="${P[1]}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.85"/>`;
    for (let i = 0; i < 26; i++) {
      s += `<circle cx="${n2(rnd() * W)}" cy="${n2(60 + rnd() * 420)}" r="${1.4 + rnd() * 2.2}" fill="${P[2]}" opacity="${0.25 + rnd() * 0.55}"/>`;
    }
    s += `<rect x="0" y="640" width="${W}" height="${H - 640}" fill="${darken(P[0], 0.15)}"/>`;
    return s;
  },

  /* Relais des tortues : carapaces à arcs concentriques en quinconce + fanion. */
  'relais-tortues'(rnd, P) {
    let s = '';
    const shell = (x, y, r, c) => {
      let out = `<path d="M${n2(x - r)} ${n2(y)} A${r} ${r} 0 0 1 ${n2(x + r)} ${n2(y)} Z" fill="${c}"/>`;
      for (const k of [0.66, 0.36]) {
        out += `<path d="M${n2(x - r * k)} ${n2(y)} A${r * k} ${r * k} 0 0 1 ${n2(x + r * k)} ${n2(y)}" fill="none" stroke="${lighten(c, 0.35)}" stroke-width="4"/>`;
      }
      return out;
    };
    const rows = [
      { y: 430, n: 4, r: 92 }, { y: 590, n: 5, r: 74 }, { y: 720, n: 6, r: 58 },
    ];
    for (const [ri, row] of rows.entries()) {
      for (let i = 0; i < row.n; i++) {
        const x = (W / row.n) * i + W / (row.n * 2) + (ri % 2 ? 40 : -20);
        s += shell(x, row.y, row.r * (0.85 + rnd() * 0.3), ri % 2 ? P[3] : P[1]);
      }
    }
    s += `<path d="M980 660 L980 380" stroke="${P[2]}" stroke-width="10"/>`;
    s += `<path d="M980 385 L1130 425 L980 470 Z" fill="${P[1]}"/>`;
    return s;
  },

  /* Morale du soir : feu de camp — triangles emboîtés, étincelles, pierres. */
  'morale-du-soir'(rnd, P) {
    let s = '';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      s += `<circle cx="${n2(600 + Math.cos(a) * 330)}" cy="${n2(640 + Math.sin(a) * 130)}" r="22" fill="${darken(P[0], 0.3)}"/>`;
    }
    const flames = [
      { w: 150, h: 320, c: P[3] }, { w: 96, h: 235, c: P[1] }, { w: 52, h: 140, c: lighten(P[1], 0.45) },
    ];
    for (const f of flames) {
      s += `<path d="M600 ${640 - f.h} Q${600 + f.w} ${640 - f.h * 0.45} ${600 + f.w * 0.55} 640 L${600 - f.w * 0.55} 640 Q${600 - f.w} ${640 - f.h * 0.45} 600 ${640 - f.h} Z" fill="${f.c}"/>`;
    }
    for (let i = 0; i < 16; i++) {
      s += `<circle cx="${n2(540 + rnd() * 120)}" cy="${n2(220 + rnd() * 260)}" r="${2 + rnd() * 3}" fill="${P[1]}" opacity="${0.35 + rnd() * 0.5}"/>`;
    }
    return s;
  },

  /* Remparts de Loropéni : murailles en gradins de blocs + portes en arc. */
  remparts(rnd, P) {
    let s = '';
    const tiers = [
      { y: 560, blockH: 54, fill: P[3] }, { y: 640, blockH: 60, fill: darken(P[3], 0.14) },
      { y: 722, blockH: 66, fill: darken(P[3], 0.3) },
    ];
    for (const [ti, t] of tiers.entries()) {
      let x = -30 + rnd() * 40;
      while (x < W) {
        const bw = 90 + rnd() * 110;
        s += `<rect x="${n2(x)}" y="${t.y}" width="${n2(bw - 8)}" height="${t.blockH}" rx="7" fill="${t.fill}" opacity="0.96"/>`;
        x += bw;
      }
      if (ti === 1) {
        s += `<path d="M540 ${t.y + t.blockH} L540 700 A60 60 0 0 1 660 700 L660 ${t.y + t.blockH} Z" fill="${darken(P[0], 0.1)}"/>`;
      }
    }
    s += `<circle cx="600" cy="250" r="130" fill="${P[1]}" opacity="0.9"/>`;
    s += `<circle cx="600" cy="250" r="130" fill="none" stroke="${lighten(P[1], 0.4)}" stroke-width="8"/>`;
    for (let i = 0; i < 10; i++) {
      s += `<circle cx="${n2(150 + rnd() * 900)}" cy="${n2(110 + rnd() * 260)}" r="${1.6 + rnd() * 2.4}" fill="${P[2]}" opacity="0.5"/>`;
    }
    return s;
  },

  /* Route de l'or : chemin sinueux pointillé entre collines. */
  'route-de-l-or'(rnd, P) {
    let s = '';
    const hills = [
      { y: 590, fill: darken(P[3], 0.05) }, { y: 660, fill: darken(P[3], 0.2) },
    ];
    for (const h of hills) {
      let d = `M0 ${H}`;
      for (let x = 0; x <= W; x += 150) {
        d += ` Q${x + 75} ${h.y - 120 * rnd()} ${Math.min(x + 150, W)} ${h.y - 60 * rnd()}`;
      }
      s += `<path d="${d} L${W} ${H} Z" fill="${h.fill}"/>`;
    }
    s += `<path d="M180 800 C240 620 520 700 640 560 C740 445 760 420 1010 330" fill="none" stroke="${P[1]}" stroke-width="46" stroke-linecap="round" opacity="0.95"/>`;
    s += `<path d="M180 800 C240 620 520 700 640 560 C740 445 760 420 1010 330" fill="none" stroke="${darken(P[1], 0.35)}" stroke-width="10" stroke-dasharray="4 34" stroke-linecap="round"/>`;
    s += `<circle cx="1010" cy="330" r="30" fill="${P[1]}"/>`;
    s += `<path d="M1010 330 L1120 210 M1040 322 L1128 268" stroke="${P[1]}" stroke-width="9" stroke-linecap="round" opacity="0.7"/>`;
    for (let i = 0; i < 12; i++) {
      s += `<circle cx="${n2(rnd() * W)}" cy="${n2(80 + rnd() * 300)}" r="${1.6 + rnd() * 2.4}" fill="${P[2]}" opacity="0.45"/>`;
    }
    return s;
  },

  /* Patrimoine mondial : médaillon — étoile à huit branches et lauriers. */
  'patrimoine-mondial'(rnd, P) {
    let s = '';
    s += `<circle cx="600" cy="400" r="235" fill="${darken(P[0], 0.18)}"/>`;
    s += `<circle cx="600" cy="400" r="235" fill="none" stroke="${P[1]}" stroke-width="10"/>`;
    s += `<circle cx="600" cy="400" r="205" fill="none" stroke="${P[1]}" stroke-width="3" opacity="0.6"/>`;
    const star = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 170 : 70;
      star.push(`${n2(600 + Math.cos(a) * r)} ${n2(400 + Math.sin(a) * r)}`);
    }
    s += `<polygon points="${star.join(' ')}" fill="${P[1]}"/>`;
    s += `<circle cx="600" cy="400" r="52" fill="${lighten(P[1], 0.5)}"/>`;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const a = side * (Math.PI / 2.4) + side * i * 0.16;
        s += `<path d="M${n2(600 + side * 250)} ${n2(400 + 190)} Q${n2(600 + side * (330 + i * 14))} ${n2(400 + 40 - i * 12)} ${n2(600 + side * (262 + i * 12))} ${n2(400 - 190 + i * 6)}" fill="none" stroke="${P[3]}" stroke-width="9" stroke-linecap="round" opacity="${0.85 - i * 0.09}"/>`;
      }
    }
    return s;
  },
};

/* ── Squelette commun : fond dégradé + bandes bogolan + motif + grain ─────── */
function buildSvg(seed, palette, motifKey) {
  const rnd = seededRandom(seed);
  const P = palette;
  const motif = MOTIFS[motifKey] ?? MOTIFS.cover;

  /* Bandes de triangles alternés, façon tissage bogolan, haut et bas. */
  let bands = '';
  for (const y of [26, H - 66]) {
    for (let x = 0, i = 0; x < W + 60; x += 60, i++) {
      const c = i % 3 === 0 ? P[1] : i % 3 === 1 ? P[3] : P[2];
      bands += `<polygon points="${x},${y + 40} ${x + 30},${y} ${x + 60},${y + 40}" fill="${c}" opacity="0.85"/>`;
    }
  }

  const stars = Array.from({ length: 34 }, () => {
    const x = rnd() * W, y = 40 + rnd() * (H - 80);
    return `<circle cx="${n2(x)}" cy="${n2(y)}" r="${0.9 + rnd() * 1.7}" fill="${pick(rnd, [P[2], lighten(P[1], 0.5)])}" opacity="${0.18 + rnd() * 0.4}"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <linearGradient id="fond" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P[0]}"/>
      <stop offset="0.62" stop-color="${darken(P[0], 0.18)}"/>
      <stop offset="1" stop-color="${darken(P[0], 0.42)}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#fond)"/>
  ${stars}
  ${motif(rnd, P)}
  ${bands}
  <rect x="${W - 132}" y="${H - 138}" width="24" height="24" fill="none" stroke="${P[2]}" stroke-width="3" opacity="0.7" transform="rotate(45 ${W - 120} ${H - 126})"/>
</svg>
`;
}

/* ── Parcours du corpus : cover + triggers visual:image ───────────────────── */
let totalFiles = 0;
let totalBytes = 0;

for (const story of stories) {
  const outDir = join(OUT_ROOT, story.id);
  mkdirSync(outDir, { recursive: true });
  const palette = story.cover.palette;

  /* 1. Cover du récit. */
  const coverName = story.cover.image.split('/').pop();
  const coverSvg = buildSvg(`${story.id}/cover`, palette, 'cover');
  writeFileSync(join(outDir, coverName), coverSvg);
  totalFiles++; totalBytes += Buffer.byteLength(coverSvg);

  /* 2. Illustrations de chapitres (triggers « visual:image »). */
  for (const chapter of story.chapters) {
    for (const trigger of chapter.triggers ?? []) {
      if (trigger.type !== 'visual:image') continue;
      const fileName = trigger.src.split('/').pop().replace(/\.svg$/, '');
      const svg = buildSvg(`${story.id}/${fileName}`, palette, fileName);
      const target = join(outDir, `${fileName}.svg`);
      writeFileSync(target, svg);
      totalFiles++; totalBytes += Buffer.byteLength(svg);
    }
  }

  /* Vérification : le dossier attend bien tous les chemins référencés. */
  const referenced = new Set([story.cover.image, ...story.chapters.flatMap((c) => (c.triggers ?? []).filter((t) => t.type === 'visual:image').map((t) => t.src))]);
  for (const ref of referenced) {
    const local = ref.replace('/images/stories/', '').replace(`${story.id}/`, '');
    try {
      statSync(join(outDir, local));
    } catch {
      console.error(`  ✗ référence sans fichier généré : ${ref} (motif inconnu du registre)`);
      process.exitCode = 1;
    }
  }
  console.log(`✓ ${story.id} — ${referenced.size} illustration(s) dans ${outDir}`);
}

console.log(`→ ${totalFiles} SVG générés (${(totalBytes / 1024).toFixed(1)} Kio)`);
