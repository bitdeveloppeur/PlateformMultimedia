'use client';

import { useEffect, useRef, useState } from 'react';
import type { StageScene } from '@/types/stage';

interface AnimatedSceneHTMLProps {
  page: StageScene;
  stageWidth: number;
  stageHeight: number;
  onActionComplete: () => void;
}

export default function AnimatedSceneHTML({
  page,
  stageWidth,
  stageHeight,
  onActionComplete,
}: AnimatedSceneHTMLProps) {
  const [actionState, setActionState] = useState<{
    completed: boolean;
    progress: number;
  }>({ completed: false, progress: 0 });

  // Gérer les interactions
  const handleInteraction = (element: string) => {
    if (actionState.completed) return;

    switch (page.act) {
      case 'gallop':
      case 'king':
      case 'baby':
        setActionState({ completed: true, progress: 100 });
        setTimeout(onActionComplete, 800);
        break;

      case 'okra':
        const newProgressOkra = Math.min(actionState.progress + 33.33, 100);
        setActionState({ 
          completed: newProgressOkra >= 100, 
          progress: newProgressOkra 
        });
        if (newProgressOkra >= 100) {
          setTimeout(onActionComplete, 800);
        }
        break;

      case 'stars':
        const newProgressStars = Math.min(actionState.progress + 20, 100);
        setActionState({ 
          completed: newProgressStars >= 100, 
          progress: newProgressStars 
        });
        if (newProgressStars >= 100) {
          setTimeout(onActionComplete, 800);
        }
        break;

      case 'bushes':
        setActionState({ completed: true, progress: 100 });
        setTimeout(onActionComplete, 800);
        break;

      default:
        setActionState({ completed: true, progress: 100 });
        onActionComplete();
    }
  };

  useEffect(() => {
    setActionState({ completed: false, progress: 0 });
  }, [page.chap]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: `${stageWidth}px`,
        aspectRatio: `${stageWidth} / ${stageHeight}`,
        background: page.sky,
        overflow: 'hidden',
        borderRadius: '12px',
        cursor: actionState.completed ? 'default' : 'pointer',
      }}
      onClick={() => {
        // Clic sur la scène entière pour interaction simple
        if (page.act) {
          handleInteraction(page.act);
        }
      }}
    >
      {/* Fond avec iframe du HTML animé */}
      {page.rider && (
        <iframe
          src="/stage/yennenga-mere-des-moose/yennenga.html"
          style={{
            position: 'absolute',
            left: `${(page.rider.x / stageWidth) * 100 - 20}%`,
            top: `${(page.rider.y / stageHeight) * 100 - 20}%`,
            width: `${400 * (page.rider.s || 1)}px`,
            height: `${400 * (page.rider.s || 1)}px`,
            border: 'none',
            pointerEvents: page.act === 'gallop' || page.act === 'baby' ? 'auto' : 'none',
            transform: actionState.completed && page.act === 'gallop' 
              ? 'translateX(200px) scale(1.05)' 
              : 'none',
            transition: 'all 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      )}

      {page.king && (
        <iframe
          src="/stage/yennenga-mere-des-moose/roi.html"
          style={{
            position: 'absolute',
            left: `${(page.king.x / stageWidth) * 100 - 15}%`,
            top: `${(page.king.y / stageHeight) * 100 - 15}%`,
            width: `${350 * (page.king.s || 1)}px`,
            height: `${350 * (page.king.s || 1)}px`,
            border: 'none',
            pointerEvents: page.act === 'king' ? 'auto' : 'none',
            transform: actionState.completed && page.act === 'king' ? 'scale(1.1) translateY(-15px)' : 'none',
            transition: 'all 0.8s ease-out',
          }}
        />
      )}

      {page.hunter && (
        <iframe
          src="/stage/yennenga-mere-des-moose/chasseur.html"
          style={{
            position: 'absolute',
            left: `${(page.hunter.x / stageWidth) * 100 - 15}%`,
            top: `${(page.hunter.y / stageHeight) * 100 - 15}%`,
            width: `${320 * (page.hunter.s || 1)}px`,
            height: `${320 * (page.hunter.s || 1)}px`,
            border: 'none',
            pointerEvents: 'none',
            opacity: actionState.completed && page.act === 'bushes' ? 1 : page.act === 'bushes' ? 0.4 : 1,
            transform: actionState.completed && page.act === 'bushes' ? 'translateX(-40px) scale(1.05)' : 'none',
            transition: 'all 1s ease-out',
          }}
        />
      )}

      {page.mother && (
        <iframe
          src="/stage/yennenga-mere-des-moose/mere.html"
          style={{
            position: 'absolute',
            left: `${(page.mother.x / stageWidth) * 100 - 15}%`,
            top: `${(page.mother.y / stageHeight) * 100 - 15}%`,
            width: `${380 * (page.mother.s || 1)}px`,
            height: `${380 * (page.mother.s || 1)}px`,
            border: 'none',
            pointerEvents: 'none',
          }}
        />
      )}

      {page.forest && page.forest.x < stageWidth && (
        <iframe
          src="/stage/yennenga-mere-des-moose/foret.html"
          style={{
            position: 'absolute',
            left: `${(page.forest.x / stageWidth) * 100}%`,
            bottom: 0,
            width: '70%',
            height: '85%',
            border: 'none',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Zone interactive pour gombo */}
      {page.act === 'okra' && (
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            left: '30%',
            width: '40%',
            height: '30%',
            borderRadius: '12px',
            border: actionState.progress < 100 ? '3px dashed rgba(255,107,53,0.6)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '64px',
          }}
        >
          {actionState.progress > 0 && '🌱'.repeat(Math.floor(actionState.progress / 33.33))}
        </div>
      )}

      {/* Étoiles à allumer */}
      {page.act === 'stars' && page.stars > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '40%',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '20px',
          }}
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                fontSize: '40px',
                opacity: i < (actionState.progress / 20) ? 1 : 0.2,
                transform: i < (actionState.progress / 20) ? 'scale(1.2) rotate(0deg)' : 'scale(1) rotate(0deg)',
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              ⭐
            </div>
          ))}
        </div>
      )}

      {/* Buissons */}
      {page.act === 'bushes' && (
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            left: '40%',
            width: '50%',
            display: 'flex',
            gap: '40px',
            justifyContent: 'center',
          }}
        >
          {[...Array(3)].map((_, i) => (
            <iframe
              key={i}
              src="/stage/yennenga-mere-des-moose/buisson.html"
              style={{
                width: '180px',
                height: '160px',
                border: 'none',
                transform: !actionState.completed ? 'scale(1)' : 'scale(0.8)',
                transition: 'all 0.4s ease-out',
              }}
            />
          ))}
        </div>
      )}

      {/* Instruction */}
      {page.task && !actionState.completed && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '18px 36px',
            borderRadius: '30px',
            fontSize: '19px',
            fontWeight: '600',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
            border: '2px solid rgba(255, 107, 53, 0.6)',
            animation: 'pulse-border 2s ease-in-out infinite',
          }}
        >
          {page.task}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-border {
          0%, 100% { 
            border-color: rgba(255, 107, 53, 0.6);
            box-shadow: 0 6px 24px rgba(255, 107, 53, 0.3);
          }
          50% { 
            border-color: rgba(255, 107, 53, 1);
            box-shadow: 0 8px 32px rgba(255, 107, 53, 0.6);
          }
        }
      `}</style>
    </div>
  );
}
