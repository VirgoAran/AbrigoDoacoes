/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { supabase, isRealSupabaseConfigured, dbMock, fetchAllRecords } from '../services/supabase';
import { Doador, Doacao, ItemCatalogo } from '../types';
import { 
  Users, User, Gift, Calendar, Folder, Clipboard, MapPin, 
  Printer, Activity, ShieldAlert, LogOut, Sun, Moon, 
  ArrowRight, ArrowLeft, Sparkles, LayoutDashboard, Database, Layers, CheckSquare, UserCheck, Car, ArrowLeftRight, BarChart2, ClipboardList, ChevronDown
} from 'lucide-react';

// Import Recharts components for analytics
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// Import Sub-modules
import { Doadores } from './Doadores';
import { Doacoes } from './Doacoes';
import { CategoriasItens } from './CategoriasItens';
import { BaixaLote } from './BaixaLote';
import { UserManagement } from './UserManagement';
import { LogsSistema } from './LogsSistema';
import { RelatoriosDialog } from './RelatoriosDialog';
import { MapaDoacoes } from './MapaDoacoes';
import { StatusIndividual } from './StatusIndividual';
import { Motoristas } from './Motoristas';
import { Veiculos } from './Veiculos';
import { MovimentacaoEstoque } from './MovimentacaoEstoque';
import { ComparativoRegiao } from './ComparativoRegiao';
import { GraficosEstatisticos } from './GraficosEstatisticos';
import { RelatorioDoacoes } from './RelatorioDoacoes';
import { RelacaoDoacoesDia } from './RelacaoDoacoesDia';
import { RetiradasComplemento } from './RetiradasComplemento';
import { CronogramaModal } from './CronogramaModal';

type TabType = 'home' | 'doadores' | 'doacoes' | 'categorias' | 'baixa_lote' | 'relatorios' | 'logs' | 'usuarios' | 'mapa' | 'status_individual' | 'motoristas' | 'veiculos' | 'movimentacoes' | 'comparativo_regiao' | 'graficos_estatisticos' | 'relatorio_doacoes' | 'relacao_doacoes_dia' | 'retiradas_complemento';

