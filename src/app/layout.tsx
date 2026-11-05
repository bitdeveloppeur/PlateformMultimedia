import type { Metadata, Viewport } from 'next';
import { Fraunces, Hanken_Grotesk, Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';

const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

/* Design-system « story.pen » — conte interactif (Étape conte page-par-page). */
const taleDisplay = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-tale-display',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});

const taleUi = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-tale-ui',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

const taleMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-tale-mono',
  display: 'swap',
  fallback: ['Courier New', 'monospace'],
});

export const metadata: Metadata = {
  title: 'Voix du Faso — Atlas sonore du patrimoine oral du Burkina Faso',
  description:
    'Numériser, préserver et transmettre le patrimoine oral du Burkina Faso : carte interactive, récits multilingues (mooré, dioula, fulfulde, français), chapitres horodatés.',
  applicationName: 'Voix du Faso',
};

export const viewport: Viewport = {
  themeColor: '#F7F5EC',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${display.variable} ${sans.variable} ${taleDisplay.variable} ${taleUi.variable} ${taleMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
