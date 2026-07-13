/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { LogIn, Eye, EyeOff, Sparkles, Database, Sun, Moon } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, theme, toggleTheme, isRealDb } = useThemeAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    setError(null);
    const result = await login(email, password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Erro ao fazer login.');
    }
  };

  const handleQuickLogin = (role: 'admin' | 'operador') => {
    if (role === 'admin') {
      setEmail('virgo.aranha@gmail.com');
      setPassword('123');
    } else {
      setEmail('operador@abrigo.com');
      setPassword('123');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      {/* Absolute top-right tools */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 dark:bg-black/40 border border-white/20 dark:border-white/10 hover:bg-white/20 transition-all shadow-md text-white cursor-pointer"
          title="Alternar Tema"
        >
          {theme === 'dark' ? <Sun size={18} className="text-yellow-300" /> : <Moon size={18} className="text-blue-100" />}
        </button>
      </div>

      {/* Decorative Blur Background Circles */}
      <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Panel */}
      <div className="w-full max-w-md aero-black-panel rounded-2xl overflow-hidden p-8 border border-white/20 relative z-10 animate-fade-in">
        
        {/* Header Branding */}
        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 mx-auto bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner mb-4">
            <span className="text-3xl drop-shadow-md">🏠</span>
          </div>
          <h2 className="text-2xl font-bold font-display-lg text-white drop-shadow-md tracking-tight">
            Abrigo Doações
          </h2>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200 mt-1 font-bold">
            Sistema de Gestão Administrativa
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-100 text-sm flex items-start gap-2.5 animate-shake">
            <span className="text-base">⚠️</span>
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">
              E-mail corporativo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@abrigo.org"
              className="aero-input-gloss w-full h-11 px-4 rounded-xl text-sm text-white placeholder-white/30"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">
              Sua senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="aero-input-gloss w-full h-11 pl-4 pr-11 rounded-xl text-sm text-white placeholder-white/30"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="aero-button-primary w-full h-12 rounded-xl text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={15} />
                Entrar no Sistema
              </>
            )}
          </button>
        </form>

        {/* Quick Credentials Seeder for Demonstration */}
        <div className="mt-8 pt-6 border-t border-white/10 relative z-10 text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-3">
            Acesso Rápido para Teste
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickLogin('admin')}
              className="vista-button py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={12} />
              Administrador
            </button>
            <button
              onClick={() => handleQuickLogin('operador')}
              className="vista-button py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogIn size={12} />
              Operador
            </button>
          </div>
        </div>
      </div>

      {/* Footer Meta */}
      <footer className="mt-8 text-center text-[10px] text-white/40 tracking-[0.2em] uppercase space-y-2 z-10">
        <p>© 2026 Abrigo Doações • Painel de Gestão</p>
        <div className="flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isRealDb ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'}`} />
          <span>{isRealDb ? 'Conectado via Supabase Production' : 'Modo Demonstração (Local Storage)'}</span>
        </div>
      </footer>
    </div>
  );
};
