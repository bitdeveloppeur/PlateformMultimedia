/**
 * Script pour réduire les silences dans les fichiers audio
 * 
 * Détecte les silences > 2 secondes et les réduit à 0.8 seconde
 * 
 * Usage: node scripts/reduce-audio-silences.js [--dry-run]
 * 
 * Options:
 *   --dry-run    Affiche ce qui serait fait sans modifier les fichiers
 *   --backup     Crée une sauvegarde des fichiers originaux (suffix: .original)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Configuration
const AUDIO_DIR = path.join(__dirname, '../public/audio/stories');
const SILENCE_THRESHOLD_DB = -50; // Niveau sonore considéré comme silence (dB)
const MIN_SILENCE_DURATION = 5.0; // Silences > 5 secondes (on traite que les vraiment longs)
const TARGET_SILENCE_DURATION = 2.5; // Réduits à 2.5 secondes

// Arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldBackup = args.includes('--backup');

/**
 * Vérifie si ffmpeg est installé
 */
async function checkFFmpeg() {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    console.error('❌ FFmpeg n\'est pas installé ou pas dans le PATH');
    console.error('\nPour installer FFmpeg:');
    console.error('  - Windows: choco install ffmpeg  (ou télécharger depuis ffmpeg.org)');
    console.error('  - Mac: brew install ffmpeg');
    console.error('  - Linux: sudo apt install ffmpeg\n');
    return false;
  }
}

/**
 * Détecte les silences dans un fichier audio
 */
async function detectSilences(filePath) {
  try {
    const command = `ffmpeg -i "${filePath}" -af silencedetect=noise=${SILENCE_THRESHOLD_DB}dB:d=${MIN_SILENCE_DURATION} -f null -`;
    const { stderr } = await execAsync(command);
    
    // Parser la sortie de ffmpeg pour extraire les silences
    const silenceRegex = /silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
    const silences = [];
    let match;
    
    while ((match = silenceRegex.exec(stderr)) !== null) {
      silences.push({
        start: parseFloat(match[1]),
        end: parseFloat(match[2]),
        duration: parseFloat(match[3])
      });
    }
    
    return silences;
  } catch (error) {
    // Ignorer l'erreur car ffmpeg retourne un code d'erreur même en succès avec -f null
    return [];
  }
}

/**
 * Réduit les silences dans un fichier audio
 */
async function reduceSilences(inputPath, outputPath, silences) {
  if (silences.length === 0) {
    console.log('  ℹ️  Aucun silence long détecté');
    return false;
  }

  // Construire le filtre complexe pour ffmpeg
  // On va créer des segments et les concaténer
  let filterComplex = '';
  let inputs = '';
  let concat = '';
  
  let currentTime = 0;
  let segmentIndex = 0;
  
  for (let i = 0; i < silences.length; i++) {
    const silence = silences[i];
    
    // Segment avant le silence
    if (silence.start > currentTime) {
      const segmentDuration = silence.start - currentTime;
      filterComplex += `[0:a]atrim=${currentTime}:${silence.start},asetpts=PTS-STARTPTS[a${segmentIndex}];`;
      concat += `[a${segmentIndex}]`;
      segmentIndex++;
    }
    
    // Ajouter le silence réduit
    const silenceStart = silence.start;
    const silenceEnd = Math.min(silence.start + TARGET_SILENCE_DURATION, silence.end);
    filterComplex += `[0:a]atrim=${silenceStart}:${silenceEnd},asetpts=PTS-STARTPTS[a${segmentIndex}];`;
    concat += `[a${segmentIndex}]`;
    segmentIndex++;
    
    currentTime = silence.end;
  }
  
  // Ajouter le segment final après le dernier silence
  filterComplex += `[0:a]atrim=${currentTime},asetpts=PTS-STARTPTS[a${segmentIndex}];`;
  concat += `[a${segmentIndex}]`;
  segmentIndex++;
  
  // Concaténer tous les segments
  filterComplex += `${concat}concat=n=${segmentIndex}:v=0:a=1[out]`;
  
  // Commande ffmpeg
  const command = `ffmpeg -y -i "${inputPath}" -filter_complex "${filterComplex}" -map "[out]" "${outputPath}"`;
  
  try {
    await execAsync(command);
    return true;
  } catch (error) {
    console.error(`  ❌ Erreur lors du traitement: ${error.message}`);
    return false;
  }
}

