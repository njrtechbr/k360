
"use client"

import { useAuth } from "@/providers/AuthProvider";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "./ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Wrench, CircleUser, Settings, ShieldCheck } from "lucide-react";
import { ROLES } from "@/lib/types";

export default function AppSidebar() {
    const { isAuthenticated, user, modules } = useAuth();
    const pathname = usePathname();

    if (!isAuthenticated || !user) {
        return null;
    }

    const userModules = user.role === ROLES.SUPERADMIN 
        ? modules 
        : modules.filter(m => user.modules.includes(m.id) && m.active);

    return (
        <Sidebar>
            <SidebarContent>
                <SidebarHeader className="h-16 justify-center">
                    <h1 className="text-xl font-semibold text-primary flex items-center gap-2">
                        <ShieldCheck className="h-7 w-7"/>
                        <span className="group-data-[collapsible=icon]:hidden">Menu</span>
                    </h1>
                </SidebarHeader>
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