export const Dashboard: React.FC = () => {
  const { user, theme, toggleTheme, logout } = useThemeAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [prefilledDoadorId, setPrefilledDoadorId] = useState<number | null>(null);
  const [isCronogramaOpen, setIsCronogramaOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);
  
  // Dashboard Analytics States
  const [stats, setStats] = useState({
    doadoresCount: 0,
    doacoesCount: 0,
    pendentesCount: 0,
    baixadasCount: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const loadDashboardStats = async () => {
    let rawDoadores: Doador[] = [];
    let rawDoacoes: Doacao[] = [];
    let rawItens: ItemCatalogo[] = [];

    if (isRealSupabaseConfigured && supabase) {
      try {
        rawDoadores = await fetchAllRecords<any>('doadores');
        rawDoacoes = await fetchAllRecords<any>('doacoes');
        rawItens = await fetchAllRecords<any>('itens');
      } catch (e) {
        console.error('Erro ao ler estatísticas do Supabase:', e);
      }
    } else {
      rawDoadores = dbMock.get<Doador>('DOADORES');
      rawDoacoes = dbMock.get<Doacao>('DOACOES');
      rawItens = dbMock.get<ItemCatalogo>('ITENS');
    }

    const pendentes = rawDoacoes.filter(d => !d.data_baixa && !d.data_cancelamento).length;
    const baixadas = rawDoacoes.filter(d => !!d.data_baixa).length;

    setStats({
      doadoresCount: rawDoadores.length,
      doacoesCount: rawDoacoes.length,
      pendentesCount: pendentes,
      baixadasCount: baixadas
    });

    // Populate Recharts Data based on Inventory Items
    const categoryTotals: { [key: string]: number } = {};
    rawItens.forEach(item => {
      const codeBase = item.codigo_base || 'OUTRO';
      categoryTotals[codeBase] = (categoryTotals[codeBase] || 0) + (item.qtde || 0);
    });

    const parsedChart = Object.keys(categoryTotals).map(key => ({
      name: key === 'ALI' ? 'Alimentos' : 
            key === 'VES' ? 'Vestuário' : 
            key === 'MOV' ? 'Móveis' : 
            key === 'ELE' ? 'Eletrodomésticos' : 
            key === 'BRIN' ? 'Brinquedos' : key,
      Quantidade: categoryTotals[key]
    }));
    setChartData(parsedChart);

    // Get 5 most recent activity logs
    if (isRealSupabaseConfigured && supabase) {
      const { data: recent } = await supabase
        .from('logs_sistema')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentLogs(recent || []);
    } else {
      const logsList = dbMock.get<any>('LOGS_SISTEMA');
      setRecentLogs(logsList.slice(0, 5));
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, [activeTab]);

  // Handle formatted current date in Portuguese
  const getFormattedDate = () => {
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('pt-BR', dateOptions);
  };

  const isAdmin = user?.role === 'Administrador';

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-white font-body-md transition-colors duration-500 pb-12 md:pb-0">
      
      {/* SIDEBAR NAVIGATION MODULE - Windows Vista Aero Black Style */}
      {activeTab === 'home' && (
        <aside className="aero-black w-full md:w-64 flex-shrink-0 flex flex-col z-20 border-r border-white/10 select-none">
          {/* Brand header */}
          <div className="p-6 border-b border-white/5 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
                <span className="text-3xl drop-shadow">🏠</span>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white drop-shadow-md font-display-lg leading-none">
                  Abrigo_Doacoes
                </h1>
                <p className="text-[9px] uppercase tracking-[0.2em] text-blue-200 mt-1 font-extrabold opacity-80">
                  Painel Administrativo
                </p>
              </div>
            </div>
          </div>

          {/* Navigation list */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 px-3 block mb-2">
              Módulos Principais
            </span>

            <button
              onClick={() => setActiveTab('home')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'home' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <LayoutDashboard size={16} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Painel Geral</span>
            </button>

            <button
              onClick={() => setActiveTab('doadores')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'doadores' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <Users size={16} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Doadores</span>
            </button>

            <button
              onClick={() => setActiveTab('doacoes')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'doacoes' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <Gift size={16} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Doações</span>
            </button>

            <button
              onClick={() => setActiveTab('categorias')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'categorias' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <Folder size={16} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Categorias / Itens</span>
            </button>

            <button
              onClick={() => setActiveTab('baixa_lote')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'baixa_lote' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <Layers size={16} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Baixa em Lote</span>
            </button>

            <button
              onClick={() => setActiveTab('mapa')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'mapa' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <MapPin size={16} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Mapa de Doações</span>
            </button>

            <button
              onClick={() => setActiveTab('motoristas')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'motoristas' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <UserCheck size={16} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Motoristas</span>
            </button>

            <button
              onClick={() => setActiveTab('veiculos')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'veiculos' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <Car size={16} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Veículos</span>
            </button>

            <button
              onClick={() => setActiveTab('movimentacoes')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'movimentacoes' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <ArrowLeftRight size={16} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Mov. Estoque</span>
            </button>

            <button
              onClick={() => setActiveTab('status_individual')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'status_individual' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <CheckSquare size={16} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Status Individual</span>
            </button>

            {/* SUBMENU: RELATÓRIOS */}
            <div className="space-y-0.5">
              <button
                onClick={() => setRelatoriosOpen(!relatoriosOpen)}
                className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                  relatoriosOpen ? 'bg-white/10 border-white/10 text-white' : 'text-white/75 hover:text-white'
                }`}
              >
                <Printer size={16} className="text-blue-300" />
                <span className="text-xs font-bold uppercase tracking-wider flex-1">Relatórios</span>
                <ChevronDown
                  size={14}
                  className={`text-white/50 transition-transform duration-200 ${relatoriosOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {relatoriosOpen && (
                <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
                  <button
                    onClick={() => setActiveTab('relatorios')}
                    className={`sidebar-item w-full flex items-center gap-3 p-2.5 rounded-xl text-left cursor-pointer transition-all ${
                      activeTab === 'relatorios' ? 'bg-white/15 border-white/20 text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <Printer size={14} className="text-blue-300/70" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Emitir Relatórios</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('relatorio_doacoes')}
                    className={`sidebar-item w-full flex items-center gap-3 p-2.5 rounded-xl text-left cursor-pointer transition-all ${
                      activeTab === 'relatorio_doacoes' ? 'bg-white/15 border-white/20 text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <ClipboardList size={14} className="text-blue-300/70" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Relatório Doações</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('relacao_doacoes_dia')}
                    className={`sidebar-item w-full flex items-center gap-3 p-2.5 rounded-xl text-left cursor-pointer transition-all ${
                      activeTab === 'relacao_doacoes_dia' ? 'bg-white/15 border-white/20 text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <Calendar size={14} className="text-blue-300/70" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Doações do Dia</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('retiradas_complemento')}
                    className={`sidebar-item w-full flex items-center gap-3 p-2.5 rounded-xl text-left cursor-pointer transition-all ${
                      activeTab === 'retiradas_complemento' ? 'bg-white/15 border-white/20 text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <ClipboardList size={14} className="text-blue-300/70" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Retir. com Complemento</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab('comparativo_regiao')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'comparativo_regiao' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <BarChart2 size={16} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Comp. Regiões</span>
            </button>

            <button
              onClick={() => setActiveTab('graficos_estatisticos')}
              className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'graficos_estatisticos' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <BarChart2 size={16} className="text-pink-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Gráficos Estatísticos</span>
            </button>

            {/* Admin Restricted Sections */}
            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-white/5 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 px-3 block mb-2">
                  Área Administrativa
                </span>

                <button
                  onClick={() => setActiveTab('usuarios')}
                  className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                    activeTab === 'usuarios' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
                  }`}
                >
                  <ShieldAlert size={16} className="text-red-300 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">Controle Usuários</span>
                </button>

                <button
                  onClick={() => setActiveTab('logs')}
                  className={`sidebar-item w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                    activeTab === 'logs' ? 'bg-white/15 border-white/20 text-white' : 'text-white/75 hover:text-white'
                  }`}
                >
                  <Activity size={16} className="text-red-300" />
                  <span className="text-xs font-bold uppercase tracking-wider">Logs Auditoria</span>
                </button>
              </div>
            )}
          </nav>

          {/* Footer info box */}
          <div className="p-4 border-t border-white/5 bg-black/20 text-center">
            <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">
              Abrigo_Doacoes © 2026
            </p>
            <p className="text-[8px] text-white/25 mt-0.5">
              Aero Suite v1.0.4.R2
            </p>
          </div>
        </aside>
      )}

      {/* MAIN SCREEN WORKSPACE */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar">
        
        {/* TOP GREETING HEADER BAR */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 aero-black-panel rounded-2xl p-4 border-white/15">
          <div className="flex items-center gap-3.5">
            {activeTab !== 'home' ? (
              <button
                onClick={() => setActiveTab('home')}
                className="vista-button px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
              >
                <ArrowLeft size={14} className="text-blue-400" />
                <span>Voltar ao Menu Principal</span>
              </button>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/35">
                  <User size={18} className="text-blue-300" />
                </div>
                <div>
                  <p className="text-xs text-white/60 font-medium">Bom dia, operador(a)</p>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                    {user?.email}
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                      isAdmin ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {user?.role}
                    </span>
                  </h3>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Cronograma Button */}
            {activeTab === 'doadores' && (
              <button
                onClick={() => setIsCronogramaOpen(true)}
                className="hidden lg:flex items-center gap-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 px-4 h-10 rounded-xl text-xs font-bold text-orange-200 transition-all shadow-md cursor-pointer"
              >
                <Calendar size={13} />
                Cronograma
              </button>
            )}

            {/* Clock Banner */}
            <div className="hidden lg:flex items-center gap-2 bg-black/40 px-4 h-10 rounded-xl border border-white/10 text-xs font-bold text-white/80">
              <Calendar size={13} className="text-blue-300" />
              <span>{getFormattedDate()}</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 dark:bg-black/40 border border-white/20 hover:bg-white/20 transition-all text-white cursor-pointer"
              title="Alternar Tema Claro/Escuro"
            >
              {theme === 'dark' ? <Sun size={16} className="text-yellow-300" /> : <Moon size={16} className="text-blue-100" />}
            </button>

            {/* Logout Trigger */}
            <button
              onClick={logout}
              className="px-4 h-10 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-600/30 hover:border-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              title="Sair do Sistema"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE VIEW RENDERING SWITCH */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-fade-in">
            {/* Stat high gloss cards panel */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Stat 1: Donors */}
              <div 
                onClick={() => setActiveTab('doadores')}
                className="glossy-card p-6 rounded-2xl flex flex-col items-center text-center cursor-pointer select-none"
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 shadow-inner mb-3">
                  <span className="text-2xl drop-shadow">👥</span>
                </div>
                <div className="text-4xl font-black text-slate-800 dark:text-white leading-none mb-1 font-mono">
                  {stats.doadoresCount}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-blue-200 uppercase tracking-widest">
                  Doadores Cadastrados
                </div>
              </div>

              {/* Stat 2: Donations */}
              <div 
                onClick={() => setActiveTab('doacoes')}
                className="glossy-card p-6 rounded-2xl flex flex-col items-center text-center cursor-pointer select-none"
              >
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20 shadow-inner mb-3">
                  <span className="text-2xl drop-shadow">🎁</span>
                </div>
                <div className="text-4xl font-black text-slate-800 dark:text-white leading-none mb-1 font-mono">
                  {stats.doacoesCount}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-blue-200 uppercase tracking-widest">
                  Total de Doações
                </div>
              </div>

              {/* Stat 3: Pending */}
              <div 
                onClick={() => setActiveTab('baixa_lote')}
                className="glossy-card p-6 rounded-2xl flex flex-col items-center text-center cursor-pointer select-none"
              >
                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 shadow-inner mb-3">
                  <span className="text-2xl drop-shadow">⌛</span>
                </div>
                <div className="text-4xl font-black text-amber-500 dark:text-amber-400 leading-none mb-1 font-mono">
                  {stats.pendentesCount}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-blue-200 uppercase tracking-widest">
                  Doações Pendentes
                </div>
              </div>

              {/* Stat 4: Discharged */}
              <div 
                onClick={() => setActiveTab('baixa_lote')}
                className="glossy-card p-6 rounded-2xl flex flex-col items-center text-center cursor-pointer select-none"
              >
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-inner mb-3">
                  <span className="text-2xl drop-shadow">✅</span>
                </div>
                <div className="text-4xl font-black text-emerald-500 dark:text-emerald-400 leading-none mb-1 font-mono">
                  {stats.baixadasCount}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-blue-200 uppercase tracking-widest">
                  Doações Baixadas
                </div>
              </div>
            </section>

            {/* Graph distribution & Recent actions logs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* CHART: Recharts Stock distribution */}
              <section className="lg:col-span-8 aero-black-panel rounded-2xl border border-white/10 p-6 flex flex-col justify-between shadow-2xl min-h-[360px]">
                <div>
                  <h3 className="text-white font-bold text-sm tracking-wide uppercase text-glow mb-1">
                    Balanço Físico de Estoque por Categoria
                  </h3>
                  <p className="text-xs text-white/50 mb-6">
                    Total acumulado de bens físicos armazenados na triagem
                  </p>
                </div>

                <div className="h-64 w-full">
                  {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-white/30 italic">
                      Lançamento de cargas inicial pendente para preencher estatísticas.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(15,23,42,0.95)', 
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '11px'
                          }} 
                        />
                        <Bar dataKey="Quantidade" fill="#4da3ff" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#c084fc'][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </section>

              {/* RECENT SYSTEM LOGS FOR RAPID PREVIEW */}
              <section className="lg:col-span-4 aero-black-panel rounded-2xl border border-white/10 p-6 shadow-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-white font-bold text-sm tracking-wide uppercase text-glow mb-4 flex items-center gap-1.5">
                    <Activity size={14} className="text-blue-300" />
                    Atividade Recente
                  </h3>

                  <div className="space-y-3">
                    {recentLogs.length === 0 ? (
                      <p className="text-xs text-white/40 italic">Nenhum log operacional gravado.</p>
                    ) : (
                      recentLogs.map((log, idx) => (
                        <div key={log.id || idx} className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] leading-tight space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-blue-200">{log.modulo}</span>
                            <span className="text-[9px] text-white/35">
                              {log.created_at ? new Date(log.created_at).toLocaleTimeString('pt-BR') : 'Agora'}
                            </span>
                          </div>
                          <p className="text-white font-semibold">{log.acao}</p>
                          <p className="text-white/50 text-[10px] truncate">{log.detalhes}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('logs')}
                  className="w-full mt-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-[10px] uppercase tracking-widest font-bold text-center transition-all border border-white/5 cursor-pointer"
                >
                  Ver Todos os Logs
                </button>
              </section>
            </div>

            {/* BENTO QUICK ACCESS SHADED CARDS */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-white font-bold text-base tracking-wide text-glow">Acesso Rápido aos Módulos</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Shortcut 1 */}
                <div 
                  onClick={() => setActiveTab('doadores')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="text-2xl drop-shadow">👥</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Ficha de Doadores</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Gerencie contatos residenciais, setores de coleta e referências.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 2 */}
                <div 
                  onClick={() => setActiveTab('doacoes')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="text-2xl drop-shadow">🎁</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Controle de Cargas</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Adicione itens físicos recebidos, unidades e categorias.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 3 */}
                <div 
                  onClick={() => setActiveTab('categorias')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="text-2xl drop-shadow">📁</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Categorias / Itens</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Cadastre prefixos de produtos e mantenha o catálogo do abrigo.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 4 */}
                <div 
                  onClick={() => setActiveTab('baixa_lote')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="text-2xl drop-shadow">📥</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Baixas em Lote</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Processe entregas e atualize estoque em cascata.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 5 */}
                <div 
                  onClick={() => setActiveTab('relatorios')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="text-2xl drop-shadow">📄</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Imprimir Fichas</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Consulte por Código e gere folhas físicas de doações.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 6 - Comparativo Regiões */}
                <div 
                  onClick={() => setActiveTab('comparativo_regiao')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BarChart2 size={22} className="text-pink-300" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Comparativo por Região</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Gráfico com distribuição de coletas por região no período.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 7 - Gráficos Estatísticos */}
                <div 
                  onClick={() => setActiveTab('graficos_estatisticos')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BarChart2 size={22} className="text-rose-300" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Gráficos Estatísticos</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Análise mensal de retiradas, remarcações e cancelamentos.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 8 - Relatório Doações */}
                <div 
                  onClick={() => setActiveTab('relatorio_doacoes')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ClipboardList size={22} className="text-indigo-300" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Relatório de Doações</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Filtre por status e imprima comprovantes individuais.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 9 */}
                <div 
                  onClick={() => setActiveTab('mapa')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="text-2xl drop-shadow">🗺️</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Mapa de Doações</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Visão calendário de retiradas e remarcadas.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 7 - Movimentação Estoque */}
                <div 
                  onClick={() => setActiveTab('movimentacoes')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ArrowLeftRight size={22} className="text-orange-300" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Movimentação de Estoque</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Registre entradas, saídas e ajustes de inventário dos itens.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 8 - Veículos */}
                <div 
                  onClick={() => setActiveTab('veiculos')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Car size={22} className="text-cyan-300" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Cadastro de Veículos</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Gerencie a frota de coleta, descrição e placas dos veículos.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 8 - Motoristas */}
                <div 
                  onClick={() => setActiveTab('motoristas')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserCheck size={22} className="text-teal-300" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Cadastro de Motoristas</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Gerencie a frota de coleta e cadastro de condutores.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Shortcut 8 */}
                <div 
                  onClick={() => setActiveTab('status_individual')}
                  className="aero-glass glossy-card p-5 rounded-2xl flex items-center gap-5 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="text-2xl drop-shadow">📝</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Status Individual</h4>
                    <p className="text-[10px] text-slate-600 dark:text-white/60 leading-tight mt-0.5">
                      Gestão detalhada de status e cancelamento.
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-800 dark:text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* SUBMODULES CONTAINER SWITCH */}
        {activeTab === 'doadores' && (
          <Doadores 
            onOpenDoacoes={(codigoDoador) => {
              setPrefilledDoadorId(codigoDoador);
              setActiveTab('doacoes');
            }} 
          />
        )}
        {activeTab === 'doacoes' && (
          <Doacoes 
            prefilledDoadorId={prefilledDoadorId} 
            clearPrefilledDoadorId={() => setPrefilledDoadorId(null)} 
          />
        )}
        {activeTab === 'categorias' && <CategoriasItens />}
        {activeTab === 'baixa_lote' && <BaixaLote />}
        {activeTab === 'relatorios' && <RelatoriosDialog />}
        {activeTab === 'comparativo_regiao' && <ComparativoRegiao />}
        {activeTab === 'graficos_estatisticos' && <GraficosEstatisticos />}
        {activeTab === 'relatorio_doacoes' && <RelatorioDoacoes />}
        {activeTab === 'relacao_doacoes_dia' && <RelacaoDoacoesDia />}
        {activeTab === 'retiradas_complemento' && <RetiradasComplemento />}
        {activeTab === 'mapa' && <MapaDoacoes />}
        {activeTab === 'motoristas' && <Motoristas />}
        {activeTab === 'veiculos' && <Veiculos />}
        {activeTab === 'movimentacoes' && <MovimentacaoEstoque />}
        {activeTab === 'status_individual' && <StatusIndividual />}
        {activeTab === 'usuarios' && <UserManagement onBack={() => setActiveTab('home')} />}
        {activeTab === 'logs' && <LogsSistema />}

        {/* Global Modals */}
        <CronogramaModal isOpen={isCronogramaOpen} onClose={() => setIsCronogramaOpen(false)} />

      </main>
    </div>
  );
};
