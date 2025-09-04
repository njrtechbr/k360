
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, ShieldHalf, UserIcon, Wrench, Users, PlusCircle, Gift, Building2, Cake, CalendarDays, PartyPopper } from "lucide-react";
import { ROLES, type Attendant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { differenceInDays, format, getYear, setYear, isFuture, addYears, differenceInYears } from 'date-fns';
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { usePerformance } from "@/providers/PerformanceProvider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";


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
    type: 'birthday' | 'admission';
};

const getUpcomingAnniversaries = (attendants: Attendant[]): Anniversary[] => {
    const today = new Date();
    const currentYear = getYear(today);

    if (!attendants) return [];
    
    const anniversaries: Anniversary[] = [];

    attendants.forEach(attendant => {
        const types: ('birthday' | 'admission')[] = ['birthday', 'admission'];
        types.forEach(type => {
            const dateStr = type === 'birthday' ? attendant.dataNascimento : attendant.dataAdmissao;
            if (!dateStr) return;

            let originalDate: Date;
            if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/');
                originalDate = new Date(Number(year), Number(month) - 1, Number(day));
            } else {
                originalDate = new Date(dateStr);
            }
             if (isNaN(originalDate.getTime())) return;

            let nextAnniversaryDate = setYear(originalDate, currentYear);
            
            if (differenceInDays(nextAnniversaryDate, today) < 0 ) {
                 nextAnniversaryDate = addYears(nextAnniversaryDate, 1);
            }
            
            const years = differenceInYears(nextAnniversaryDate, originalDate);

            anniversaries.push({
                attendant,
                daysUntil: differenceInDays(nextAnniversaryDate, today),
                date: nextAnniversaryDate,
                years,
                type: type,
            });
        });
    });

    return anniversaries
        .filter((item): item is Anniversary => item !== null)
        .sort((a, b) => a.daysUntil - b.daysUntil)
};

const groupAnniversariesByMonth = (anniversaries: Anniversary[]) => {
    return anniversaries.reduce((acc, anniversary) => {
        const month = format(anniversary.date, 'MMMM', { locale: ptBR });
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
        if (!acc[capitalizedMonth]) {
            acc[capitalizedMonth] = [];
        }
        acc[capitalizedMonth].push(anniversary);
        return acc;
    }, {} as Record<string, Anniversary[]>);
};


