import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Poker Cash Dashboard',
  description: 'Gestao interativa de home game poker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='pt-BR'>
      <body>{children}</body>
    </html>
  );
}
