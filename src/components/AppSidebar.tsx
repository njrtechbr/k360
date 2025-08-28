
"use client"

import { useAuth } from "@/providers/AuthProvider";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "./ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Wrench, CircleUser, Settings, ShieldCheck, PanelLeft } from "lucide-react";
import { ROLES } from "@/lib/types";
import { Button } from "./ui/button";

export default function AppSidebar() {
    const { isAuthenticated, user, modules } = useAuth();
    const pathname = usePathname();
    const { toggleSidebar, state } = useSidebar();


    if (!isAuthenticated || !user) {
        return null;
    }

    const userModules = user.role === ROLES.SUPERADMIN 
        ? modules 
        : modules.filter(m => user.modules.includes(m.id) && m.active);

    return (
        <Sidebar>
            <SidebarHeader className="h-16 flex items-center justify-between px-4">
                <Link href="/dashboard" className="flex items-center gap-2 text-primary group-data-[state=collapsed]:hidden">
                    <ShieldCheck className="h-7 w-7"/>
                    <h1 className="text-xl font-semibold">
                        Menu
                    </h1>
                </Link>
                <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                    <PanelLeft />
                </Button>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip={{children: "Dashboard"}}>
                            <Link href="/dashboard">
                                <LayoutDashboard/>
                                <span>Dashboard</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                
                    {userModules.map(mod => (
                         <SidebarMenuItem key={mod.id}>
                            <SidebarMenuButton asChild isActive={pathname.startsWith(mod.path)} tooltip={{children: mod.name}}>
                                <Link href={mod.path}>
                                    <Settings/>
                                    <span className="capitalize">{mod.name}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}

                    {(user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN) && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname === '/dashboard/modulos'} tooltip={{children: "Gerenciar Módulos"}}>
                                <Link href="/dashboard/modulos">
                                    <Wrench />
                                    <span>Módulos</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                     <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/perfil'} tooltip={{children: "Perfil"}}>
                            <Link href="/perfil">
                                <CircleUser />
                                <span>Perfil</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>
    )
}
