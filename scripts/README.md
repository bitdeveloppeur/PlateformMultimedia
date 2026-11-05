# Scripts Audio - Voix du Faso

## 🎵 Réduction des silences (`reduce-audio-silences.js`)

Script pour réduire automatiquement les longs silences dans les fichiers audio MP3 et WAV.

### Prérequis

**FFmpeg** doit être installé :

#### Windows
```powershell
# Avec Chocolatey
choco install ffmpeg

# Ou télécharger depuis https://ffmpeg.org/download.html
```

#### macOS
```bash
brew install ffmpeg
```

#### Linux
```bash
sudo apt install ffmpeg
```

### Utilisation

#### 1. Test sans modification (recommandé en premier)
```bash
node scripts/reduce-audio-silences.js --dry-run
```

Cela affiche :
- Tous les fichiers audio trouvés
- Les silences détectés dans chaque fichier
- Ce qui serait fait, SANS modifier les fichiers

#### 2. Traitement avec sauvegarde (recommandé)
```bash
node scripts/reduce-audio-silences.js --backup
```

Cela :
- Crée une copie de chaque fichier original (suffix: `.original`)
- Réduit les silences > 2s à 0.8s
- Sauvegarde le fichier corrigé avec le nom original

#### 3. Traitement direct (sans backup)
```bash
node scripts/reduce-audio-silences.js
```

⚠️ **Attention:** Les fichiers originaux seront remplacés définitivement !

### Configuration

Vous pouvez ajuster les paramètres dans le script :

```javascript
const SILENCE_THRESHOLD_DB = -50;     // Niveau sonore = silence (dB)
const MIN_SILENCE_DURATION = 2.0;     // Silences > 2 secondes
const TARGET_SILENCE_DURATION = 0.8;  // Réduits à 0.8 seconde
```

### Exemple de sortie

```
╔════════════════════════════════════════════════════════════╗
║   🎵 Réduction des silences dans les fichiers audio 🎵    ║
╚════════════════════════════════════════════════════════════╝

🔍 Vérification de FFmpeg...
✅ FFmpeg trouvé

📁 Recherche des fichiers audio dans: public/audio/stories
✅ 6 fichier(s) trouvé(s)

════════════════════════════════════════════════════════════

📄 yennenga-mere-des-moose-fr.mp3
  🔍 Détection des silences...
  📊 3 silence(s) long(s) détecté(s):
     1. 45.20s → 48.50s (durée: 3.30s)
     2. 89.10s → 92.00s (durée: 2.90s)
     3. 135.80s → 138.20s (durée: 2.40s)
  💾 Sauvegarde créée: yennenga-mere-des-moose-fr.original.mp3
  ⚙️  Traitement en cours...
  ✅ Silences réduits avec succès !

📄 yennenga-mere-des-moose-moore.wav
  🔍 Détection des silences...
  ✅ Aucun silence long (>2s) détecté

...

════════════════════════════════════════════════════════════
📊 RÉSUMÉ:
   Total de fichiers: 6
   Traités: 4
   Ignorés (pas de silence long): 2
   Total de silences trouvés: 12
════════════════════════════════════════════════════════════

✅ Traitement terminé avec succès!
```

### Restaurer les originaux

Si vous avez utilisé `--backup`, les fichiers originaux sont sauvegardés :

```bash
# Windows PowerShell
Get-ChildItem -Recurse -Filter "*.original.mp3" | ForEach-Object {
  $original = $_.FullName
  $target = $original -replace '\.original\.mp3$', '.mp3'
  Copy-Item $original $target -Force
}

# Linux/Mac
find public/audio/stories -name "*.original.mp3" -exec sh -c 'cp "$1" "${1%.original.mp3}.mp3"' _ {} \;
```

### Workflow recommandé

1. **Test**: `node scripts/reduce-audio-silences.js --dry-run`
2. **Traitement avec backup**: `node scripts/reduce-audio-silences.js --backup`
3. **Écouter les fichiers** pour vérifier la qualité
4. **Si satisfait**: Supprimer les `.original.*` pour libérer l'espace
5. **Si non satisfait**: Restaurer les originaux (voir commandes ci-dessus)

### Notes techniques

- Le script utilise le filtre `silencedetect` de ffmpeg
- Les silences sont détectés à -50dB (réglable)
- Le traitement préserve la qualité audio originale
- Compatible MP3 et WAV
- Traite récursivement tous les sous-dossiers de `public/audio/stories`

### Dépannage

**"FFmpeg n'est pas installé"**
- Installer FFmpeg (voir Prérequis)
- Vérifier avec: `ffmpeg -version`

**"Aucun fichier audio trouvé"**
- Vérifier le chemin: `public/audio/stories/`
- Extensions supportées: `.mp3`, `.wav`

**"Erreur lors du traitement"**
- Vérifier que le fichier n'est pas ouvert dans un autre programme
- Vérifier les permissions d'écriture
- Essayer avec `--dry-run` pour diagnostiquer
