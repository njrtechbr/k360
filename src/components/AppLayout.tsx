"use client";

import { useSidebar } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import SiteHeader from "@/components/SiteHeader";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const { authLoading } = useAuth();

  const noLayoutPages = [
    "/survey",
    "/login",
    "/registrar",
    "/criar-superadmin",
    "/",
  ];
  const isAuthOrSurveyPage = noLayoutPages.includes(pathname);

  if (isAuthOrSurveyPage) {
    return <>{children}</>;
  }

  // While the initial authentication check is running, show a loading state
  // to prevent the "flash of unauthenticated content" (flickering to the login page).
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <p>Carregando aplicação...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <AppSidebar />
      <div
        className={cn(
          "flex flex-col sm:h-auto sm:border-0 sm:bg-transparent",
          state === "expanded" ? "sm:pl-72" : "sm:pl-14",
          "transition-all duration-300 ease-in-out",
        )}
      >
        <SiteHeader />
        <main className="flex-1 p-4 md:p-8 pt-6">{children}</main>
      </div>
    </div>
  );
}
