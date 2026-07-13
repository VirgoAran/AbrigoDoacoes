/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ThemeAuthProvider, useThemeAuth } from './context/ThemeAuthContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, isLoading } = useThemeAuth();

  // Loading Session Spinner (Vista Glass style)
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-950">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
        
        <div className="aero-black-panel rounded-2xl p-8 border border-white/20 flex flex-col items-center max-w-sm text-center space-y-4 shadow-2xl relative z-10">
          <Loader2 className="animate-spin text-blue-300" size={32} />
          <h3 className="text-white font-bold text-sm tracking-wide uppercase">Abrigo_Doacoes</h3>
          <p className="text-xs text-white/50">Carregando ambiente administrativo e autenticando sessão de segurança...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Login />;
  }

  // Authenticated
  return <Dashboard />;
}

export default function App() {
  return (
    <ThemeAuthProvider>
      <AppContent />
    </ThemeAuthProvider>
  );
}
