/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Doacao, Doador, ItemDoacao } from '../types';
import { FichaDoacaoReport } from './FichaDoacaoReport';
import { 
  Printer, FileText, Search, User, Gift, ChevronDown, CheckSquare, 
  ArrowRight, X, AlertCircle, RefreshCw, BarChart2, Calendar, ClipboardList
} from 'lucide-react';

type FilterTab = 'Todas' | 'Pendente' | 'Baixada' | 'Cancelada' | 'Remarcada';

export const RelatorioDoacoes: React.FC = () => {
  const { addLog } = useThemeAuth();
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedTicket, setSelectedTicket] = useState<{
    doacao: Doacao;
    doador?: Doador;
    itens: ItemDoacao[];
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      let rawDoacoes: Doacao[] = [];
      let rawDoadores: Doador[] = [];

      if (isRealSupabaseConfigured && supabase) {
        const { data: donates } = await supabase.from('doacoes').select('*').order('codigo_doacao', { ascending: false });
        const { data: donors } = await supabase.from('doadores').select('*').order('nome');
        rawDoacoes = donates || [];
        rawDoadores = donors || [];
        if (rawDoacoes.length === 0) {
          rawDoacoes = dbMock.get<Doacao>('DOACOES');
          rawDoadores = dbMock.get<Doador>('DOADORES');
        }
      } else {
        rawDoacoes = dbMock.get<Doacao>('DOACOES');
        rawDoadores = dbMock.get<Doador>('DOADORES');
      }

      setDoacoes(rawDoacoes);
      setDoadores(rawDoadores);
    } catch (e: any) {
      console.error('Erro ao ler relatórios de doações:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getDoacaoStatus = (d: Doacao): 'baixada' | 'cancelada' | 'remarcada' | 'pendente' => {
    if (d.data_baixa) return 'baixada';
    if (d.data_cancelamento) return 'cancelada';
    if (d.remarcado_para) return 'remarcada';
    return 'pendente';
  };

  const getStatusLabel = (status: 'baixada' | 'cancelada' | 'remarcada' | 'pendente') => {
    switch (status) {
      case 'baixada': return 'Baixada';
      case 'cancelada': return 'Cancelada';
      case 'remarcada': return 'Remarcada';
      case 'pendente': return 'Pendente';
    }
  };

  const getStatusBadgeClass = (status: 'baixada' | 'cancelada' | 'remarcada' | 'pendente') => {
    switch (status) {
      case 'baixada':
        return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
      case 'cancelada':
        return 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800';
      case 'remarcada':
        return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
      case 'pendente':
        return 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
    }
  };

  const totalRegistros = doacoes.length;
  const totalBaixadas = doacoes.filter(d => getDoacaoStatus(d) === 'baixada').length;
  const totalPendentes = doacoes.filter(d => getDoacaoStatus(d) === 'pendente').length;
  const totalCanceladas = doacoes.filter(d => getDoacaoStatus(d) === 'cancelada').length;
  const totalRemarcadas = doacoes.filter(d => getDoacaoStatus(d) === 'remarcada').length;

  const filteredDoacoes = doacoes.filter(d => {
    const status = getDoacaoStatus(d);
    
    if (activeTab === 'Pendente' && status !== 'pendente') return false;
    if (activeTab === 'Baixada' && status !== 'baixada') return false;
    if (activeTab === 'Cancelada' && status !== 'cancelada') return false;
    if (activeTab === 'Remarcada' && status !== 'remarcada') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeStr = d.codigo_doacao.toString();
      const donorCodeStr = d.codigo_doador?.toString() || '';
      const donor = doadores.find(dn => Number(dn.codigo_doador) === Number(d.codigo_doador));
      const donorName = donor?.nome.toLowerCase() || '';
      
      return codeStr.includes(q) || donorCodeStr.includes(q) || donorName.includes(q);
    }

    return true;
  });

  const handlePrintAll = () => {
    if (addLog) {
      addLog(
        'Imprimiu Relatório Geral de Doações',
        'Relatórios / Doações',
        `Filtro Ativo: ${activeTab}, Registros impressos: ${filteredDoacoes.length}`
      );
    }
    window.print();
  };

  const loadDonationItems = async (codigoDoacao: number): Promise<ItemDoacao[]> => {
    if (isRealSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('itens_doacao')
          .select('*')
          .eq('id_doacao', String(codigoDoacao));
        return data || [];
      } catch { return []; }
    } else {
      const allItems = dbMock.get<ItemDoacao>('ITENS_DOACAO');
      return allItems.filter(i => String(i.id_doacao) === String(codigoDoacao));
    }
  };

  const handlePrintSingle = async (d: Doacao) => {
    let donor = doadores.find(dn => Number(dn.codigo_doador) === Number(d.codigo_doador));

    if (!donor && d.codigo_doador) {
      if (isRealSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase
            .from('doadores')
            .select('*')
            .eq('codigo_doador', Number(d.codigo_doador))
            .single();
          if (data) donor = data as Doador;
        } catch { /* ignore */ }
      } else {
        const allDonors = dbMock.get<Doador>('DOADORES');
        donor = allDonors.find(dn => Number(dn.codigo_doador) === Number(d.codigo_doador));
      }
    }

    const itens = await loadDonationItems(d.codigo_doacao);
    setSelectedTicket({ doacao: d, doador: donor, itens });
    
    if (addLog) {
      addLog(
        'Visualizou Ficha de Doação',
        'Relatórios / Doações',
        `Código da Doação: #${d.codigo_doacao}`
      );
    }
  };

  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('T')) {
      const parts = dateStr.split('T')[0].split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <>
      {selectedTicket && (
        <div className="space-y-8 animate-fade-in print:bg-white print:text-black">
          <section className="aero-glass rounded-2xl border border-white/15 overflow-hidden shadow-xl print:border-none print:shadow-none">
            <header className="px-6 py-4 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10 flex items-center justify-between print:hidden">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Printer size={16} /> Ficha de Doação
              </h3>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-xs px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors cursor-pointer font-bold uppercase tracking-wider"
              >
                Voltar à Lista
              </button>
            </header>

            <div className="print:p-0">
              {selectedTicket.doador ? (
                <FichaDoacaoReport
                  doacao={selectedTicket.doacao}
                  doador={selectedTicket.doador}
                  itens={selectedTicket.itens}
                />
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Doador não encontrado para esta doação.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {!selectedTicket && (
      <div className="space-y-8 animate-fade-in print:bg-white print:text-black">
      <section className="aero-glass-heavy dark:bg-slate-900/50 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-5 border border-white/60 shadow-lg print:hidden">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className="glossy-icon-container p-3.5 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
              Relatório de Doações
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Filtre, analise e visualize os dados do projeto
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Pesquisar por Cód., Doador..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="aero-input-gloss w-full h-10 pl-10 pr-4 rounded-xl text-xs"
          />
        </div>
      </section>

      <nav className="aero-glass p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md print:hidden">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(['Todas', 'Pendente', 'Baixada', 'Cancelada', 'Remarcada'] as FilterTab[]).map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-xl text-xs uppercase font-bold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'aero-button-active text-white' 
                    : 'aero-tab text-slate-600 dark:text-slate-300 hover:bg-white/20'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <button
          onClick={handlePrintAll}
          className="aero-tab px-5 py-2.5 rounded-xl text-xs uppercase font-bold text-slate-700 dark:text-white flex items-center justify-center gap-2 border border-slate-300 dark:border-white/10 hover:bg-white/25 cursor-pointer w-full sm:w-auto"
        >
          <Printer size={14} className="text-blue-500" />
          <span>Imprimir Relatório</span>
        </button>
      </nav>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        
        <div className="aero-glass rounded-2xl p-6 text-center border-b-4 border-blue-500 shadow-lg hover:scale-105 transition-transform duration-200">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">
            Total Registros
          </p>
          <p className="text-4xl md:text-5xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
            {totalRegistros}
          </p>
        </div>

        <div className="aero-glass rounded-2xl p-6 text-center border-b-4 border-emerald-500 shadow-lg hover:scale-105 transition-transform duration-200">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">
            Baixadas/Retiradas
          </p>
          <p className="text-4xl md:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {totalBaixadas}
          </p>
        </div>

        <div className="aero-glass rounded-2xl p-6 text-center border-b-4 border-amber-500 shadow-lg hover:scale-105 transition-transform duration-200">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">
            Pendentes
          </p>
          <p className="text-4xl md:text-5xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
            {totalPendentes}
          </p>
        </div>

        <div className="aero-glass rounded-2xl p-6 text-center border-b-4 border-rose-500 shadow-lg hover:scale-105 transition-transform duration-200">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">
            Canceladas
          </p>
          <p className="text-4xl md:text-5xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
            {totalCanceladas}
          </p>
        </div>

      </section>

      <section className="aero-glass rounded-2xl overflow-hidden shadow-xl border border-white/15">
        <div className="bg-slate-50/50 dark:bg-white/5 px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <ClipboardList className="h-4.5 w-4.5 text-blue-500" />
            <span>Lista de Doações</span>
            <span className="font-normal text-slate-400 dark:text-slate-500 ml-1">
              (Filtro Ativo: {activeTab})
            </span>
          </h3>
          <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
            {filteredDoacoes.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/30 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Cód. Doador</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredDoacoes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">
                    Nenhuma doação encontrada para o filtro ativo.
                  </td>
                </tr>
              ) : (
                filteredDoacoes.map(d => {
                  const donor = doadores.find(dn => Number(dn.codigo_doador) === Number(d.codigo_doador));
                  const status = getDoacaoStatus(d);
                  const activeDate = d.data_baixa || d.remarcado_para || d.data_retirada || d.data_doacao || d.data_solicitacao || '';

                  return (
                    <tr key={d.codigo_doacao} className="hover:bg-slate-500/5 transition-colors">
                      <td className="px-6 py-5 text-blue-600 dark:text-blue-400 font-bold font-mono text-xs">
                        #{String(d.codigo_doacao).padStart(6, '0')}
                      </td>
                      <td className="px-6 py-5 text-slate-800 dark:text-slate-200 font-medium">
                        {donor ? `${String(d.codigo_doador).padStart(6, '0')} - ${donor.nome}` : (d.codigo_doador ? String(d.codigo_doador).padStart(6, '0') : '-')}
                      </td>
                      <td className="px-6 py-5 text-slate-500 dark:text-slate-400 font-semibold text-xs font-mono">
                        {formatDateBR(activeDate)}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`status-badge px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center print:hidden">
                        <button
                          onClick={() => handlePrintSingle(d)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all shadow-sm group cursor-pointer"
                          title="Imprimir Comprovante"
                        >
                          <Printer size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
      )}
    </>
  );
};
