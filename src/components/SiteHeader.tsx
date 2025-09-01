
"use client";

import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import { Button } from "./ui/button";
import { ShieldCheck, LogOut, UserCircle, PanelLeft } from "lucide-react";
import { useSidebar } from "./ui/sidebar";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./ui/breadcrumb";
import React from "react";

const getBreadcrumbItems = (pathname: string) => {
    const pathParts = pathname.split('/').filter(part => part);

    const breadcrumbs = [{ href: "/dashboard", label: "Dashboard", isLast: pathParts.length === 0 }];

    if (pathParts.length > 0 && pathParts[0] !== 'dashboard') {
         pathParts.forEach((part, index) => {
            const href = `/${pathParts.slice(0, index + 1).join('/')}`;
            const isLast = index === pathParts.length - 1;
            let label = decodeURIComponent(part).replace(/-/g, ' ');
            label = label.charAt(0).toUpperCase() + label.slice(1);

            if (label.toLowerCase() === 'rh') label = 'Recursos Humanos';
            if (label.toLowerCase() === 'pesquisa satisfacao') label = 'Pesquisa de Satisfação';

            breadcrumbs.push({ href, label, isLast });
        });
    } else if (pathParts.length > 1) {
         pathParts.slice(1).forEach((part, index) => {
            const href = `/dashboard/${pathParts.slice(1, index + 2).join('/')}`;
            const isLast = index === pathParts.length - 2;
            let label = decodeURIComponent(part).replace(/-/g, ' ');
            label = label.charAt(0).toUpperCase() + label.slice(1);
             if (label.toLowerCase() === 'rh') label = 'Recursos Humanos';
            if (label.toLowerCase() === 'pesquisa satisfacao') label = 'Pesquisa de Satisfação';

            breadcrumbs.push({ href, label, isLast });
        });
    }
    
    return breadcrumbs;
}

export default function SiteHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();

  const breadcrumbItems = getBreadcrumbItems(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
       <Button size="icon" variant="outline" className="sm:hidden" onClick={toggleSidebar}>
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
        
       <Button size="icon" variant="ghost" className="hidden sm:flex" onClick={toggleSidebar}>
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
        
        <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
                 {breadcrumbItems.map((item, index) => (
                    <React.Fragment key={item.href}>
                         <BreadcrumbItem>
                            {item.isLast ? (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link href={item.href}>{item.label}</Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
        
      <div className="ml-auto flex items-center gap-2">
        {isAuthenticated && user ? (
          <>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Olá, {user.name}
            </span>
             <Button variant="ghost" size="icon" asChild>
              <Link href="/perfil" title="Perfil">
                <UserCircle />
              </Link>
            </Button>
            <Button variant="outline" size="icon" onClick={logout} title="Sair">
              <LogOut/>
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/registrar">Registrar</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
