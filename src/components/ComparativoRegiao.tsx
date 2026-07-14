/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock, fetchAllRecords } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Doacao, Doador } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { 
  Calendar, Search, Printer, MapPin, TrendingUp, RefreshCw, BarChart2, Award, ClipboardCheck
} from 'lucide-react';

interface RegiaoStats {
  name: string;
  value: number;
  color: string;
}

const PALETTE = [
  '#ff8c00',
  '#0078d7',
  '#32cd32',
  '#8a2be2',
  '#e21a1a',
  '#708090',
];

export const ComparativoRegiao: React.FC = () => {
  const { user, addLog } = useThemeAuth();
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dataInicio, setDataInicio] = useState('2026-07-01');
  const [dataFim, setDataFim] = useState('2026-07-31');
  
  const [displayInicio, setDisplayInicio] = useState('2026-07-01');
  const [displayFim, setDisplayFim] = useState('2026-07-31');

  const [regiaoStats, setRegiaoStats] = useState<RegiaoStats[]>([]);
  const [totalGeral, setTotalGeral] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      let rawDoacoes: Doacao[] = [];
      let rawDoadores: Doador[] = [];

      if (isRealSupabaseConfigured && supabase) {
        try {
          rawDoacoes = await fetchAllRecords<any>('doacoes', { order: { column: 'codigo_doacao', ascending: true } });
        } catch (e: any) {
          console.error(`ERRO doacoes:`, e);
        }

        const tabelasDoador = ['doadores', 'doador'];
        for (const tbl of tabelasDoador) {
          if (rawDoadores.length > 0) break;
          try {
            const records = await fetchAllRecords<any>(tbl, { order: { column: 'codigo_doador', ascending: true } });
            rawDoadores = records as any;
          } catch (e: any) {
            console.error(`Erro ao buscar ${tbl}:`, e);
          }
        }
      } else {
        rawDoacoes = dbMock.get<Doacao>('DOACOES');
        rawDoadores = dbMock.get<Doador>('DOADORES');
      }

      setDoacoes(rawDoacoes);
      setDoadores(rawDoadores);
      setDisplayInicio(dataInicio);
      setDisplayFim(dataFim);
      calculateStats(rawDoacoes, rawDoadores, dataInicio, dataFim);

    } catch (e: any) {
      console.error('Erro ao ler doações por região:', e);
    }
    setLoading(false);
  };

  const calculateStats = (
    allDoacoes: Doacao[], 
    allDoadores: Doador[], 
    start: string, 
    end: string
  ) => {
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T23:59:59');

    const filtered = allDoacoes.filter(d => {
      if (d.data_cancelamento) return false;

      const dateRetiradaStr = d.data_retirada;
      const dateRemarcadoStr = d.remarcado_para;

      const hasRetiradaInRange = dateRetiradaStr 
        ? new Date(dateRetiradaStr + 'T12:00:00') >= startDate && new Date(dateRetiradaStr + 'T12:00:00') <= endDate
        : false;

      const hasRemarcadoInRange = dateRemarcadoStr
        ? new Date(dateRemarcadoStr + 'T12:00:00') >= startDate && new Date(dateRemarcadoStr + 'T12:00:00') <= endDate
        : false;

      return hasRetiradaInRange || hasRemarcadoInRange;
    });

    const regionCounts: { [key: string]: number } = {};

    filtered.forEach(d => {
      const dAny = d as any;
      const donorId = d.codigo_doador ?? dAny.doador_id ?? dAny.id_doador ?? dAny.codigo_doador_id;

      const donor = allDoadores.find(dn => {
        const dnAny = dn as any;
        const dnId = dn.codigo_doador ?? dnAny.id ?? dnAny.doador_id ?? dnAny.codigo ?? dnAny.numero ?? dnAny.codigo_doador_id;
        return String(dnId) === String(donorId);
      });
      const region = donor?.regiao?.trim() || 'Não Especificada';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    let index = 0;
    const parsed: RegiaoStats[] = Object.keys(regionCounts).map(regionName => {
      const color = PALETTE[index % PALETTE.length];
      index++;
      return {
        name: regionName,
        value: regionCounts[regionName],
        color: color
      };
    });

    parsed.sort((a, b) => b.value - a.value);

    setRegiaoStats(parsed);
    setTotalGeral(filtered.length);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConsultar = (e: React.FormEvent) => {
    e.preventDefault();
    calculateStats(doacoes, doadores, dataInicio, dataFim);
    setDisplayInicio(dataInicio);
    setDisplayFim(dataFim);

    if (addLog) {
      addLog(
        'Consultou Comparativo por Região',
        'Relatórios / Região',
        `Período de consulta: ${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}`
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
      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl print:shadow-none print:border-none print:bg-white">
        <header className="h-14 flex items-center justify-between px-6 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10 print:hidden">
          <div className="flex items-center gap-3">
            <BarChart2 className="text-blue-300 drop-shadow animate-pulse" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide text-glow">
              Comparativo de Doações por Região
            </h2>
          </div>
          <span className="text-[10px] bg-blue-500/20 text-blue-200 px-2.5 py-1 rounded border border-blue-500/30 font-bold uppercase tracking-wider font-mono">
            Totais por Região — Retiradas e Remarcadas
          </span>
        </header>

        <form onSubmit={handleConsultar} className="p-6 md:p-8 space-y-6 print:hidden">
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-1.5 w-full md:w-auto">
              <label className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-400" />
                Data Início
              </label>
              <input
                type="date"
                required
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="aero-input-gloss w-full md:w-48 h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full md:w-auto">
              <label className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-400" />
                Data Fim
              </label>
              <input
                type="date"
                required
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="aero-input-gloss w-full md:w-48 h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                type="submit"
                disabled={loading}
                className="btn-glossy btn-glossy-blue px-8 h-10 rounded-xl flex items-center justify-center gap-2 font-semibold cursor-pointer text-xs uppercase tracking-wider active:scale-95 transition-all w-full md:w-auto"
              >
                {loading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <span>🔍</span>
                )}
                <span>Consultar</span>
              </button>
              
              <button
                type="button"
                onClick={handlePrint}
                className="btn-glossy px-8 h-10 rounded-xl flex items-center justify-center gap-2 font-semibold text-gray-700 dark:text-white/80 cursor-pointer text-xs uppercase tracking-wider active:scale-95 transition-all w-full md:w-auto"
              >
                <span>🖨️</span>
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      <div className="text-center space-y-1 py-4">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-200 uppercase tracking-tight text-glow">
          Comparativo de Doações por Região
        </h2>
        <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">
          Período: {formatDateBR(displayInicio)} – {formatDateBR(displayFim)}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl print:border-none print:shadow-none">
            <header className="h-12 flex items-center px-6 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10">
              <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest">
                Distribuição das Doações
              </span>
            </header>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                <RefreshCw size={20} className="animate-spin text-blue-400" />
                <span>Carregando dados...</span>
              </div>
            ) : regiaoStats.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nenhuma doação registrada com datas de retirada/remarcação neste período.
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-3">Região</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                    {regiaoStats.map(stat => (
                      <tr key={stat.name} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3 font-semibold text-slate-800 dark:text-slate-200">
                          <span 
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" 
                            style={{ backgroundColor: stat.color }}
                          />
                          {stat.name}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-blue-700 dark:text-blue-400 font-mono">
                          {stat.value}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-blue-500/10 font-bold border-t border-white/20">
                      <td className="px-6 py-4 text-sm text-blue-900 dark:text-blue-200">
                        Total Geral
                      </td>
                      <td className="px-6 py-4 text-right text-blue-900 dark:text-blue-200 font-mono text-base">
                        {totalGeral}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 print:hidden">
            <Award className="text-yellow-400 shrink-0 mt-0.5" size={20} />
            <div className="text-xs text-slate-300 space-y-1">
              <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Indicadores de Logística</h4>
              <p className="leading-relaxed">
                Este relatório contabiliza o total de coletas programadas no período. É gerado filtrando as datas de <strong>Retirada Definida</strong> e <strong>Remarcações de Coleta</strong> de cada doação ativa no sistema.
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <div className="aero-black-panel p-6 md:p-10 rounded-2xl border border-white/10 flex flex-col items-center justify-center min-h-[500px] shadow-2xl print:border-none print:shadow-none">
            
            {loading ? (
              <div className="flex flex-col items-center justify-center text-center p-12 space-y-4">
                <RefreshCw size={28} className="animate-spin text-blue-400" />
                <p className="font-bold text-slate-300">Carregando dados...</p>
              </div>
            ) : regiaoStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <MapPin size={28} className="text-slate-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-300">Nenhum dado de gráfico disponível</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Insira um intervalo de datas diferente ou realize novos agendamentos de retirada para visualizar o gráfico comparativo por região.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                
                <div className="w-full h-80 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={regiaoStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={4}
                        dataKey="value"
                        className="outline-none"
                      >
                        {regiaoStats.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            stroke="rgba(255, 255, 255, 0.2)" 
                            strokeWidth={1.5}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '8px',
                          color: '#fff' 
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-extrabold text-blue-900 dark:text-blue-100 font-mono">
                      {totalGeral}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Coletas
                    </span>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-lg">
                  {regiaoStats.map(stat => {
                    const percentage = totalGeral > 0 ? ((stat.value / totalGeral) * 100).toFixed(0) : '0';
                    return (
                      <div 
                        key={stat.name} 
                        className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3 hover:bg-white/10 transition-all"
                      >
                        <span 
                          className="w-3 h-3 rounded-sm shrink-0 border border-white/20" 
                          style={{ backgroundColor: stat.color }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                            {stat.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono font-bold">
                            {stat.value} ({percentage}%)
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
