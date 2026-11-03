# Couche données — corpus des récits (Étape 1)

| Fichier           | Rôle |
| ----------------- | ---- |
| `stories.json`    | Corpus brut : 3 récits emblématiques géolocalisés. **Frontière de confiance** — jamais importé directement ailleurs que par `stories.ts`. |
| `stories.ts`      | Validation d'exécution + accès typé : `stories`, `getStoryById`, `getStoriesByCategory`, `corpusStats`. |
| `regions.bf.ts`   | Les 13 régions administratives + emprise `BURKINA_BOUNDS` (bornage initial de la carte 3D, Étape 2). |
| `../types/`       | Modèle `Story` et unions discriminées de déclencheurs (`map:flyto`, `map:marker`, `canvas:effect`, `visual:image`, `audio:ambient`). |

## Conventions des assets placeholder

- `/audio/stories/<story-id>/<story-id>-<lang>.mp3` — masters narratifs (à enregistrer) ;
- `/audio/ambient/*.mp3` — boucles d'ambiance spatialisées ;
- `/images/stories/<story-id>/*.svg` — illustrations de chapitres (générées à l'Étape 4).

Les narrateurs sont des voix de démonstration. Tout chemin encore absent est
déjà structuré pour être **drop-in** aux Étapes 3–4, sans toucher au code.

## Ajouter un récit

1. Dupliquer un objet de `stories.json` (schéma : `src/types/story.ts`).
2. `fr` est obligatoire dans tout `LocalizedText` (pivot de repli) ;
   `audioStart`/`audioEnd` croissants et contigus ; cues dans les bornes du chapitre.
3. La validation de `stories.ts` échoue **tôt et bruyamment** au premier écart
   (mauvais code de région, couleur invalide, timecode incohérent…).
