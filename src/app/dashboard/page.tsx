
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { User, Module } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, ShieldCheck, ShieldHalf, UserIcon, Wrench } from "lucide-react";
import { ROLES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

  const canManageUsers = user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN;
  const userModules = user.modules?.map(moduleId => moduleMap[moduleId]).filter(Boolean) || [];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold">Dashboard</CardTitle>
              <CardDescription>Bem-vindo, {user.name}!</CardDescription>
            </div>
            <Badge variant="outline" className="text-sm capitalize flex items-center gap-2">
                <RoleIcon role={user.role} />
                Seu nível de acesso: {user.role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p>Seus módulos de acesso:</p>
            <div className="flex gap-2 mt-2 flex-wrap">
                {userModules.length > 0 ? (
                    userModules.map(moduleName => <Badge key={moduleName} className="capitalize">{moduleName}</Badge>)
                ) : (
                    <p className="text-sm text-muted-foreground">Nenhum módulo atribuído.</p>
                )}
            </div>
        </CardContent>
      </Card>
      
      {canManageUsers && (
        <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Gerenciamento de Usuários</CardTitle>
                    <CardDescription>Visualize e adicione usuários.</CardDescription>
                  </div>
                  <Button asChild>
                    <Link href="/registrar">Adicionar Usuário</Link>
                  </Button>
                </CardHeader>
                <CardContent>
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
                                    <TableCell>{u.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                                    </TableCell>
                                    <TableCell className="flex gap-1 flex-wrap">
                                        {u.modules?.map(mId => (
                                            <Badge key={mId} variant="outline" className="capitalize">{moduleMap[mId] || mId}</Badge>
                                        ))}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
