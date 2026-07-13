/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { LogSistema } from '../types';
import { Activity, Search, RefreshCw, Terminal, Clock, ShieldAlert } from 'lucide-react';

export const LogsSistema: React.FC = () => {
  const { user } = useThemeAuth();
  const [logs, setLogs] = useState<LogSistema[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    if (isRealSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('logs_sistema')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        setLogs(data || []);
      } catch (e) {
        console.error(e);
      }
    } else {
      setLogs(dbMock.get<any>('LOGS_SISTEMA'));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.usuario_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.acao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.modulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.detalhes && log.detalhes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Table block */}
      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <header className="px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-b from-white/10 to-transparent">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-300 drop-shadow" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide uppercase text-glow">Logs de Auditoria do Sistema</h2>
          </div>
          <button
            onClick={loadLogs}
            className="vista-button px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 !bg-white/10 !text-white border-white/20 hover:!bg-white/20"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Recarregar Logs
          </button>
        </header>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Filtrar logs por e-mail, ação, módulo ou terminal..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="aero-input-gloss w-full h-10 pl-10 pr-4 rounded-xl text-sm"
              />
            </div>
            <span className="hidden sm:inline-block bg-white/10 px-3 py-1.5 rounded-full text-[10px] tracking-widest font-bold uppercase border border-white/10 text-white/70">
              Audit Limit: 100 registros
            </span>
          </div>

          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/5 text-left border-b border-white/10 font-mono text-[9px] uppercase tracking-wider text-white/40">
                    <th className="p-4">Data / Hora</th>
                    <th className="p-4">Operador</th>
                    <th className="p-4">Ação</th>
                    <th className="p-4">Módulo</th>
                    <th className="p-4">Detalhes</th>
                    <th className="p-4">Terminal / Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-white/80">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-white/40 italic">
                        Nenhum registro de log localizado.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 whitespace-nowrap font-mono text-[11px] text-blue-200">
                          <div className="flex items-center gap-1.5">
                            <Clock size={11} className="text-white/40" />
                            <span>{log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : 'Agora'}</span>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-white">
                          {log.usuario_email}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-white/95">{log.acao}</span>
                        </td>
                        <td className="p-4 font-mono font-bold text-blue-300">
                          {log.modulo}
                        </td>
                        <td className="p-4 text-white/60">
                          {log.detalhes || 'Nenhum detalhe extra.'}
                        </td>
                        <td className="p-4 text-[10px] font-mono text-white/40 max-w-xs truncate" title={log.terminal}>
                          <div className="flex items-center gap-1">
                            <Terminal size={10} />
                            <span>{log.terminal || 'Terminal de Redirecionamento'}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
