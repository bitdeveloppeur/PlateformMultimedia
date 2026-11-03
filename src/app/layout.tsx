import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
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
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
