
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import SiteHeader from '@/components/SiteHeader';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Controle de Acesso',
  description: 'Sistema de Controle de Acesso de Usuários',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-body antialiased min-h-screen flex flex-col')}>
        <AuthProvider>
          <SiteHeader />
          <main className="flex-grow">{children}</main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
