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

      case 'gold':
        // Ramasser 3 lingots d'or
        if (element === 'gold-bar') {
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

      case 'bricks':
        // Construire le mur en cliquant 8 fois
        if (element === 'brick') {
          const newProgress = Math.min(actionState.progress + 12.5, 100);
          setActionState({ 
            completed: newProgress >= 100, 
            progress: newProgress 
          });
          if (newProgress >= 100) {
            setTimeout(onActionComplete, 1000);
          }
        }
        break;

      case 'donkey':
        if (element === 'donkey') {
          setActionState({ completed: true, progress: 100 });
          setTimeout(onActionComplete, 1000);
        }
        break;

      case 'bird':
        if (element === 'bird') {
          setActionState({ completed: true, progress: 100 });
          setTimeout(onActionComplete, 1000);
        }
        break;

      case 'star':
        if (element === 'star') {
          setActionState({ completed: true, progress: 100 });
          setTimeout(onActionComplete, 1000);
        }
        break;

      case 'stick':
        // Frapper le bâton 3 fois
        if (element === 'stick') {
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

      case 'race':
        // Lancer la course
        if (element === 'hare') {
          setActionState({ completed: true, progress: 100 });
          setTimeout(onActionComplete, 1000);
        }
        break;

      case 'wake':
        // Réveiller le lièvre
        if (element === 'sleeping-hare') {
          setActionState({ completed: true, progress: 100 });
          setTimeout(onActionComplete, 1000);
        }
        break;

      case 'turtles':
        // Trouver les 5 tortues
        if (element === 'turtle-hidden') {
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

      case 'balafon':
        if (element === 'balafon') {
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
          overflow: 'visible',
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
            bottom: '15%',
            left: '25%',
            width: '50%',
            height: '35%',
            background: 'rgba(139, 69, 19, 0.4)',
            borderRadius: '12px',
            border: '3px dashed rgba(139, 69, 19, 0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            boxShadow: '0 4px 20px rgba(139, 69, 19, 0.3)',
          }}
        >
          {actionState.progress > 0 && (
            <div style={{ fontSize: '48px', zIndex: 51 }}>
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
            height: '45%',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '20px',
            zIndex: 50,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 100%)',
          }}
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                fontSize: '40px',
                opacity: i < (actionState.progress / 20) ? 1 : 0.4,
                transition: 'opacity 0.3s',
                filter: i < (actionState.progress / 20) ? 'drop-shadow(0 0 10px #FFD700)' : 'none',
                transform: i < (actionState.progress / 20) ? 'scale(1.2)' : 'scale(1)',
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
            bottom: '18%',
            left: '50%',
            width: '50%',
            display: 'flex',
            gap: '60px',
            justifyContent: 'center',
            zIndex: 50,
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
                filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))',
                zIndex: 51,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.2) translateY(-15px)';
                e.currentTarget.style.filter = 'drop-shadow(0 10px 20px rgba(45,80,22,0.5)) brightness(1.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))';
              }}
            />
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ÉLÉMENTS LOROPÉNI
          ═══════════════════════════════════════════════════════════ */}

      {/* Ruines de Loropéni */}
      {page.ruins && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.ruins.x / stageWidth) * 100}%`,
            top: `${(page.ruins.y / stageHeight) * 100}%`,
            width: `${850 * (page.ruins.s || 1)}px`,
            height: `${220 * (page.ruins.s || 1)}px`,
            backgroundImage: 'url(/stage/les-ruines-de-lorepeni/mur.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transition: 'all 0.8s ease-out',
            zIndex: 5,
          }}
          title="Les ruines de Loropéni"
        />
      )}

      {/* Arbre/Baobab */}
      {page.tree && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.tree.x / stageWidth) * 100}%`,
            top: `${(page.tree.y / stageHeight) * 100}%`,
            width: `${220 * (page.tree.s || 1)}px`,
            height: `${310 * (page.tree.s || 1)}px`,
            backgroundImage: 'url(/stage/les-ruines-de-lorepeni/arbre.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transition: 'all 0.8s ease-out',
            zIndex: 8,
          }}
        />
      )}

      {/* Deuxième arbre */}
      {page.tree2 && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.tree2.x / stageWidth) * 100}%`,
            top: `${(page.tree2.y / stageHeight) * 100}%`,
            width: `${220 * (page.tree2.s || 1)}px`,
            height: `${310 * (page.tree2.s || 1)}px`,
            backgroundImage: 'url(/stage/les-ruines-de-lorepeni/arbre.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transition: 'all 0.8s ease-out',
            zIndex: 8,
          }}
        />
      )}

      {/* Âne de caravane */}
      {page.donkey && (
        <div
          onClick={() => handleInteraction('donkey')}
          style={{
            position: 'absolute',
            left: `${(page.donkey.x / stageWidth) * 100}%`,
            top: `${(page.donkey.y / stageHeight) * 100}%`,
            width: `${220 * (page.donkey.s || 1)}px`,
            height: `${180 * (page.donkey.s || 1)}px`,
            backgroundImage: 'url(/stage/les-ruines-de-lorepeni/ane.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            cursor: page.act === 'donkey' ? 'pointer' : 'default',
            transition: 'all 0.6s ease-out',
            zIndex: 10,
            filter: page.act === 'donkey' ? 'drop-shadow(0 4px 12px rgba(232,116,59,0.4))' : 'none',
            transform: actionState.completed && page.act === 'donkey' ? 'translateX(50px) scale(1.1)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (page.act === 'donkey') {
              e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(232,116,59,0.6)) brightness(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (page.act === 'donkey') {
              e.currentTarget.style.filter = 'drop-shadow(0 4px 12px rgba(232,116,59,0.4))';
            }
          }}
          title="Âne de caravane chargé d'or"
        />
      )}

      {/* Personnage lobi */}
      {page.person && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.person.x / stageWidth) * 100}%`,
            top: `${(page.person.y / stageHeight) * 100}%`,
            width: `${80 * (page.person.s || 1)}px`,
            height: `${150 * (page.person.s || 1)}px`,
            backgroundImage: 'url(/stage/les-ruines-de-lorepeni/personnage.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transition: 'all 0.6s ease-out',
            zIndex: 10,
          }}
          title="Bâtisseur lobi"
        />
      )}

      {/* Oiseau */}
      {page.bird && (
        <div
          onClick={() => handleInteraction('bird')}
          style={{
            position: 'absolute',
            left: `${(page.bird.x / stageWidth) * 100}%`,
            top: `${(page.bird.y / stageHeight) * 100}%`,
            width: `${60 * (page.bird.s || 1)}px`,
            height: `${40 * (page.bird.s || 1)}px`,
            backgroundImage: 'url(/stage/les-ruines-de-lorepeni/oiseau.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            cursor: page.act === 'bird' ? 'pointer' : 'default',
            transition: 'all 0.5s ease-out',
            zIndex: 50,
            filter: page.act === 'bird' ? 'drop-shadow(0 4px 12px rgba(42,29,20,0.4))' : 'none',
            transform: actionState.completed && page.act === 'bird' ? 'translateY(-150px) translateX(100px) scale(0.8)' : 'none',
            opacity: actionState.completed && page.act === 'bird' ? 0 : 1,
          }}
          onMouseEnter={(e) => {
            if (page.act === 'bird') {
              e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(42,29,20,0.6)) brightness(1.2)';
              e.currentTarget.style.transform = 'scale(1.3) translateY(-10px)';
            }
          }}
          onMouseLeave={(e) => {
            if (page.act === 'bird') {
              e.currentTarget.style.filter = 'drop-shadow(0 4px 12px rgba(42,29,20,0.4))';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          title="Oiseau de la forêt"
        />
      )}

      {/* Végétation/buissons de Loropéni */}
      {page.bushes && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.bushes.x / stageWidth) * 100}%`,
            top: `${(page.bushes.y / stageHeight) * 100}%`,
            width: `${700 * (page.bushes.s || 1)}px`,
            height: `${150 * (page.bushes.s || 1)}px`,
            backgroundImage: 'url(/stage/les-ruines-de-lorepeni/vegetation.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transition: 'all 0.8s ease-out',
            zIndex: 7,
          }}
        />
      )}

      {/* Étoile UNESCO */}
      {page.star && (
        <div
          onClick={() => handleInteraction('star')}
          style={{
            position: 'absolute',
            left: `${(page.star.x / stageWidth) * 100}%`,
            top: `${(page.star.y / stageHeight) * 100}%`,
            width: `${200 * (page.star.s || 1)}px`,
            height: `${200 * (page.star.s || 1)}px`,
            backgroundImage: 'url(/stage/les-ruines-de-lorepeni/etoile.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            cursor: page.act === 'star' ? 'pointer' : 'default',
            transition: 'all 0.5s ease-out',
            zIndex: 50,
            filter: page.act === 'star' ? 'drop-shadow(0 4px 12px rgba(224,168,75,0.6))' : 'none',
            transform: actionState.completed && page.act === 'star' ? 'scale(1.5) rotate(360deg)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (page.act === 'star') {
              e.currentTarget.style.filter = 'drop-shadow(0 8px 30px rgba(224,168,75,0.9)) brightness(1.2)';
              e.currentTarget.style.transform = 'scale(1.3) rotate(15deg)';
            }
          }}
          onMouseLeave={(e) => {
            if (page.act === 'star') {
              e.currentTarget.style.filter = 'drop-shadow(0 4px 12px rgba(224,168,75,0.6))';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          title="Patrimoine mondial UNESCO 2009"
        />
      )}

      {/* Zone pour ramasser l'or */}
      {page.act === 'gold' && (
        <div
          onClick={() => handleInteraction('gold-bar')}
          style={{
            position: 'absolute',
            bottom: '25%',
            left: '30%',
            width: '40%',
            height: '30%',
            display: 'flex',
            gap: '80px',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            cursor: 'pointer',
          }}
        >
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              style={{
                width: '90px',
                height: '60px',
                backgroundImage: 'url(/stage/les-ruines-de-lorepeni/or.svg)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                opacity: i < (actionState.progress / 33.33) ? 0.3 : 1,
                transition: 'all 0.4s ease-out',
                filter: 'drop-shadow(0 4px 12px rgba(224,168,75,0.6))',
                transform: i < (actionState.progress / 33.33) ? 'scale(0.5)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      )}

      {/* Zone pour construire le mur */}
      {page.act === 'bricks' && (
        <div
          onClick={() => handleInteraction('brick')}
          style={{
            position: 'absolute',
            bottom: '20%',
            left: '25%',
            width: '50%',
            height: '40%',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '10px',
            zIndex: 50,
            cursor: 'pointer',
            padding: '20px',
            background: 'rgba(181, 74, 38, 0.15)',
            borderRadius: '12px',
            border: '3px dashed rgba(181, 74, 38, 0.5)',
          }}
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                backgroundImage: 'url(/stage/les-ruines-de-lorepeni/brique.svg)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                opacity: i < (actionState.progress / 12.5) ? 1 : 0.3,
                transition: 'all 0.3s ease-out',
                filter: i < (actionState.progress / 12.5) ? 'drop-shadow(0 2px 6px rgba(181,74,38,0.6))' : 'none',
              }}
            />
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ÉLÉMENTS LE LIÈVRE ET LA TORTUE
          ═══════════════════════════════════════════════════════════ */}

      {/* Paysage de savane (fond) */}
      {page.savana && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/paysage_savane.svg)',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            zIndex: 1,
          }}
        />
      )}

      {/* Grenier à mil */}
      {page.grenier && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.grenier.x / stageWidth) * 100}%`,
            top: `${(page.grenier.y / stageHeight) * 100}%`,
            width: `${200 * (page.grenier.s || 1)}px`,
            height: `${250 * (page.grenier.s || 1)}px`,
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/grenier_a_mil.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: page.grenier.o ?? 1,
            transition: 'all 0.8s ease-out',
            zIndex: 8,
          }}
        />
      )}

      {/* Lune */}
      {page.moon && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.moon.x / stageWidth) * 100}%`,
            top: `${(page.moon.y / stageHeight) * 100}%`,
            width: `${100 * (page.moon.s || 1)}px`,
            height: `${100 * (page.moon.s || 1)}px`,
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/lune.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: page.moon.o ?? 1,
            transition: 'all 0.8s ease-out',
            zIndex: 3,
          }}
        />
      )}

      {/* Conteur */}
      {page.storyteller && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.storyteller.x / stageWidth) * 100}%`,
            top: `${(page.storyteller.y / stageHeight) * 100}%`,
            width: `${160 * (page.storyteller.s || 1)}px`,
            height: `${200 * (page.storyteller.s || 1)}px`,
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/conteur.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: page.storyteller.o ?? 1,
            transition: 'all 0.8s ease-out',
            zIndex: 10,
          }}
          title="Le conteur"
        />
      )}

      {/* Bâton du conteur */}
      {page.stick && (
        <div
          onClick={() => handleInteraction('stick')}
          style={{
            position: 'absolute',
            left: `${(page.stick.x / stageWidth) * 100}%`,
            top: `${(page.stick.y / stageHeight) * 100}%`,
            width: `${60 * (page.stick.s || 1)}px`,
            height: `${250 * (page.stick.s || 1)}px`,
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/baton_conteur.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            cursor: page.act === 'stick' ? 'pointer' : 'default',
            transition: 'all 0.3s ease-out',
            zIndex: 50,
            filter: page.act === 'stick' ? 'drop-shadow(0 4px 12px rgba(224,168,75,0.5))' : 'none',
            transform: actionState.progress > 0 ? `rotate(${actionState.progress * 0.3}deg)` : 'none',
          }}
          onMouseEnter={(e) => {
            if (page.act === 'stick') {
              e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(224,168,75,0.8)) brightness(1.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (page.act === 'stick') {
              e.currentTarget.style.filter = 'drop-shadow(0 4px 12px rgba(224,168,75,0.5))';
            }
          }}
          title="Bâton du conteur"
        />
      )}

      {/* Lièvre */}
      {page.hare && (
        <div
          onClick={() => handleInteraction('hare')}
          style={{
            position: 'absolute',
            left: `${(page.hare.x / stageWidth) * 100}%`,
            top: `${(page.hare.y / stageHeight) * 100}%`,
            width: `${120 * (page.hare.s || 1)}px`,
            height: `${180 * (page.hare.s || 1)}px`,
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/lievre.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: page.hare.o ?? 1,
            cursor: page.act === 'race' ? 'pointer' : 'default',
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 10,
            filter: page.act === 'race' ? 'drop-shadow(0 4px 12px rgba(224,168,75,0.5))' : 'none',
            transform: actionState.completed && page.act === 'race' ? 'translateX(400px) scale(1.2)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (page.act === 'race') {
              e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(224,168,75,0.8)) brightness(1.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (page.act === 'race') {
              e.currentTarget.style.filter = 'drop-shadow(0 4px 12px rgba(224,168,75,0.5))';
            }
          }}
          title="Le lièvre rapide"
        />
      )}

      {/* Tortue */}
      {page.turtle && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.turtle.x / stageWidth) * 100}%`,
            top: `${(page.turtle.y / stageHeight) * 100}%`,
            width: `${140 * (page.turtle.s || 1)}px`,
            height: `${100 * (page.turtle.s || 1)}px`,
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/tortue.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: page.turtle.o ?? 1,
            transition: 'all 0.8s ease-out',
            zIndex: 10,
          }}
          title="La tortue persévérante"
        />
      )}

      {/* Baobab */}
      {page.baobab && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.baobab.x / stageWidth) * 100}%`,
            top: `${(page.baobab.y / stageHeight) * 100}%`,
            width: `${250 * (page.baobab.s || 1)}px`,
            height: `${320 * (page.baobab.s || 1)}px`,
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/baobab.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: page.baobab.o ?? 1,
            transition: 'all 0.8s ease-out',
            zIndex: 8,
          }}
          title="Baobab"
        />
      )}

      {/* Karité */}
      {page.karite && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.karite.x / stageWidth) * 100}%`,
            top: `${(page.karite.y / stageHeight) * 100}%`,
            width: `${200 * (page.karite.s || 1)}px`,
            height: `${260 * (page.karite.s || 1)}px`,
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/karite.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: page.karite.o ?? 1,
            transition: 'all 0.8s ease-out',
            zIndex: 8,
          }}
          title="Arbre à karité"
        />
      )}

      {/* Lièvre endormi */}
      {page.sleepingHare && (
        <div
          onClick={() => handleInteraction('sleeping-hare')}
          style={{
            position: 'absolute',
            left: `${(page.sleepingHare.x / stageWidth) * 100}%`,
            top: `${(page.sleepingHare.y / stageHeight) * 100}%`,
            width: `${200 * (page.sleepingHare.s || 1)}px`,
            height: `${120 * (page.sleepingHare.s || 1)}px`,
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/lievre_endormi.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            cursor: page.act === 'wake' ? 'pointer' : 'default',
            transition: 'all 0.5s ease-out',
            zIndex: 50,
            filter: page.act === 'wake' ? 'drop-shadow(0 4px 12px rgba(224,168,75,0.5))' : 'none',
            transform: actionState.completed && page.act === 'wake' ? 'scale(1.2) translateY(-20px)' : 'none',
            opacity: actionState.completed && page.act === 'wake' ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (page.act === 'wake') {
              e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(224,168,75,0.8)) brightness(1.2)';
              e.currentTarget.style.transform = 'scale(1.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (page.act === 'wake') {
              e.currentTarget.style.filter = 'drop-shadow(0 4px 12px rgba(224,168,75,0.5))';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          title="Réveille le lièvre !"
        />
      )}

      {/* Groupe de tortues */}
      {page.turtleGroup && (
        <div
          style={{
            position: 'absolute',
            left: `${(page.turtleGroup.x / stageWidth) * 100}%`,
            top: `${(page.turtleGroup.y / stageHeight) * 100}%`,
            width: `${280 * (page.turtleGroup.s || 1)}px`,
            height: `${150 * (page.turtleGroup.s || 1)}px`,
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/groupe_tortues.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transition: 'all 0.8s ease-out',
            zIndex: 10,
          }}
          title="Famille de tortues"
        />
      )}

      {/* Balafon */}
      {page.balafon && (
        <div
          onClick={() => handleInteraction('balafon')}
          style={{
            position: 'absolute',
            left: `${(page.balafon.x / stageWidth) * 100}%`,
            top: `${(page.balafon.y / stageHeight) * 100}%`,
            width: `${240 * (page.balafon.s || 1)}px`,
            height: `${140 * (page.balafon.s || 1)}px`,
            backgroundImage: 'url(/stage/le-lievre-et-la-tortue/balafon.svg)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            cursor: page.act === 'balafon' ? 'pointer' : 'default',
            transition: 'all 0.5s ease-out',
            zIndex: 50,
            filter: page.act === 'balafon' ? 'drop-shadow(0 4px 12px rgba(224,168,75,0.5))' : 'none',
            transform: actionState.completed && page.act === 'balafon' ? 'scale(1.2)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (page.act === 'balafon') {
              e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(224,168,75,0.8)) brightness(1.2)';
              e.currentTarget.style.transform = 'scale(1.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (page.act === 'balafon') {
              e.currentTarget.style.filter = 'drop-shadow(0 4px 12px rgba(224,168,75,0.5))';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          title="Touche le balafon !"
        />
      )}

      {/* Zone pour trouver les tortues cachées */}
      {page.act === 'turtles' && (
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            left: '10%',
            width: '80%',
            height: '35%',
            display: 'flex',
            gap: '5%',
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 50,
          }}
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              onClick={() => handleInteraction('turtle-hidden')}
              style={{
                width: '80px',
                height: '60px',
                backgroundImage: 'url(/stage/le-lievre-et-la-tortue/tortue.svg)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                cursor: 'pointer',
                opacity: i < (actionState.progress / 20) ? 0.3 : 1,
                transition: 'all 0.4s ease-out',
                filter: i < (actionState.progress / 20) 
                  ? 'drop-shadow(0 0 10px rgba(34,139,34,0.8))' 
                  : 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                transform: i < (actionState.progress / 20) ? 'scale(0.7)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                if (i >= (actionState.progress / 20)) {
                  e.currentTarget.style.transform = 'scale(1.3) translateY(-10px)';
                  e.currentTarget.style.filter = 'drop-shadow(0 6px 15px rgba(110,122,52,0.6)) brightness(1.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (i >= (actionState.progress / 20)) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.filter = 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))';
                }
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
