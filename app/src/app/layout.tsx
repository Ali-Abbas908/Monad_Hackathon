import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Group Pay | Monad Metropolis',
  description: 'Group payments on Monad where shared wallets and group spending settle without an intermediary',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <Providers>
          <div className="mx-auto max-w-lg min-h-screen flex flex-col bg-white shadow-xl">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
