'use client';

import { useEffect, useRef, useState } from 'react';
import type { StageScene } from '@/types/stage';
import MiniMapBurkina from './MiniMapBurkina';

interface InteractiveSceneCanvasProps {
  page: StageScene;
  stageWidth: number;
  stageHeight: number;
  onActionComplete: () => void;
  storyRegion?: {
    latitude: number;
    longitude: number;
  };
}

export default function InteractiveSceneCanvas({
  page,
  stageWidth,
  stageHeight,
  onActionComplete,
  storyRegion,
}: InteractiveSceneCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [actionState, setActionState] = useState<{
    completed: boolean;
    progress: number;
  }>({ completed: false, progress: 0 });

  // Gérer les différentes interactions selon le type d'action
  const handleInteraction = (element: string) => {
    console.log('🎯 Interaction:', element, 'Action:', page.act, 'Completed:', actionState.completed);
    
    if (actionState.completed) return;

    switch (page.act) {
      case 'gallop':
        if (element === 'horse') {
          console.log('✅ Gallop action triggered!');
          setActionState({ completed: true, progress: 100 });
          setTimeout(onActionComplete, 1000);
        }
        break;

      case 'king':
        if (element === 'king') {
          setActionState({ completed: true, progress: 100 });
          setTimeout(onActionComplete, 1000);
        }
        break;

      case 'okra':
        // Cliquer 3 fois sur la terre
        if (element === 'ground') {
          const newProgress = Math.min(actionState.progress + 33.33, 100);
          setActionState({ 
            completed: newProgress >= 100, 
            progress: newProgress 
          });
          if (newProgress >= 100) {
            setTimeout(onActionComplete, 1000);
          }
        }
        break;

      case 'stars':
        // Allumer 5 étoiles
        if (element === 'star') {
          const newProgress = Math.min(actionState.progress + 20, 100);
          setActionState({ 
            completed: newProgress >= 100, 
            progress: newProgress 
          });
          if (newProgress >= 100) {
            setTimeout(onActionComplete, 1000);
          }
        }
        break;

      case 'bushes':
        // Cliquer sur les buissons
        if (element === 'bush') {
          setActionState({ completed: true, progress: 100 });
          setTimeout(onActionComplete, 1000);
        }
        break;

      case 'baby':
        if (element === 'horse') {
          setActionState({ completed: true, progress: 100 });
          setTimeout(onActionComplete, 1000);
        }
        break;

      default:
        // Pas d'interaction, passer directement
        setActionState({ completed: true, progress: 100 });
        onActionComplete();
    }
  };

  // Réinitialiser l'état quand on change de page
  useEffect(() => {
    setActionState({ completed: false, progress: 0 });
  }, [page.chap]);

  return (
    <div
      className="interactive-canvas-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        borderRadius: '12px 0 0 12px',
        overflow: 'hidden',
      }}
    >
      {/* Section SVG interactive (haut - 65%) */}
      <div
        ref={canvasRef}
        className="interactive-svg-section"
        style={{
          flex: '0 0 65%',
          position: 'relative',
          background: page.sky,
          overflow: 'hidden',
          cursor: actionState.completed ? 'default' : 'pointer',
        }}
      >
      {/* Forêt en arrière-plan */}
      {page.forest && page.forest.x < stageWidth && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.forest.x / stageWidth) * 100}%`,
            bottom: 0,
            width: '60%',
            height: '80%',
            backgroundImage: 'url(/stage/yennenga-mere-des-moose/foret.svg)',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'bottom',
            transition: 'all 1s ease-out',
          }}
        />
      )}

      {/* Cavalière */}
      {page.rider && (
        <div
          onClick={() => {
            console.log('🐴 Cheval cliqué!');
            handleInteraction('horse');
          }}
          style={{
            position: 'absolute',
            left: `${(page.rider.x / stageWidth) * 100}%`,
            top: `${(page.rider.y / stageHeight) * 100}%`,
            width: `${300 * (page.rider.s || 1)}px`,
            height: `${300 * (page.rider.s || 1)}px`,
            backgroundImage: 'url(/stage/yennenga-mere-des-moose/yennenga.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            cursor: page.act === 'gallop' || page.act === 'baby' ? 'pointer' : 'default',
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: actionState.completed && page.act === 'gallop' 
              ? 'translateX(300px) scale(1.1)' 
              : actionState.completed && page.act === 'baby'
              ? 'scale(1.2) rotate(5deg)'
              : 'none',
            filter: page.act === 'gallop' || page.act === 'baby' ? 'drop-shadow(0 4px 12px rgba(255,107,53,0.4))' : 'none',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => {
            if (page.act === 'gallop' || page.act === 'baby') {
              e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(255,107,53,0.6)) brightness(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (page.act === 'gallop' || page.act === 'baby') {
              e.currentTarget.style.filter = 'drop-shadow(0 4px 12px rgba(255,107,53,0.4))';
            }
          }}
          title="Yennenga et son cheval"
        />
      )}

      {/* Roi */}
      {page.king && (
        <div
          onClick={() => handleInteraction('king')}
          style={{
            position: 'absolute',
            left: `${(page.king.x / stageWidth) * 100}%`,
            top: `${(page.king.y / stageHeight) * 100}%`,
            width: `${280 * (page.king.s || 1)}px`,
            height: `${280 * (page.king.s || 1)}px`,
            backgroundImage: 'url(/stage/yennenga-mere-des-moose/roi.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            cursor: page.act === 'king' ? 'pointer' : 'default',
            transition: 'all 0.5s ease-out',
            transform: actionState.completed && page.act === 'king' ? 'scale(1.15) translateY(-10px)' : 'none',
            filter: page.act === 'king' ? 'drop-shadow(0 4px 12px rgba(218,165,32,0.4))' : 'none',
          }}
          onMouseEnter={(e) => {
            if (page.act === 'king') {
              e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(218,165,32,0.6)) brightness(1.1)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (page.act === 'king') {
              e.currentTarget.style.filter = 'drop-shadow(0 4px 12px rgba(218,165,32,0.4))';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          title="Le roi Nedega"
        />
      )}

      {/* Chasseur */}
      {page.hunter && (
        <div
          onClick={() => handleInteraction('hunter')}
          style={{
            position: 'absolute',
            left: `${(page.hunter.x / stageWidth) * 100}%`,
            top: `${(page.hunter.y / stageHeight) * 100}%`,
            width: `${260 * (page.hunter.s || 1)}px`,
            height: `${260 * (page.hunter.s || 1)}px`,
            backgroundImage: 'url(/stage/yennenga-mere-des-moose/chasseur.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transition: 'all 0.6s ease-out',
            opacity: actionState.completed && page.act === 'bushes' ? 1 : page.act === 'bushes' ? 0.3 : 1,
            transform: actionState.completed && page.act === 'bushes' ? 'translateX(-50px) scale(1.1)' : 'none',
          }}
          title="Rialé le chasseur"
        />
      )}

      {/* Mère avec bébé */}
      {page.mother && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.mother.x / stageWidth) * 100}%`,
            top: `${(page.mother.y / stageHeight) * 100}%`,
            width: `${300 * (page.mother.s || 1)}px`,
            height: `${300 * (page.mother.s || 1)}px`,
            backgroundImage: 'url(/stage/yennenga-mere-des-moose/mere.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            animation: page.act === 'baby' ? 'gentle-sway 2s ease-in-out infinite' : 'none',
          }}
          title="Yennenga et Ouédraogo"
        />
      )}

      {/* Zone de sol pour planter le gombo */}
      {page.act === 'okra' && (
        <div
          onClick={() => handleInteraction('ground')}
          style={{
            position: 'absolute',
            bottom: '20%',
            left: '30%',
            width: '40%',
            height: '30%',
            background: 'rgba(139, 69, 19, 0.3)',
            borderRadius: '8px',
            border: '2px dashed rgba(139, 69, 19, 0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {actionState.progress > 0 && (
            <div style={{ fontSize: '48px' }}>
              {'🌱'.repeat(Math.floor(actionState.progress / 33.33))}
            </div>
          )}
        </div>
      )}

      {/* Étoiles à allumer */}
      {page.act === 'stars' && page.stars > 0 && (
        <div
          onClick={() => handleInteraction('star')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '40%',
            cursor: 'pointer',
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
                fontSize: '32px',
                opacity: i < (actionState.progress / 20) ? 1 : 0.3,
                transition: 'opacity 0.3s',
              }}
            >
              ⭐
            </div>
          ))}
        </div>
      )}

      {/* Buissons à cliquer */}
      {page.act === 'bushes' && (
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            left: '50%',
            width: '50%',
            display: 'flex',
            gap: '60px',
            justifyContent: 'center',
          }}
        >
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              onClick={() => handleInteraction('bush')}
              style={{
                width: '160px',
                height: '140px',
                backgroundImage: 'url(/stage/yennenga-mere-des-moose/buisson.svg)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease-out',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.15) translateY(-10px)';
                e.currentTarget.style.filter = 'drop-shadow(0 8px 16px rgba(45,80,22,0.4)) brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))';
              }}
            />
          ))}
        </div>
      )}

      {/* Instruction d'interaction */}
      {page.task && !actionState.completed && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 107, 53, 0.4)',
            animation: 'pulse-glow 2s ease-in-out infinite',
            zIndex: 100,
            maxWidth: '80%',
            textAlign: 'center',
          }}
        >
          {page.task}
        </div>
      )}
      
      {/* Message après l'action complétée */}
      {page.act && actionState.completed && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(34, 139, 34, 0.85)',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(144, 238, 144, 0.6)',
            zIndex: 100,
            maxWidth: '80%',
            textAlign: 'center',
            animation: 'fade-in-scale 0.5s ease-out',
          }}
        >
          ✓ Bien joué ! Touche la flèche → pour continuer
        </div>
      )}
      </div>

      {/* Section carte 3D (bas - 35%) */}
      <div
        className="interactive-map-section"
        style={{
          flex: '0 0 35%',
          position: 'relative',
          borderTop: '2px solid rgba(255, 107, 53, 0.3)',
        }}
      >
        <MiniMapBurkina 
          latitude={storyRegion?.latitude || 12.3}
          longitude={storyRegion?.longitude || -1.5}
          zoom={7}
          targetCoords={page.mapCoords}
        />
      </div>

      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% { 
            opacity: 1; 
            transform: translateX(-50%) scale(1);
            box-shadow: 0 4px 20px rgba(255, 107, 53, 0.3);
          }
          50% { 
            opacity: 0.85; 
            transform: translateX(-50%) scale(1.02);
            box-shadow: 0 6px 30px rgba(255, 107, 53, 0.5);
          }
        }
        @keyframes gentle-sway {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(1deg); }
        }
        @keyframes fade-in-scale {
          from { 
            opacity: 0; 
            transform: translate(-50%, -50%) scale(0.5); 
          }
          to { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1); 
          }
        }
      `}</style>
    </div>
  );
}
