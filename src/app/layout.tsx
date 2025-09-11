import type { Metadata } from "next";
import "./globals.css";
import { ApiProvider } from "@/providers/ApiProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppLayout from "@/components/AppLayout";
import { PerformanceProvider } from "@/providers/PerformanceProvider";
import { SessionProvider } from "@/providers/SessionProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";

export const metadata: Metadata = {
  title: "Koerner 360",
  description: "Sistema de Gestão e Avaliação Koerner 360",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn("font-sans antialiased")}>
        <PerformanceProvider>
          <SessionProvider>
            <ApiProvider>
              <AuthProvider>
                <NotificationProvider>
                  <SidebarProvider>
                    <AppLayout>{children}</AppLayout>
                    <Toaster />
                  </SidebarProvider>
                </NotificationProvider>
              </AuthProvider>
            </ApiProvider>
          </SessionProvider>
        </PerformanceProvider>
      </body>
    </html>
  );
}
