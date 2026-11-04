'use client';

import { useEffect, useRef, useState } from 'react';
import type { StageScene } from '@/types/stage';

interface InteractiveSceneProps {
  scene: StageScene;
  storyId: string;
}

export default function InteractiveScene({ scene, storyId }: InteractiveSceneProps) {
  const [svgContent, setSvgContent] = useState('');
  const [interacted, setInteracted] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Charger le HTML précompilé de la scène depuis l'exemple
  useEffect(() => {
    // Pour l'instant, on utilise une scène statique simple
    // TODO: Intégrer les vrais SVG avec positions correctes
    setSvgContent('');
  }, [storyId, scene]);

  // Gérer les interactions
  const handleClick = (e: React.MouseEvent) => {
    if (scene.act && !interacted) {
      setInteracted(true);
      // Déclencher animations selon scene.act
      if (scene.act === 'gallop') {
        e.currentTarget.classList.add('galloping');
      }
    }
  };

  // Style du ciel et fond
  const skyColor = scene.sky || '#EBC2A8';
  const nightOpacity = scene.night || 0;

  return (
    <div 
      ref={stageRef}
      className="interactive-stage-container"
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: skyColor,
        transition: 'background 1.4s ease',
        overflow: 'hidden',
      }}
    >
      {/* Overlay de nuit */}
      {nightOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#1b2347',
            opacity: nightOpacity,
            mixBlendMode: 'multiply',
            transition: 'opacity 1.2s',
            pointerEvents: 'none',
          }}
        />
      )}
      
      {/* Image de fond temporaire - à remplacer par SVG animé */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(0,0,0,0.3)',
          fontSize: '48px',
          fontFamily: 'Georgia, serif',
        }}
      >
        {scene.chap}
      </div>
    </div>
  );
}
