'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { Story } from '@/types';
import YennengaStage from './YennengaStage';
import { getStageBook } from '@/data/scenes';
import '../app/contes.css';

interface ContePageProps {
  story: Story;
}

export default function ContePage({ story }: ContePageProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'fr' | 'moore' | 'fulfulde' | 'dioula'>('fr');
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const chapters = story.chapters;
  const currentChapter = chapters[currentPage] || chapters[0];
  
  // Charger le stage book pour les scènes
  const book = getStageBook(story.id);
  const currentScene = book?.pages[currentPage + 1]; // +1 car pages[0] est la couverture
  
  // Trouver le fichier audio de la langue sélectionnée
  const selectedTrack = story.languages.find(t => t.language === selectedLang);
  const audioSrc = selectedTrack?.src || story.languages[0].src;
  
  const frTrack = story.languages.find(t => t.language === 'fr');
  const duration = frTrack ? Math.floor(frTrack.durationHint / 60) : 0;
  const seconds = frTrack ? frTrack.durationHint % 60 : 0;
  
  // Lancer l'audio automatiquement au démarrage
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.log('Autoplay bloqué, attente interaction utilisateur', err);
      });
      setIsPlaying(true);
    }
  }, []);
  
  // Changer d'audio quand la langue change
  useEffect(() => {
    if (audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.load();
      if (wasPlaying) {
        audioRef.current.play();
      }
    }
  }, [selectedLang]);
  
  // Gérer la lecture/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  // Mettre à jour le temps
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  // Navigation pages
  const goToPage = (pageIndex: number) => {
    setCurrentPage(pageIndex);
    // TODO: chercher le timestamp du chapitre et sauter à ce moment dans l'audio
  };
  
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="conte-page">
      {/* Navigation */}
      <nav className="conte-nav">
        <Link href="/" className="nav-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5m6-6-6 6 6 6"/>
          </svg>
          Tous les récits
        </Link>
        
        <div className="nav-wordmark">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/>
          </svg>
          <span className="nav-title">Voix du Faso</span>
        </div>
        
        <div className="nav-actions">
          <button className="nav-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M16 6 12 2 8 6"/>
              <path d="M12 2v12"/>
            </svg>
          </button>
          <button className="nav-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Scène livre double page */}
      <div className="conte-scene">
        {/* Design livre ouvert pour TOUS les contes */}
        <>
          <div className="livre-double">
            {/* Page gauche - Image de couverture */}
            <div className="page-gauche-interactive">
              <div style={{
                width: '100%',
                height: '100%',
                background: story.id === 'yennenga-mere-des-moose' 
                  ? `url(/images/covers/mzRNU.png) center/cover`
                  : story.id === 'le-lievre-et-la-tortue'
                  ? `url(/images/covers/oaLPy.png) center/cover`
                  : `url(/images/covers/kUm12.png) center/cover`,
                borderRadius: '8px 0 0 8px',
              }}></div>
            </div>
            
            {/* Page droite - texte */}
            <div className="page-droite">
              <div className="page-header">
                <p className="page-numero">
                  Chapitre {currentPage + 1} / {chapters.length}
                </p>
                <h1 className="page-titre">{currentChapter.title.fr}</h1>
              </div>
              
              <p className="page-texte">
                {currentChapter.narration.fr}
              </p>
              
              <button className="page-ecouter" onClick={togglePlayPause}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5 6 9H2v6h4l5 4V5zm4.5 3.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>
                </svg>
                {isPlaying ? 'Pause' : 'Écouter'}
              </button>
            </div>
            
            {/* Pli central */}
            <div className="livre-pli" />
          </div>
          
          {/* Boutons navigation */}
          <button 
            className="page-nav prev"
            onClick={() => goToPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5m6-6-6 6 6 6"/>
            </svg>
          </button>
          
          <button 
            className="page-nav next"
            onClick={() => goToPage(Math.min(chapters.length - 1, currentPage + 1))}
            disabled={currentPage === chapters.length - 1}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14m-6-6 6 6-6 6"/>
            </svg>
          </button>
        </>
      </div>

      {/* Élément audio caché */}
      <audio 
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <source src={audioSrc} type="audio/mpeg" />
      </audio>

      {/* Lecteur audio */}
      <div className="conte-lecteur">
        <button className="lecteur-play" onClick={togglePlayPause}>
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
        
        <div className="lecteur-info">
          <h3 className="lecteur-titre">{story.title.fr}</h3>
          <p className="lecteur-lieu">{story.region.name} · {story.region.department}</p>
        </div>
        
        <div className="lecteur-chapitres">
          <div className="chapitres-barres">
            {chapters.map((_, idx) => (
              <div
                key={idx}
                className={`chapitre-barre ${idx === currentPage ? 'active' : ''}`}
                onClick={() => goToPage(idx)}
              />
            ))}
          </div>
          <div className="chapitres-temps">
            <span>{formatTime(currentTime)}</span>
            <span>{duration}:{seconds < 10 ? '0' : ''}{seconds}</span>
          </div>
        </div>
        
        <div className="lecteur-voix">
          <div className="voix-select">
            {story.languages.map((lang) => (
              <button
                key={lang.language}
                className={`voix-btn ${selectedLang === lang.language ? 'active' : ''}`}
                onClick={() => setSelectedLang(lang.language as any)}
              >
                {lang.language === 'fr' ? 'Français' : 
                 lang.language === 'moore' ? 'Mooré' : 
                 lang.language === 'fulfulde' ? 'Fulfulde' : 'Dioula'}
              </button>
            ))}
          </div>
          <span className="voix-aide">Même instant, autre voix</span>
        </div>
        
        <button className="lecteur-vitesse">1×</button>
      </div>
    </div>
  );
}
