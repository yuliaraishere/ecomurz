import type { Metadata } from 'next';
import { DM_Sans, Manrope } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'] });
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://rupa-marketplace.sites.openai.com'),
  title: 'Rupa — Marketplace Pilihan',
  description: 'Marketplace lokal untuk barang-barang keseharian yang dipilih dengan rasa.',
  openGraph: {
    title: 'Rupa — Marketplace Pilihan',
    description: 'Barang bagus, dipilih dengan rasa.',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rupa — Marketplace Pilihan',
    description: 'Barang bagus, dipilih dengan rasa.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${dmSans.variable} ${manrope.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
