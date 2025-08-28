
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, ShieldCheck, ShieldHalf, UserIcon, Wrench, PlusCircle } from "lucide-react";
import { ROLES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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

export default function DashboardPage() {
  const { user, isAuthenticated, loading, getUsers, modules } = useAuth();
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
    if(user && (user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN)){
        setAllUsers(getUsers());
    }
  }, [isAuthenticated, loading, router, user, getUsers]);

  const moduleMap = useMemo(() => {
    return modules.reduce((acc, module) => {
        acc[module.id] = module.name;
        return acc;
    }, {} as Record<string, string>);
  }, [modules]);

  if (loading || !user) {
    return (
        <div className="flex items-center justify-center h-full">
            <p>Carregando...</p>
        </div>
    );
  }

  const canManageSystem = user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN;
  const userModules = user.modules?.map(moduleId => moduleMap[moduleId]).filter(Boolean) || [];

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
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
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle>Gerenciamento de Usuários</CardTitle>
                      <Button asChild size="sm">
                        <Link href="/registrar"><PlusCircle className="mr-2"/>Adicionar Usuário</Link>
                      </Button>
                    </CardHeader>
                    <CardContent>
                        <CardDescription className="mb-4">Visualize e gerencie os usuários do sistema.</CardDescription>
                         <ScrollArea className="h-72">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Nível</TableHead>
                                        <TableHead>Módulos</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allUsers.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">{u.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                                            </TableCell>
                                            <TableCell className="flex gap-1 flex-wrap">
                                                {u.modules?.map(mId => (
                                                    <Badge key={mId} variant="outline" className="capitalize">{moduleMap[mId] || 'inválido'}</Badge>
                                                ))}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
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
  );
}
