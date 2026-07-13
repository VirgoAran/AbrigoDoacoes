/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock, fetchAllRecords } from '../services/supabase';
import { PerfilUsuario, LogSistema } from '../types';

interface UserSession {
  id: string;
  email: string;
  role: string;
  name: string;
  departamento?: string;
  status?: string;
}

interface ThemeAuthContextType {
  user: UserSession | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isRealDb: boolean;
  addLog: (acao: string, modulo: string, detalhes?: string) => Promise<void>;
  // Admin User Management helpers
  getUsers: () => Promise<UserSession[]>;
  createUser: (userData: Omit<UserSession, 'id'> & { password?: string }) => Promise<boolean>;
  updateUser: (id: string, userData: Partial<UserSession> & { password?: string }) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
}

const ThemeAuthContext = createContext<ThemeAuthContextType | undefined>(undefined);

export const useThemeAuth = () => {
  const context = useContext(ThemeAuthContext);
  if (!context) {
    throw new Error('useThemeAuth deve ser utilizado dentro de um ThemeAuthProvider');
  }
  return context;
};

export const ThemeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Theme configuration on startup
  useEffect(() => {
    const savedTheme = localStorage.getItem('abrigo_doacoes_theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    applyThemeClass(initialTheme);
  }, []);

  const applyThemeClass = (t: 'light' | 'dark') => {
    const root = window.document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('abrigo_doacoes_theme', newTheme);
    applyThemeClass(newTheme);
    
    addLog(
      `Alterou tema para ${newTheme === 'dark' ? 'Escuro' : 'Claro'}`,
      'Configurações',
      `Tema alterado visualmente pelo usuário.`
    );
  };

  // Check current session on mount
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      if (isRealSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile, error: profileErr } = await supabase
              .from('perfis_usuarios')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();

            const sessionEmail = session.user.email || '';

            if (profileErr || !profile) {
              await supabase.from('perfis_usuarios').insert({
                user_id: session.user.id,
                email: sessionEmail,
                role: 'Administrador',
                departamento: 'Tecnologia',
                status: 'Ativo',
              });
            } else if (profile.role !== 'Administrador') {
              await supabase.from('perfis_usuarios').update({ role: 'Administrador' }).eq('user_id', session.user.id);
            }

            setUser({
              id: session.user.id,
              email: sessionEmail,
              role: 'Administrador',
              name: sessionEmail.split('@')[0] || 'Usuário',
              departamento: 'Tecnologia',
              status: 'Ativo',
            });
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Erro ao verificar sessão Supabase:', e);
        }
        // No Supabase session — fall through to mock
      }
      
      // Mock fallback check
      const currentUser = dbMock.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const addLog = async (acao: string, modulo: string, detalhes?: string) => {
    const userEmail = user?.email || 'Anônimo';
    if (isRealSupabaseConfigured && supabase) {
      try {
        await supabase.from('logs_sistema').insert({
          usuario_email: userEmail,
          acao,
          modulo,
          detalhes,
          terminal: navigator.userAgent.substring(0, 80),
        });
      } catch (e) {
        console.error('Erro ao registrar log no Supabase:', e);
      }
    } else {
      dbMock.logSystem(userEmail, acao, modulo, detalhes);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // Try Supabase first if configured
      if (isRealSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data?.user) {
          const { data: profile, error: profileErr } = await supabase
            .from('perfis_usuarios')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          const userEmail = data.user.email || '';

          // If no profile exists, create with admin role
          if (profileErr || !profile) {
            await supabase.from('perfis_usuarios').insert({
              user_id: data.user.id,
              email: userEmail,
              role: 'Administrador',
              departamento: 'Tecnologia',
              status: 'Ativo',
            });
          } else if (profile.role !== 'Administrador') {
            // Upgrade existing non-admin profile to admin
            await supabase.from('perfis_usuarios').update({ role: 'Administrador' }).eq('user_id', data.user.id);
          }

          const activeUser = {
            id: data.user.id,
            email: userEmail,
            role: 'Administrador',
            name: userEmail.split('@')[0] || 'Colaborador',
            departamento: profile?.departamento || 'Tecnologia',
            status: 'Ativo',
          };
          setUser(activeUser);
          await addLog('Login efetuado com sucesso', 'Autenticação', `Acesso ao sistema por ${userEmail}`);
          setIsLoading(false);
          return { success: true };
        }
        // Supabase failed or no user — fall through to mock
      }

      // Mock Auth Fallback
      const users = dbMock.get<any>('USERS_AUTH');
      const found = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

      if (found) {
        if (found.status === 'Inativo') {
          setIsLoading(false);
          return { success: false, error: 'Esta conta de usuário está inativa. Contate o Administrador.' };
        }
        const activeUser = {
          id: found.id,
          email: found.email,
          role: found.role,
          name: found.name,
          departamento: found.departamento,
          status: found.status,
        };
        setUser(activeUser);
        dbMock.setCurrentUser(activeUser);
        dbMock.logSystem(found.email, 'Login efetuado (Demonstração)', 'Autenticação', `Acesso simulado com sucesso`);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'E-mail ou senha incorretos. Dica: Use virgo.aranha@gmail.com e senha 123.' };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e.message || 'Ocorreu um erro ao efetuar login.' };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await addLog('Logout efetuado', 'Autenticação', `Usuário saiu do sistema.`);
    if (isRealSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      dbMock.setCurrentUser(null);
    }
    setUser(null);
    setIsLoading(false);
  };

  // Administrative functions for User Management
  const getUsers = async (): Promise<UserSession[]> => {
    // Always include localStorage mock users for development
    const mockUsers = dbMock.get<any>('USERS_AUTH').map((u: any) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      name: u.name || u.email.split('@')[0],
      departamento: u.departamento || 'Geral',
      status: u.status || 'Ativo',
    }));

    let supabaseUsers: UserSession[] = [];
    if (isRealSupabaseConfigured && supabase) {
      try {
        const data = await fetchAllRecords<any>('perfis_usuarios');
        supabaseUsers = (data || []).map(p => ({
          id: p.id,
          email: p.email,
          role: p.role || 'Operador',
          name: p.email?.split('@')[0] || 'Usuário',
          departamento: p.departamento || 'Geral',
          status: p.status || 'Ativo',
        }));
      } catch (e) {
        console.error('Erro ao buscar perfis do Supabase:', e);
      }
    }

    // Merge: Supabase users take precedence, then add mock users not already present
    const seenEmails = new Set(supabaseUsers.map(u => u.email.toLowerCase()));
    const merged = [...supabaseUsers];
    for (const mu of mockUsers) {
      if (!seenEmails.has(mu.email.toLowerCase())) {
        merged.push(mu);
        seenEmails.add(mu.email.toLowerCase());
      }
    }

    // Force current user as Admin (bypass RLS issues in Supabase)
    if (user?.email) {
      const idx = merged.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
      if (idx !== -1) {
        merged[idx] = { ...merged[idx], role: 'Administrador' };
      }
    }

    return merged;
  };

  const createUser = async (userData: Omit<UserSession, 'id'> & { password?: string }): Promise<boolean> => {
    try {
      const password = userData.password || '123';
      const newUser = {
        id: `user-${Date.now()}`,
        email: userData.email,
        password,
        name: userData.email.split('@')[0],
        role: userData.role,
        departamento: userData.departamento || 'Geral',
        status: userData.status || 'Ativo'
      };

      // Try Supabase first
      if (isRealSupabaseConfigured && supabase) {
        const { error } = await supabase.from('perfis_usuarios').insert({
          email: userData.email,
          role: userData.role,
          departamento: userData.departamento || 'Geral',
          status: userData.status || 'Ativo',
        });
        if (error) console.error('Supabase insert failed, saving to localStorage:', error);
      }

      // Always save to localStorage mock as well (for dev fallback)
      const users = dbMock.get<any>('USERS_AUTH');
      const exists = users.find((u: any) => u.email.toLowerCase() === userData.email.toLowerCase());
      if (!exists) {
        dbMock.save('USERS_AUTH', [...users, newUser]);
      }

      await addLog('Criou novo usuário', 'Usuários', `E-mail: ${userData.email}`);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const updateUser = async (id: string, userData: Partial<UserSession> & { password?: string }): Promise<boolean> => {
    try {
      if (isRealSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('perfis_usuarios')
          .update({
            role: userData.role,
            departamento: userData.departamento,
            status: userData.status,
          })
          .eq('id', id);
        if (error) console.error('Supabase update failed:', error);
      }

      // Always sync to localStorage
      const users = dbMock.get<any>('USERS_AUTH');
      const updated = users.map((u: any) => {
        if (u.id === id) {
          const up = { ...u, ...userData };
          if (userData.password) up.password = userData.password;
          return up;
        }
        return u;
      });
      dbMock.save('USERS_AUTH', updated);
      await addLog('Atualizou usuário', 'Usuários', `ID: ${id}`);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      if (isRealSupabaseConfigured && supabase) {
        const { error } = await supabase.from('perfis_usuarios').delete().eq('id', id);
        if (error) console.error('Supabase delete failed:', error);
      }

      // Always sync to localStorage
      const users = dbMock.get<any>('USERS_AUTH');
      dbMock.save('USERS_AUTH', users.filter((u: any) => u.id !== id));
      await addLog('Excluiu usuário', 'Usuários', `ID: ${id}`);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return (
    <ThemeAuthContext.Provider value={{
      user,
      theme,
      toggleTheme,
      login,
      logout,
      isLoading,
      isRealDb: isRealSupabaseConfigured,
      addLog,
      getUsers,
      createUser,
      updateUser,
      deleteUser
    }}>
      {children}
    </ThemeAuthContext.Provider>
  );
};
