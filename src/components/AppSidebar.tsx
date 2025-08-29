
"use client"

import { useAuth } from "@/providers/AuthProvider";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "./ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Wrench, CircleUser, Settings, ShieldCheck, Users, Trophy, Star, Briefcase } from "lucide-react";
import { ROLES } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AppSidebar() {
    const { isAuthenticated, user, modules } = useAuth();
    const pathname = usePathname();
    const { state } = useSidebar();

    if (!isAuthenticated || !user) {
        return null;
    }

    const userModules = user.role === ROLES.SUPERADMIN 
        ? modules 
        : modules.filter(m => user.modules.includes(m.id) && m.active);

    const canManageSystem = user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN;

    const getModuleIcon = (moduleId: string) => {
        // A simple example, you can expand this
        if (moduleId === 'pesquisa-satisfacao') {
            return <Star />;
        }
        if (moduleId === 'gamificacao') {
            return <Trophy />;
        }
        if (moduleId === 'rh') {
            return <Briefcase />;
        }
        return <Settings />;
    }

    return (
        <Sidebar>
            <SidebarHeader>
                 <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
                    <ShieldCheck className="h-6 w-6"/>
                    <h1 className="text-xl" style={{ opacity: state === 'expanded' ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}>
                        Koerner 360
                    </h1>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip={{children: "Dashboard"}}>
                            <Link href="/dashboard">
                                <LayoutDashboard/>
                                <span className={cn(state === 'collapsed' && "hidden")}>Dashboard</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                
                    {userModules.map(mod => (
                         <SidebarMenuItem key={mod.id}>
                            <SidebarMenuButton asChild isActive={pathname.startsWith(mod.path)} tooltip={{children: mod.name}}>
                                <Link href={mod.path}>
                                    {getModuleIcon(mod.id)}
                                    <span className={cn("capitalize", state === 'collapsed' && "hidden")}>{mod.name}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}

                    {canManageSystem && (
                        <>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === '/dashboard/usuarios'} tooltip={{children: "Gerenciar Usuários"}}>
                                    <Link href="/dashboard/usuarios">
                                        <Users />
                                        <span className={cn(state === 'collapsed' && "hidden")}>Usuários</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === '/dashboard/modulos'} tooltip={{children: "Gerenciar Módulos"}}>
                                    <Link href="/dashboard/modulos">
                                        <Wrench />
                                        <span className={cn(state === 'collapsed' && "hidden")}>Módulos</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </>
                    )}
                     <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/perfil'} tooltip={{children: "Perfil"}}>
                            <Link href="/perfil">
                                <CircleUser />
                                <span className={cn(state === 'collapsed' && "hidden")}>Perfil</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>
    )
}
