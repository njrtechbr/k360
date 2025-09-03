
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, ShieldHalf, UserIcon, Wrench, Users, PlusCircle, Gift, Building2, Cake, CalendarDays } from "lucide-react";
import { ROLES, type Attendant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { differenceInDays, format, getYear, setYear, isFuture, addYears, differenceInYears } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { usePerformance } from "@/providers/PerformanceProvider";

const RoleIcon = ({ role }: { role: string }) => {
    switch (role) {
      case ROLES.SUPERADMIN:
        return <ShieldCheck className="h-5 w-5 text-red-500" />;
      case ROLES.ADMIN:
        return <ShieldAlert className="h-5 w-5 text-orange-500" />;
      case ROLES.SUPERVISOR:
        return <ShieldHalf className="h-5 w-5 text-yellow-500" />;
      case ROLES.USER:
        return <UserIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <UserIcon className="h-5 w-5 text-gray-500" />;
    }
};

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}


type Anniversary = {
    attendant: Attendant;
    daysUntil: number;
    date: Date;
    years: number;
};

const getUpcomingAnniversaries = (attendants: Attendant[], type: 'birthday' | 'admission'): Anniversary[] => {
    const today = new Date();
    const currentYear = getYear(today);

    return attendants
        .map(attendant => {
            const dateStr = type === 'birthday' ? attendant.dataNascimento : attendant.dataAdmissao;
            if (!dateStr) return null;

            const originalDate = new Date(dateStr);
            if (isNaN(originalDate.getTime())) return null;


            let nextAnniversaryDate = setYear(originalDate, currentYear);
            
            if (!isFuture(nextAnniversaryDate) && differenceInDays(nextAnniversaryDate, today) < -1 ) {
                 nextAnniversaryDate = addYears(nextAnniversaryDate, 1);
            }

            const years = differenceInYears(nextAnniversaryDate, originalDate);

            return {
                attendant,
                daysUntil: differenceInDays(nextAnniversaryDate, today),
                date: nextAnniversaryDate,
                years,
            };
        })
        .filter((item): item is Anniversary => item !== null && item.daysUntil >= 0)
        .sort((a, b) => a.daysUntil - b.daysUntil);
};