/**
 * Traite un fichier audio
 */
async function processAudioFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  console.log(`\n📄 ${fileName}`);
  
  // Détecter les silences
  console.log('  🔍 Détection des silences...');
  const silences = await detectSilences(filePath);
  
  if (silences.length === 0) {
    console.log('  ✅ Aucun silence long (>2s) détecté');
    return { processed: false, silences: 0 };
  }
  
  console.log(`  📊 ${silences.length} silence(s) long(s) détecté(s):`);
  silences.forEach((s, i) => {
    console.log(`     ${i + 1}. ${s.start.toFixed(2)}s → ${s.end.toFixed(2)}s (durée: ${s.duration.toFixed(2)}s)`);
  });
  
  if (isDryRun) {
    console.log('  🔸 [DRY-RUN] Le fichier serait traité');
    return { processed: false, silences: silences.length };
  }
  
  // Créer une sauvegarde si demandé
  if (shouldBackup) {
    const backupPath = filePath.replace(ext, `.original${ext}`);
    await fs.copyFile(filePath, backupPath);
    console.log(`  💾 Sauvegarde créée: ${path.basename(backupPath)}`);
  }
  
  // Créer un fichier temporaire
  const tempPath = filePath.replace(ext, `.temp${ext}`);
  
  console.log('  ⚙️  Traitement en cours...');
  const success = await reduceSilences(filePath, tempPath, silences);
  
  if (success) {
    // Remplacer le fichier original
    await fs.unlink(filePath);
    await fs.rename(tempPath, filePath);
    console.log('  ✅ Silences réduits avec succès !');
    return { processed: true, silences: silences.length };
  } else {
    // Nettoyer le fichier temp en cas d'erreur
    try {
      await fs.unlink(tempPath);
    } catch {}
    return { processed: false, silences: silences.length };
  }
}

/**
 * Trouve tous les fichiers audio récursivement
 */
async function findAudioFiles(dir) {
  const audioFiles = [];
  
  async function scan(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.mp3', '.wav'].includes(ext)) {
          audioFiles.push(fullPath);
        }
      }
    }
  }
  
  await scan(dir);
  return audioFiles;
}

/**
 * Main
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🎵 Réduction des silences dans les fichiers audio 🎵    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  if (isDryRun) {
    console.log('⚠️  MODE DRY-RUN: Aucun fichier ne sera modifié\n');
  }
  
  if (shouldBackup) {
    console.log('💾 MODE BACKUP: Les originaux seront sauvegardés (.original)\n');
  }
  
  // Vérifier ffmpeg
  console.log('🔍 Vérification de FFmpeg...');
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    process.exit(1);
  }
  console.log('✅ FFmpeg trouvé\n');
  
  // Trouver les fichiers
  console.log(`📁 Recherche des fichiers audio dans: ${AUDIO_DIR}`);
  const audioFiles = await findAudioFiles(AUDIO_DIR);
  console.log(`✅ ${audioFiles.length} fichier(s) trouvé(s)\n`);
  
  if (audioFiles.length === 0) {
    console.log('Aucun fichier audio à traiter.');
    return;
  }
  
  console.log('════════════════════════════════════════════════════════════\n');
  
  // Traiter chaque fichier
  const results = {
    total: audioFiles.length,
    processed: 0,
    skipped: 0,
    totalSilencesFound: 0
  };
  
  for (const filePath of audioFiles) {
    const result = await processAudioFile(filePath);
    
    if (result.processed) {
      results.processed++;
    } else {
      results.skipped++;
    }
    results.totalSilencesFound += result.silences;
  }
  
  // Résumé
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📊 RÉSUMÉ:');
  console.log(`   Total de fichiers: ${results.total}`);
  console.log(`   Traités: ${results.processed}`);
  console.log(`   Ignorés (pas de silence long): ${results.skipped}`);
  console.log(`   Total de silences trouvés: ${results.totalSilencesFound}`);
  console.log('════════════════════════════════════════════════════════════\n');
  
  if (isDryRun) {
    console.log('💡 Pour traiter les fichiers, relancez sans --dry-run');
    console.log('💡 Pour créer des sauvegardes, ajoutez --backup\n');
  } else if (results.processed > 0) {
    console.log('✅ Traitement terminé avec succès!\n');
  }
}

main().catch(error => {
  console.error('\n❌ Erreur:', error.message);
  process.exit(1);
});
