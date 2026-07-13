/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Doacao } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Calendar, Search, Printer, CheckSquare, Clock, XCircle, BarChart2, RefreshCw, HelpCircle 
} from 'lucide-react';

interface MonthlyData {
  name: string;
  key: string;
  retiradas: number;
  remarcadas: number;
  canceladas: number;
}

export const GraficosEstatisticos: React.FC = () => {
  const { addLog } = useThemeAuth();
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [dataInicio, setDataInicio] = useState('2025-07-01');
  const [dataFim, setDataFim] = useState('2026-07-12');
  
  const [displayInicio, setDisplayInicio] = useState('2025-07-01');
  const [displayFim, setDisplayFim] = useState('2026-07-12');

  const [totalRetiradas, setTotalRetiradas] = useState(0);
  const [totalRemarcadas, setTotalRemarcadas] = useState(0);
  const [totalCanceladas, setTotalCanceladas] = useState(0);

  const [chartData, setChartData] = useState<MonthlyData[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      let rawDoacoes: Doacao[] = [];

      if (isRealSupabaseConfigured && supabase) {
        const { data: donates } = await supabase.from('doacoes').select('*');
        rawDoacoes = donates || [];
      } else {
        rawDoacoes = dbMock.get<Doacao>('DOACOES');
      }

      setDoacoes(rawDoacoes);
      processStats(rawDoacoes, dataInicio, dataFim);
      
      setDisplayInicio(dataInicio);
      setDisplayFim(dataFim);

    } catch (e: any) {
      console.error('Erro ao ler doações:', e);
    }
    setLoading(false);
  };

  const getActiveDate = (d: Doacao): string => {
    if (d.data_cancelamento) return d.data_cancelamento;
    if (d.remarcado_para) return d.remarcado_para;
    if (d.data_retirada) return d.data_retirada;
    return d.data_doacao || d.data_solicitacao || '';
  };

  const processStats = (
    allDoacoes: Doacao[], 
    start: string, 
    end: string
  ) => {
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T23:59:59');

    const filtered = allDoacoes.filter(d => {
      const activeDateStr = getActiveDate(d);
      if (!activeDateStr) return false;
      const activeDate = new Date(activeDateStr + 'T12:00:00');
      return activeDate >= startDate && activeDate <= endDate;
    });

    let withdrawalsCount = 0;
    let rescheduledCount = 0;
    let cancelledCount = 0;

    filtered.forEach(d => {
      if (d.data_cancelamento) {
        cancelledCount++;
      } else if (d.remarcado_para) {
        rescheduledCount++;
      } else if (d.data_retirada) {
        withdrawalsCount++;
      }
    });

    setTotalRetiradas(withdrawalsCount);
    setTotalRemarcadas(rescheduledCount);
    setTotalCanceladas(cancelledCount);

    const monthsAbbr = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const timeline: MonthlyData[] = [];

    const currentPtr = new Date(start + 'T12:00:00');
    const endPtr = new Date(end + 'T12:00:00');

    currentPtr.setDate(1);
    endPtr.setDate(1);

    let safetyCounter = 0;
    while (currentPtr <= endPtr && safetyCounter < 100) {
      safetyCounter++;
      const year = currentPtr.getFullYear();
      const monthIndex = currentPtr.getMonth();
      const monthStr = String(monthIndex + 1).padStart(2, '0');
      const key = `${year}-${monthStr}`;
      const label = `${monthsAbbr[monthIndex]}/${String(year).slice(-2)}`;

      timeline.push({
        name: label,
        key: key,
        retiradas: 0,
        remarcadas: 0,
        canceladas: 0
      });

      currentPtr.setMonth(currentPtr.getMonth() + 1);
    }

    filtered.forEach(d => {
      const activeDateStr = getActiveDate(d);
      if (!activeDateStr) return;

      const dateObj = new Date(activeDateStr + 'T12:00:00');
      const year = dateObj.getFullYear();
      const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${monthStr}`;

      const matchedMonth = timeline.find(m => m.key === key);
      if (matchedMonth) {
        if (d.data_cancelamento) {
          matchedMonth.canceladas++;
        } else if (d.remarcado_para) {
          matchedMonth.remarcadas++;
        } else if (d.data_retirada) {
          matchedMonth.retiradas++;
        }
      }
    });

    setChartData(timeline);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConsultar = (e: React.FormEvent) => {
    e.preventDefault();
    processStats(doacoes, dataInicio, dataFim);
    setDisplayInicio(dataInicio);
    setDisplayFim(dataFim);

    if (addLog) {
      addLog(
        'Gerou Gráficos Estatísticos',
        'Relatórios / Estatísticas',
        `Consulta estatística de: ${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}`
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:text-black">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-200 uppercase tracking-tight text-glow">
            Gráficos Estatísticos
          </h2>
          <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">
            Análise de movimentação de doações e retiradas
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <div className="w-3.5 h-3.5 rounded-full bg-red-500/90 border border-white/20 shadow-sm animate-pulse" />
          <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/90 border border-white/20 shadow-sm" />
          <div className="w-3.5 h-3.5 rounded-full bg-green-500/90 border border-white/20 shadow-sm" />
        </div>
      </div>

      <section className="aero-glass rounded-2xl p-6 shadow-xl border border-white/10 print:hidden">
        <form onSubmit={handleConsultar} className="flex flex-col md:flex-row items-end gap-6">
          <div className="w-full md:w-auto">
            <label className="block text-blue-800 dark:text-blue-300 font-bold text-[11px] uppercase tracking-wider mb-2">
              📅 Data Início
            </label>
            <input
              type="date"
              required
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="aero-input-gloss w-full md:w-48 h-10 px-4 rounded-xl text-sm"
            />
          </div>

          <div className="w-full md:w-auto">
            <label className="block text-blue-800 dark:text-blue-300 font-bold text-[11px] uppercase tracking-wider mb-2">
              📅 Data Fim
            </label>
            <input
              type="date"
              required
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="aero-input-gloss w-full md:w-48 h-10 px-4 rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              type="submit"
              disabled={loading}
              className="btn-glossy btn-glossy-blue px-6 h-10 rounded-xl flex items-center justify-center gap-2 font-semibold cursor-pointer text-xs uppercase tracking-wider active:scale-95 transition-all w-full"
            >
              {loading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <span>🔍</span>
              )}
              <span>Gerar Gráfico</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn-glossy px-6 h-10 rounded-xl flex items-center justify-center gap-2 font-semibold text-gray-700 dark:text-white/80 cursor-pointer text-xs uppercase tracking-wider active:scale-95 transition-all w-full"
            >
              <span>🖨️</span>
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </form>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="aero-glass rounded-2xl p-6 flex items-center gap-6 border-l-4 border-blue-500 shadow-lg relative overflow-hidden group">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
            <CheckSquare size={28} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest">
              Total Retiradas
            </p>
            <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-1">
              {totalRetiradas}
            </p>
          </div>
        </div>

        <div className="aero-glass rounded-2xl p-6 flex items-center gap-6 border-l-4 border-amber-500 shadow-lg relative overflow-hidden group">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <Clock size={28} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest">
              Total Remarcadas
            </p>
            <p className="text-4xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">
              {totalRemarcadas}
            </p>
          </div>
        </div>

        <div className="aero-glass rounded-2xl p-6 flex items-center gap-6 border-l-4 border-rose-500 shadow-lg relative overflow-hidden group">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            <XCircle size={28} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest">
              Total Canceladas
            </p>
            <p className="text-4xl font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-1">
              {totalCanceladas}
            </p>
          </div>
        </div>

      </section>

      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl print:border-none print:shadow-none">
        
        <div className="bg-gradient-to-b from-white/10 to-transparent p-4 border-b border-white/10 flex items-center gap-2">
          <BarChart2 className="text-blue-500 dark:text-blue-400 animate-pulse" size={18} />
          <h3 className="font-bold text-xs uppercase tracking-widest text-blue-900 dark:text-blue-200">
            Gráfico Mensal — {formatDateBR(displayInicio)} a {formatDateBR(displayFim)}
          </h3>
        </div>

        <div className="p-6 md:p-8 min-h-[440px] flex flex-col justify-between">
          {chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 text-sm">
              <BarChart2 className="mb-2 opacity-50" size={40} />
              Nenhum dado estatístico encontrado para o período selecionado.
            </div>
          ) : (
            <div className="w-full h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="gradientRetiradas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0078d7" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#005fac" stopOpacity={0.7}/>
                    </linearGradient>
                    <linearGradient id="gradientRemarcadas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f39c12" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#d35400" stopOpacity={0.7}/>
                    </linearGradient>
                    <linearGradient id="gradientCanceladas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e74c3c" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#c0392b" stopOpacity={0.7}/>
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }} 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />

                  <Bar 
                    dataKey="retiradas" 
                    name="Doações Retiradas" 
                    fill="url(#gradientRetiradas)" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="remarcadas" 
                    name="Doações Remarcadas" 
                    fill="url(#gradientRemarcadas)" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="canceladas" 
                    name="Doações Canceladas" 
                    fill="url(#gradientCanceladas)" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-6 border-t border-white/5 pt-6 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-md border border-white/20 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Doações Retiradas (Sucesso)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-md border border-white/20 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Doações Remarcadas (Pendentes / Reagendadas)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-md border border-white/20 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Doações Canceladas (Interrompidas)</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
};