export default function DashboardPage() {
  const { user, isAuthenticated, authLoading, appLoading, modules, attendants } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);


  const moduleMap = useMemo(() => {
    return modules.reduce((acc, module) => {
        acc[module.id] = module.name;
        return acc;
    }, {} as Record<string, string>);
  }, [modules]);
  
  const upcomingBirthdays = useMemo(() => getUpcomingAnniversaries(attendants, 'birthday'), [attendants]);
  const upcomingWorkAnniversaries = useMemo(() => getUpcomingAnniversaries(attendants, 'admission'), [attendants]);


  if (authLoading || !user) {
    return (
        <div className="flex items-center justify-center h-full">
            <p>Carregando aplicação...</p>
        </div>
    );
  }

  const canManageSystem = user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN;
  const userModules = user.modules?.map(moduleId => moduleMap[moduleId]).filter(Boolean) || [];

  return (
    <>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold font-heading">Dashboard</h1>
            <p className="text-muted-foreground">Bem-vindo de volta, {user.name}!</p>
          </div>
          <Badge variant="outline" className="text-sm capitalize flex items-center gap-2">
              <RoleIcon role={user.role} />
              Seu nível de acesso: {user.role}
          </Badge>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Gift className="text-pink-500"/> Aniversários</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                      {appLoading ? (
                          Array.from({ length: 2 }).map((_, i) => (
                              <div key={i} className="flex items-center justify-between p-2">
                                  <div className="flex items-center gap-3">
                                      <Skeleton className="h-10 w-10 rounded-full" />
                                      <div className="space-y-1">
                                          <Skeleton className="h-4 w-32" />
                                          <Skeleton className="h-3 w-24" />
                                      </div>
                                  </div>
                                  <Skeleton className="h-6 w-16 rounded-full" />
                              </div>
                          ))
                      ) : upcomingBirthdays.length > 0 ? upcomingBirthdays.map(({ attendant, daysUntil, years, date }) => (
                          <div key={attendant.id} className="flex items-center justify-between p-2 rounded-md border">
                              <Link href={`/dashboard/rh/atendentes/${attendant.id}`} className="flex items-center gap-3 group">
                                  <Avatar className="h-10 w-10">
                                      <AvatarImage src={attendant.avatarUrl} alt={attendant.name} />
                                      <AvatarFallback>{getInitials(attendant.name)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                      <p className="font-medium group-hover:underline">{attendant.name}</p>
                                      <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Cake size={14}/> {format(date, 'dd/MM')} ({years} anos)</p>
                                  </div>
                              </Link>
                              <Badge variant="outline">{daysUntil === 0 ? 'Hoje!' : `em ${daysUntil}d`}</Badge>
                          </div>
                      )) : <p className="text-sm text-muted-foreground">Nenhum aniversário próximo.</p>}
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Building2 className="text-blue-500" /> Aniversários de Admissão</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                      {appLoading ? (
                          Array.from({ length: 2 }).map((_, i) => (
                              <div key={i} className="flex items-center justify-between p-2">
                                  <div className="flex items-center gap-3">
                                      <Skeleton className="h-10 w-10 rounded-full" />
                                      <div className="space-y-1">
                                          <Skeleton className="h-4 w-32" />
                                          <Skeleton className="h-3 w-24" />
                                      </div>
                                  </div>
                                  <Skeleton className="h-6 w-16 rounded-full" />
                              </div>
                          ))
                      ) : upcomingWorkAnniversaries.length > 0 ? upcomingWorkAnniversaries.map(({ attendant, daysUntil, years, date }) => (
                          <div key={attendant.id} className="flex items-center justify-between p-2 rounded-md border">
                              <Link href={`/dashboard/rh/atendentes/${attendant.id}`} className="flex items-center gap-3 group">
                                  <Avatar className="h-10 w-10">
                                      <AvatarImage src={attendant.avatarUrl} alt={attendant.name} />
                                      <AvatarFallback>{getInitials(attendant.name)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                      <p className="font-medium group-hover:underline">{attendant.name}</p>
                                      <p className="text-sm text-muted-foreground flex items-center gap-1.5"><CalendarDays size={14}/> {format(date, 'dd/MM')} ({years} anos)</p>
                                  </div>
                              </Link>
                              <Badge variant="outline">{daysUntil === 0 ? 'Hoje!' : `em ${daysUntil}d`}</Badge>
                          </div>
                      )) : <p className="text-sm text-muted-foreground">Nenhum aniversário de admissão próximo.</p>}
                  </CardContent>
              </Card>
          </div>


        <Card>
          <CardHeader>
            <CardTitle>Seus Módulos de Acesso</CardTitle>
            <CardDescription>Estes são os módulos do sistema que você pode acessar.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex gap-2 mt-2 flex-wrap">
                  {userModules.length > 0 ? (
                      userModules.map(moduleName => <Badge key={moduleName} className="capitalize">{moduleName}</Badge>)
                  ) : (
                      <p className="text-sm text-muted-foreground">Nenhum módulo atribuído.</p>
                  )}
              </div>
          </CardContent>
        </Card>
        
        {canManageSystem && (
          <div>
            <h2 className="text-2xl font-bold font-heading mb-4">Área Administrativa</h2>
              <div className="grid md:grid-cols-2 gap-8">
                  <Card>
                      <CardHeader>
                        <CardTitle>Gerenciamento de Usuários</CardTitle>
                        <CardDescription>Adicione, edite ou remova usuários do sistema.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                              Controle os níveis de acesso e as permissões de cada usuário.
                          </p>
                          <Button asChild>
                              <Link href="/dashboard/usuarios">
                                  <Users className="mr-2 h-4 w-4" />
                                  Gerenciar Usuários
                              </Link>
                          </Button>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader>
                          <CardTitle>Gerenciamento de Módulos</CardTitle>
                          <CardDescription>Adicione ou edite os módulos do sistema.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                              Os módulos definem as áreas do sistema que os usuários podem acessar.
                          </p>
                          <Button asChild>
                              <Link href="/dashboard/modulos">
                                  <Wrench className="mr-2 h-4 w-4" />
                                  Gerenciar Módulos
                              </Link>
                          </Button>
                      </CardContent>
                  </Card>
              </div>
          </div>
        )}
        {(user.role === ROLES.SUPERVISOR) && (
          <Card>
              <CardHeader>
                  <CardTitle>Visão do Supervisor</CardTitle>
                  <CardDescription>Você tem permissões de supervisão.</CardDescription>
              </CardHeader>
              <CardContent>
                  <p>Aqui você pode ver relatórios e dados relevantes para sua função.</p>
              </CardContent>
          </Card>
        )}
        {(user.role === ROLES.USER) && (
          <Card>
              <CardHeader>
                  <CardTitle>Painel do Usuário</CardTitle>
                  <CardDescription>Bem-vindo à sua área pessoal.</CardDescription>
              </CardHeader>
              <CardContent>
                  <p>Você pode visualizar e editar seu perfil na página de perfil.</p>
              </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
