
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import SiteHeader from '@/components/SiteHeader';
import { cn } from '@/lib/utils';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';

export const metadata: Metadata = {
  title: 'Controle de Acesso',
  description: 'Sistema de Controle de Acesso de Usuários',
};

function AppLayout({ children }: { children: React.ReactNode }) {
    const { state } = useSidebar();
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <AppSidebar />
            <div className={cn("flex flex-col sm:h-auto sm:border-0 sm:bg-transparent", state === 'expanded' ? 'sm:pl-72' : 'sm:pl-14', 'transition-[margin-left] duration-300 ease-in-out')}>
                <SiteHeader />
                <main className="flex-1 p-4 md:p-8 pt-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

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
            <AppLayout>
              {children}
            </AppLayout>
            <Toaster />
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
