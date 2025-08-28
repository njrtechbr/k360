
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import SiteHeader from '@/components/SiteHeader';
import { cn } from '@/lib/utils';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';

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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-sans antialiased')}>
        <AuthProvider>
          <SidebarProvider>
            <div className="relative flex min-h-screen flex-col">
               <SiteHeader />
               <div className="flex-1 flex">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8 ml-0 md:ml-[var(--sidebar-width-icon)] group-data-[state=expanded]:md:ml-[var(--sidebar-width)] transition-[margin-left] duration-300 ease-in-out">
                    {children}
                </main>
               </div>
            </div>
            <Toaster />
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
