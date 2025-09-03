
"use client";

import type { ReactNode } from "react";
import React, { useCallback, useEffect, useState } from "react";
import type { User, Role } from "@/lib/types";
import { ROLES, INITIAL_MODULES } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";


// Firebase Imports
import { auth, db } from "@/lib/firebase";
import { 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile as updateFirebaseProfile,
    updatePassword
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, writeBatch, query, where } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, "id">) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  hasSuperAdmin: () => Promise<boolean>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
        setLoading(true);
        console.log("AUTH: Iniciando inicialização de autenticação...");

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = { id: userDoc.id, ...userDoc.data() } as User;
                    setUser(userData);
                    console.log(`AUTH: Usuário autenticado e encontrado no Firestore (UID: ${firebaseUser.uid}).`);
                } else {
                     console.log(`AUTH: Usuário autenticado (UID: ${firebaseUser.uid}) não encontrado no Firestore. Criando novo perfil...`);
                    const newUser: Omit<User, 'id'> = {
                        name: firebaseUser.displayName || "Novo Usuário",
                        email: firebaseUser.email!,
                        role: ROLES.USER,
                        modules: []
                    };
                    await setDoc(userDocRef, newUser);
                    const createdUserData = { id: firebaseUser.uid, ...newUser };
                    setUser(createdUserData);
                }
            } else {
                 console.log("AUTH: Nenhum usuário autenticado.");
                 setUser(null);
            }
             console.log("AUTH: Inicialização de autenticação concluída.");
             setLoading(false);
        });
        
        return () => {
             console.log("AUTH: Limpando listener de autenticação.");
             unsubscribe();
        };
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log(`AUTH: Tentativa de login para ${email}`);
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login bem-sucedido!", description: `Bem-vindo de volta.` });
    } catch (error: any) {
      console.error("AUTH: Erro no Login:", error);
      toast({ variant: "destructive", title: "Erro de autenticação", description: "Email ou senha incorretos." });
      throw error;
    }
  }, [toast]);

  const register = useCallback(async (userData: Omit<User, 'id'>) => {
    try {
      console.log(`AUTH: Tentativa de registro para ${userData.email}`);
      
      const modulesSnapshot = await getDocs(collection(db, "modules"));
      const allModuleIds = modulesSnapshot.docs.map(doc => doc.id);

      const userCredential = await createUserWithEmailAndPassword(auth, userData.password ? userData.password : "123456");
      const firebaseUser = userCredential.user;

      await updateFirebaseProfile(firebaseUser, { displayName: userData.name });

      const { password, ...userDataForDb } = userData;
      let finalModules = userDataForDb.modules;
      
      if (userData.role === ROLES.SUPERADMIN) {
        finalModules = allModuleIds;
      }
      
      const newUserDoc = { ...userDataForDb, modules: finalModules };

      await setDoc(doc(db, "users", firebaseUser.uid), newUserDoc);
      console.log(`AUTH: Documento do usuário criado no Firestore para ${firebaseUser.uid}`);
      
      toast({ title: "Conta Criada!", description: "Sua conta foi criada com sucesso." });
      
    } catch (error: any) {
      console.error("AUTH: Erro no Registro:", error);
      let description = "Ocorreu um erro desconhecido.";
      if (error.code === 'auth/email-already-in-use') description = "Este endereço de email já está em uso.";
      else if (error.code === 'auth/weak-password') description = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      toast({ variant: "destructive", title: "Erro no Registro", description });
      throw error;
    }
  }, [toast]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
       setUser(null);
      console.log("AUTH: Logout realizado com sucesso.");
    } catch (error: any) {
       console.error("AUTH: Erro no Logout:", error);
       toast({ variant: "destructive", title: "Erro no Logout", description: error.message });
    }
  }, [toast]);

  const updateProfile = useCallback(async (userData: Partial<User>) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado");
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const dataToUpdate: Partial<Omit<User, 'id' | 'password'>> = {};

    if (userData.name) {
        await updateFirebaseProfile(auth.currentUser, { displayName: userData.name });
        dataToUpdate.name = userData.name;
    }
    if (Object.keys(dataToUpdate).length > 0) await updateDoc(userDocRef, dataToUpdate);
    if (userData.password) await updatePassword(auth.currentUser, userData.password);
    
    const updatedDoc = await getDoc(userDocRef);
    if(updatedDoc.exists()) setUser({ id: updatedDoc.id, ...updatedDoc.data() } as User);
    toast({ title: "Perfil Atualizado!", description: "Suas informações foram atualizadas." });
  }, [toast]);

  const hasSuperAdmin = useCallback(async (): Promise<boolean> => {
      const q = query(collection(db, 'users'), where("role", "==", ROLES.SUPERADMIN));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    loading,
    login,
    logout,
    register,
    updateProfile,
    hasSuperAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
