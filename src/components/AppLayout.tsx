"use client";

import { useSidebar } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import SiteHeader from '@/components/SiteHeader';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
    const { state } = useSidebar();
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <AppSidebar />
            <div className={cn("flex flex-col sm:h-auto sm:border-0 sm:bg-transparent", state === 'expanded' ? 'sm:pl-72' : 'sm:pl-14', 'transition-all duration-300 ease-in-out')}>
                <SiteHeader />
                <main className="flex-1 p-4 md:p-8 pt-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
