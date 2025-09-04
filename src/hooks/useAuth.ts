"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { usePrisma } from "@/providers/PrismaProvider";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Este hook combina a funcionalidade do NextAuth com o acesso ao Prisma
// para manter compatibilidade com o código existente
export const useAuth = () => {
  const { data: session, status } = useSession();
  const prisma = usePrisma();
  const router = useRouter();
  const { toast } = useToast();
  
  const login = async (email: string, password: string) => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      
      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Erro de autenticação",
          description: "Email ou senha incorretos.",
        });
        return false;
      }
      
      toast({
        title: "Login bem-sucedido!",
        description: `Bem-vindo de volta${session?.user?.name ? ', ' + session.user.name : ''}!`,
      });
      
      router.push("/dashboard");
      return true;
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Ocorreu um erro ao tentar fazer login.",
      });
      return false;
    }
  };
  
  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
  };

  return {
    ...prisma,
    user: session?.user || null,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    loading: status === "loading", // Alias para compatibilidade
    login,
    logout,
  };
};