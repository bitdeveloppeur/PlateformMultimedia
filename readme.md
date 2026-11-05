# Voix du Faso - Plateforme Multimédia du Patrimoine Oral Burkinabè

## Informations du Projet

**Nom du projet :** Voix du Faso  
**Type :** Plateforme web multimédia interactive  
**Technologie :** Next.js 15, React 19, TypeScript  
**Déploiement :** Production ready

## Équipe de Développement

- BADO Yipen Lionnel - Développeur
- SALOU Justine - Développeur

## Objectif

Valoriser et préserver le patrimoine oral du Burkina Faso à travers une plateforme multimédia interactive permettant de découvrir les contes, légendes et histoires traditionnelles en français et dans les langues locales (Mooré, Fulfulde, Dioula).

## Fonctionnalités Principales

### 1. Page d'Accueil - "La Veillée"
- Design inspiré des veillées traditionnelles autour du feu
- Animation de flammes dynamiques créant une ambiance chaleureuse
- Sélecteur de langue (Français, Mooré, Fulfulde, Dioula)
- Présentation des 3 contes disponibles sous forme de cartes interactives

**Note :** Le changement de langue n'est pas encore fonctionnel car l'API de traduction n'est pas encore implémentée.

### 2. Pages de Contes - Format "Livre Ouvert"
- Design : Format livre avec deux pages côte à côte
  - Page gauche : Illustrations de couverture des contes
  - Page droite : Texte narratif et navigation
- Audio multilingue : Lecteur audio intégré avec support de 4 langues
- Navigation par chapitres : Système de chapitres permettant de suivre la progression de l'histoire

### 3. Contenu Multilingue

Chaque conte est disponible en plusieurs langues :

#### Yennenga, Mère des Moose
- Français
- Mooré

#### Le Lièvre et la Tortue
- Français
- Mooré
- Fulfulde

#### Les Ruines de Loropéni
- Français
- Dioula

## Architecture Technique

### Structure du Projet

```
PlateformMultimedia/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Page d'accueil
│   │   ├── home.css              # Styles de la veillée
│   │   ├── contes/
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Route dynamique des contes
│   │   └── contes.css            # Styles format livre
│   ├── components/
│   │   ├── HomeHero.tsx          # Composant page d'accueil
│   │   └── InteractiveStoryClient.tsx  # Composant pages contes
│   ├── data/
│   │   ├── stories.ts            # Configuration des contes
│   │   └── scenes/               # Données des scènes par conte
│   └── types/
│       └── stage.ts              # Définitions TypeScript
├── public/
│   ├── images/
│   │   └── covers/               # Images de couverture
│   └── audio/
│       └── stories/              # Fichiers audio multilingues
```

### Technologies Utilisées

- Framework : Next.js 15 (App Router)
- UI : React 19, TypeScript
- Styling : CSS Modules, Animations CSS
- Audio : API Web Audio
- Design : Pencil (design tool) pour les maquettes

## Design System

### Palette de Couleurs

- Fond principal : Dégradés chauds (#1a1410 → #0a0603)
- Accents : Orange feu (#ff6b35, #f57d3c)
- Texte : Blanc (#ffffff) et tons crème
- Bordures : Or doux (#d4af37)

### Typographie

- Polices optimisées pour la lisibilité
- Hiérarchie claire pour titres, chapitres et narration

## Responsive Design

La plateforme est entièrement responsive :
- Desktop : Expérience complète avec format livre
- Tablette : Adaptation optimisée
- Mobile : Version adaptée avec pages empilées

## Roadmap

### Phase 1 - Terminée
- Design et intégration page d'accueil
- Structure des pages de contes
- Intégration audio multilingue
- Navigation par chapitres
- 3 contes avec contenu complet

### Phase 2 - À venir
- Implémentation de l'API de traduction pour le changement de langue
- Ajout de nouveaux contes
- Système de favoris
- Partage sur réseaux sociaux
- Mode hors ligne (PWA)
- Quiz interactifs sur les contes

## Licence

Ce projet est développé dans le cadre de la préservation du patrimoine culturel burkinabè.