export default function DashboardPage() {
  const { user, isAuthenticated, authLoading, appLoading, modules, attendants } = useAuth();
  const router = useRouter();
  
  const [isAnniversaryModalOpen, setIsAnniversaryModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ type: 'birthday' | 'admission', title: string, data: Anniversary[] } | null>(null);
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const allAnniversaries = useMemo(() => getUpcomingAnniversaries(attendants), [attendants]);

  const todayAnniversaries = useMemo(() => allAnniversaries.filter(a => a.daysUntil === 0), [allAnniversaries]);
  const upcomingBirthdays = useMemo(() => allAnniversaries.filter(a => a.type === 'birthday' && a.daysUntil > 0), [allAnniversaries]);
  const upcomingWorkAnniversaries = useMemo(() => allAnniversaries.filter(a => a.type === 'admission' && a.daysUntil > 0), [allAnniversaries]);


  const moduleMap = useMemo(() => {
    if (!modules) return {};
    return modules.reduce((acc, module) => {
        acc[module.id] = module.name;
        return acc;
    }, {} as Record<string, string>);
  }, [modules]);
  
  const handleOpenModal = (type: 'birthday' | 'admission') => {
      if (type === 'birthday') {
          setModalContent({ type, title: 'Todos os Próximos Aniversariantes', data: upcomingBirthdays });
      } else {
          setModalContent({ type, title: 'Todos os Próximos Aniversários de Admissão', data: upcomingWorkAnniversaries });
      }
      setIsAnniversaryModalOpen(true);
  };


  if (authLoading || appLoading || !user) {
    return (
        <div className="flex items-center justify-center h-full">
            <p>Carregando aplicação...</p>
        </div>
    );
  }

  const canManageSystem = user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN;
  const userModules = user.modules?.map(moduleId => moduleMap[moduleId]).filter(Boolean) || [];

  const renderAnniversaryGroup = (anniversaries: Anniversary[], type: 'birthday' | 'admission') => {
    const groupedData = groupAnniversariesByMonth(anniversaries.filter(a => a.type === type));
    const sortedMonths = Object.keys(groupedData).sort((a, b) => {
        const monthA = groupedData[a][0].date.getMonth();
        const monthB = groupedData[b][0].date.getMonth();
        const yearA = groupedData[a][0].date.getFullYear();
        const yearB = groupedData[b][0].date.getFullYear();
        if(yearA !== yearB) return yearA - yearB;
        return monthA - monthB;
    });

    if (sortedMonths.length === 0) {
        return <p className="text-sm text-muted-foreground px-6 pb-4">Nenhum próximo aniversário para mostrar.</p>;
    }
    
    return sortedMonths.map(month => (
        <div key={month} className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground px-6">{month}</h4>
            <div className="space-y-2">
                {groupedData[month].map(({ attendant, daysUntil, years, date }) => (
                <div key={attendant.id} className="flex items-center justify-between p-2 mx-4 rounded-md border">
                    <Link href={`/dashboard/rh/atendentes/${attendant.id}`} className="flex items-center gap-3 group">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={attendant.avatarUrl} alt={attendant.name} />
                            <AvatarFallback>{getInitials(attendant.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium group-hover:underline">{attendant.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                {type === 'birthday' ? <Cake size={14}/> : <CalendarDays size={14}/>}
                                {format(date, 'dd/MM')} ({years} anos)
                            </p>
                        </div>
                    </Link>
                    <Badge variant="outline">{daysUntil === 0 ? 'Hoje!' : `em ${daysUntil}d`}</Badge>
                </div>
            ))}
            </div>
        </div>
    ));
  }
  
    const renderModalAnniversaryGroup = (anniversaries: Anniversary[]) => {
    const groupedData = groupAnniversariesByMonth(anniversaries);
    const sortedMonths = Object.keys(groupedData).sort((a, b) => {
        const monthA = groupedData[a][0].date.getMonth();
        const monthB = groupedData[b][0].date.getMonth();
        const yearA = groupedData[a][0].date.getFullYear();
        const yearB = groupedData[b][0].date.getFullYear();
        if(yearA !== yearB) return yearA - yearB;
        return monthA - monthB;
    });

    if (sortedMonths.length === 0) {
        return <p className="text-sm text-muted-foreground px-6 pb-4">Nenhum próximo aniversário para mostrar.</p>;
    }
    
    return sortedMonths.map(month => (
        <div key={month} className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground px-6">{month}</h4>
            <div className="space-y-2">
                {groupedData[month].map(({ attendant, daysUntil, years, date, type }) => (
                <div key={attendant.id} className="flex items-center justify-between p-2 mx-4 rounded-md border">
                    <Link href={`/dashboard/rh/atendentes/${attendant.id}`} className="flex items-center gap-3 group">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={attendant.avatarUrl} alt={attendant.name} />
                            <AvatarFallback>{getInitials(attendant.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium group-hover:underline">{attendant.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                {type === 'birthday' ? <Cake size={14}/> : <CalendarDays size={14}/>}
                                {format(date, 'dd/MM')} ({years} anos)
                            </p>
                        </div>
                    </Link>
                    <Badge variant="outline">{daysUntil === 0 ? 'Hoje!' : `em ${daysUntil}d`}</Badge>
                </div>
            ))}
            </div>
        </div>
    ));
  }


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
        
        {todayAnniversaries.length > 0 && (
            <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/30">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400"><PartyPopper /> Celebrações de Hoje!</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {todayAnniversaries.map(({ attendant, years, type }) => (
                         <div key={`${attendant.id}-${type}`} className="flex items-center justify-between p-3 bg-background rounded-md border">
                            <Link href={`/dashboard/rh/atendentes/${attendant.id}`} className="flex items-center gap-3 group">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={attendant.avatarUrl} alt={attendant.name} />
                                    <AvatarFallback>{getInitials(attendant.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-primary group-hover:underline">{attendant.name}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        {type === 'birthday' ? <Cake size={14} className="text-pink-500" /> : <Building2 size={14} className="text-blue-500"/>}
                                        {type === 'birthday' ? 'Aniversário' : `${years} ano(s) de casa`}
                                    </p>
                                </div>
                            </Link>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}

        <div className="grid md:grid-cols-2 gap-8">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Gift className="text-pink-500"/> Próximos Aniversariantes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                      ) : renderAnniversaryGroup(upcomingBirthdays.slice(0, 5), 'birthday')}
                  </CardContent>
                  <CardFooter>
                       <Button variant="secondary" className="w-full" onClick={() => handleOpenModal('birthday')}>Ver todos</Button>
                  </CardFooter>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Building2 className="text-blue-500" /> Aniversários de Admissão</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                      ) : renderAnniversaryGroup(upcomingWorkAnniversaries.slice(0, 5), 'admission')}
                  </CardContent>
                   <CardFooter>
                       <Button variant="secondary" className="w-full" onClick={() => handleOpenModal('admission')}>Ver todos</Button>
                  </CardFooter>
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

       <Dialog open={isAnniversaryModalOpen} onOpenChange={setIsAnniversaryModalOpen}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{modalContent?.title}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-96 pr-6">
                    {modalContent && renderModalAnniversaryGroup(modalContent.data)}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </>
  );
}

    
