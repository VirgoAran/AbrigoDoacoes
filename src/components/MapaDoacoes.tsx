/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock, fetchAllRecords } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Doacao, Doador, ItemDoacao } from '../types';
import { 
  Calendar as CalendarIcon, MapPin, Search, X, Loader2, Info, CheckCircle2, AlertCircle, FileText, Gift, User, Phone, Map
} from 'lucide-react';

interface Holiday {
  date: string; // MM-DD
  name: string;
}

const BRAZIL_HOLIDAYS: Holiday[] = [
  { date: '01-01', name: 'Ano Novo' },
  { date: '04-21', name: 'Tiradentes' },
  { date: '05-01', name: 'Dia do Trabalho' },
  { date: '06-04', name: 'Corpus Christi' },
  { date: '09-07', name: 'Independência' },
  { date: '10-12', name: 'Nsa. Sra. Aparecida' },
  { date: '11-02', name: 'Finados' },
  { date: '11-15', name: 'Proclamação da República' },
  { date: '11-20', name: 'Consciência Negra' },
  { date: '12-25', name: 'Natal' }
];

export const MapaDoacoes: React.FC = () => {
  const { addLog } = useThemeAuth();
  
  // Date range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Dynamic collections
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const [itensDoacao, setItensDoacao] = useState<ItemDoacao[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Selected day detail modal state
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayDonations, setSelectedDayDonations] = useState<{
    doacao: Doacao;
    doador?: Doador;
    items: ItemDoacao[];
    type: 'RET' | 'REM';
  }[]>([]);

  // Initialize with current month
  useEffect(() => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    setStartDate(`${yr}-${mo}-01`);
    
    const lastDay = new Date(yr, now.getMonth() + 1, 0).getDate();
    setEndDate(`${yr}-${mo}-${String(lastDay).padStart(2, '0')}`);
  }, []);

  // Load backend data
  const loadData = async () => {
    setIsLoading(true);
    let docs: Doacao[] = [];
    let donors: Doador[] = [];
    let items: ItemDoacao[] = [];

    if (isRealSupabaseConfigured && supabase) {
      try {
        docs = await fetchAllRecords<any>('doacoes');
        donors = await fetchAllRecords<any>('doadores');
        items = await fetchAllRecords<any>('itens_doacao');
      } catch (e: any) {
        console.error('Supabase fetch failed in MapaDoacoes, falling back to dbMock:', e);
        docs = dbMock.get<Doacao>('DOACOES');
        donors = dbMock.get<Doador>('DOADORES');
        items = dbMock.get<ItemDoacao>('ITENS_DOACAO');
      }
    } else {
      docs = dbMock.get<Doacao>('DOACOES');
      donors = dbMock.get<Doador>('DOADORES');
      items = dbMock.get<ItemDoacao>('ITENS_DOACAO');
    }

    setDoacoes(docs);
    setDoadores(donors);
    setItensDoacao(items);
    setIsLoading(false);
  };

  useEffect(() => {
    if (startDate && endDate) {
      loadData();
    }
  }, [startDate, endDate]);

  const handleClear = () => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    setStartDate(`${yr}-${mo}-01`);
    const lastDay = new Date(yr, now.getMonth() + 1, 0).getDate();
    setEndDate(`${yr}-${mo}-${String(lastDay).padStart(2, '0')}`);
  };

  const getHoliday = (date: Date): string | null => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const key = `${month}-${day}`;
    const found = BRAZIL_HOLIDAYS.find(h => h.date === key);
    return found ? found.name : null;
  };

  // Date strings conversion utilities
  const formatDateString = (d: Date) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  };

  const formatShortLabel = (d: Date) => {
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
  };

  // Generate the list of weekdays (Mon-Fri) grouped into calendar rows
  const generateCalendarWeeks = () => {
    if (!startDate || !endDate) return [];
    
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    // Find the Monday of the week containing start date
    const firstMonday = new Date(start);
    const dayOfWeek = firstMonday.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    firstMonday.setDate(firstMonday.getDate() + diffToMonday);

    // Find the Friday of the week containing end date
    const lastFriday = new Date(end);
    const endDayOfWeek = lastFriday.getDay();
    const diffToFriday = endDayOfWeek === 0 ? -2 : 5 - endDayOfWeek;
    lastFriday.setDate(lastFriday.getDate() + diffToFriday);

    const weeks: { label: string; days: (Date | null)[] }[] = [];
    let currentMonday = new Date(firstMonday);
    let weekNum = 1;

    while (currentMonday <= lastFriday) {
      const weekDays: (Date | null)[] = [];
      for (let i = 0; i < 5; i++) {
        const day = new Date(currentMonday);
        day.setDate(day.getDate() + i);
        
        // Include day if it's within [start, end]
        if (day >= start && day <= end) {
          weekDays.push(day);
        } else {
          weekDays.push(null);
        }
      }

      if (weekDays.some(d => d !== null)) {
        weeks.push({
          label: `S${String(weekNum).padStart(2, '0')}`,
          days: weekDays
        });
        weekNum++;
      }

      currentMonday.setDate(currentMonday.getDate() + 7);
    }

    return weeks;
  };

  const weeks = generateCalendarWeeks();

  // Helper: Count of RET / REM on a specific date
  const getDayCounts = (dateStr: string) => {
    // Retirada matches data_retirada field
    const retCount = doacoes.filter(d => d.data_retirada === dateStr && !d.data_cancelamento).length;
    // Remarcada matches remarcado_para field
    const remCount = doacoes.filter(d => d.remarcado_para === dateStr && !d.data_cancelamento).length;
    return { retCount, remCount };
  };

  // Computed overall KPIs in selected range
  const computedKpis = React.useMemo(() => {
    if (!startDate || !endDate) return { retTotal: 0, remTotal: 0, weekdaysCount: 0 };
    
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    // Count weekdays in range
    let weekdaysCount = 0;
    let temp = new Date(start);
    while (temp <= end) {
      const day = temp.getDay();
      if (day !== 0 && day !== 6) {
        weekdaysCount++;
      }
      temp.setDate(temp.getDate() + 1);
    }

    const retTotal = doacoes.filter(d => {
      if (!d.data_retirada || d.data_cancelamento) return false;
      const dDate = new Date(d.data_retirada + 'T00:00:00');
      return dDate >= start && dDate <= end;
    }).length;

    const remTotal = doacoes.filter(d => {
      if (!d.data_remarcado_para && !d.remarcado_para) return false;
      const rStr = d.remarcado_para || d.data_retirada; // Fallback
      if (!rStr || d.data_cancelamento) return false;
      const rDate = new Date(rStr + 'T00:00:00');
      return rDate >= start && rDate <= end;
    }).length;

    return { retTotal, remTotal, weekdaysCount };
  }, [startDate, endDate, doacoes]);

  // Click on a day grid cell
  const handleDayClick = (date: Date) => {
    const dateStr = formatDateString(date);
    
    // Find all matching donations
    const rets = doacoes.filter(d => d.data_retirada === dateStr && !d.data_cancelamento).map(d => ({
      doacao: d,
      doador: doadores.find(doad => doad.codigo_doador === d.codigo_doador),
      items: itensDoacao.filter(item => String(item.id_doacao) === String(d.codigo_doacao)),
      type: 'RET' as const
    }));

    const rems = doacoes.filter(d => d.remarcado_para === dateStr && !d.data_cancelamento).map(d => ({
      doacao: d,
      doador: doadores.find(doad => doad.codigo_doador === d.codigo_doador),
      items: itensDoacao.filter(item => String(item.id_doacao) === String(d.codigo_doacao)),
      type: 'REM' as const
    }));

    setSelectedDay(date);
    setSelectedDayDonations([...rets, ...rems]);
    addLog('Visualizou Mapa de Coletas', 'Doações', `Consultou dia útil ${dateStr}`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-white">
      {/* Header section (Parity style from SCREEN_29) */}
      <header className="aero-black-panel rounded-2xl p-6 border-white/15">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/25 shadow-inner">
              <Map className="text-4xl text-blue-400 drop-shadow animate-pulse" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-glow leading-none tracking-tight">
                Mapa das Doações
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-white/70 mt-1 uppercase tracking-[0.2em] font-bold">
                Visão calendário — Retiradas e Remarcadas por dia útil
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters & Dynamic KPIs (Vista/Win95 compatible grid) */}
      <section className="aero-black-panel rounded-2xl p-6 border-white/15 flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-wrap items-end gap-6 relative z-10 w-full md:w-auto">
          {/* Start Date */}
          <div className="space-y-2 w-full sm:w-auto">
            <label className="text-[11px] font-bold text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-1 opacity-80">
              <CalendarIcon size={12} className="text-blue-400" /> Data Início
            </label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="aero-input-gloss h-10 px-4 rounded-xl text-sm w-full sm:w-48 text-slate-900 dark:text-white"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2 w-full sm:w-auto">
            <label className="text-[11px] font-bold text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-1 opacity-80">
              <CalendarIcon size={12} className="text-blue-400" /> Data Fim
            </label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="aero-input-gloss h-10 px-4 rounded-xl text-sm w-full sm:w-48 text-slate-900 dark:text-white"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={loadData}
              className="aero-button-primary px-8 h-10 rounded-xl flex items-center gap-2 text-sm justify-center font-bold flex-1 sm:flex-initial"
            >
              <Search size={16} />
              Gerar Mapa
            </button>
            <button 
              onClick={handleClear}
              className="vista-button px-6 h-10 rounded-xl flex items-center gap-2 text-sm justify-center font-bold flex-1 sm:flex-initial bg-slate-200 dark:bg-slate-800/40"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Live Status Summary Card */}
        <div className="flex flex-wrap gap-3 relative z-10">
          <div className="flex items-center gap-3 bg-black/5 dark:bg-black/35 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shadow-inner">
            <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-bold shadow-md">
              {computedKpis.retTotal}
            </span>
            <span className="text-[11px] font-bold text-slate-700 dark:text-white/80 uppercase tracking-tight">Retiradas no Período</span>
          </div>
          <div className="flex items-center gap-3 bg-black/5 dark:bg-black/35 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shadow-inner">
            <span className="bg-rose-600 text-white w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-bold shadow-md">
              {computedKpis.remTotal}
            </span>
            <span className="text-[11px] font-bold text-slate-700 dark:text-white/80 uppercase tracking-tight">Remarcadas</span>
          </div>
        </div>
      </section>

      {/* Dynamic Grid Container */}
      <section className="aero-black-panel rounded-2xl overflow-hidden shadow-2xl relative border-white/15">
        {/* Title & Summary Bar */}
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/5 dark:bg-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <CalendarIcon className="text-slate-500 dark:text-white/80" size={18} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
              {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''} a {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
            </h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 px-3 py-1.5 rounded-full border border-blue-400/30">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
              <span className="text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-tighter">Total Retiradas: {computedKpis.retTotal}</span>
            </div>
            <div className="flex items-center gap-2 bg-rose-100 dark:bg-rose-900/40 px-3 py-1.5 rounded-full border border-rose-400/30">
              <span className="w-2.5 h-2.5 bg-rose-600 rounded-full"></span>
              <span className="text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-tighter">Total Remarcadas: {computedKpis.remTotal}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-3 py-1.5 rounded-full border border-slate-300 dark:border-white/20">
              <span className="text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-tighter">Dias Úteis: {computedKpis.weekdaysCount}</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid Section */}
        <div className="p-6 relative z-10 overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-xs text-slate-500 dark:text-white/60">Buscando cronogramas e rotas de coleta...</p>
            </div>
          ) : weeks.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Info className="mx-auto text-slate-400" size={32} />
              <p className="text-sm font-bold text-slate-700 dark:text-white">Nenhum dia útil gerado.</p>
              <p className="text-xs text-slate-500 dark:text-white/60">Selecione um intervalo de datas válido para renderizar o calendário.</p>
            </div>
          ) : (
            <div className="min-w-[800px] border border-slate-300 dark:border-white/10 rounded-xl overflow-hidden bg-white/40 dark:bg-black/20">
              {/* Header Columns */}
              <div className="grid grid-cols-[60px_repeat(5,_1fr)] border-b border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 font-bold uppercase tracking-wider text-[10px] text-slate-700 dark:text-white/70">
                <div className="p-3 text-center border-r border-slate-300 dark:border-white/10">Sem.</div>
                <div className="p-3 text-center border-r border-slate-300 dark:border-white/10">Segunda-Feira</div>
                <div className="p-3 text-center border-r border-slate-300 dark:border-white/10">Terça-Feira</div>
                <div className="p-3 text-center border-r border-slate-300 dark:border-white/10">Quarta-Feira</div>
                <div className="p-3 text-center border-r border-slate-300 dark:border-white/10">Quinta-Feira</div>
                <div className="p-3 text-center">Sexta-Feira</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-300 dark:divide-white/10">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-cols-[60px_repeat(5,_1fr)] min-h-[110px]">
                    {/* Week Label */}
                    <div className="bg-slate-200 dark:bg-black/30 flex items-center justify-center font-mono text-[11px] font-bold text-slate-600 dark:text-white/50 border-r border-slate-300 dark:border-white/10">
                      {week.label}
                    </div>

                    {/* Weekdays */}
                    {week.days.map((day, dIdx) => {
                      if (!day) {
                        return (
                          <div 
                            key={dIdx} 
                            className={`bg-slate-100/50 dark:bg-black/40 border-r last:border-r-0 border-slate-300 dark:border-white/5`}
                          />
                        );
                      }

                      const dateStr = formatDateString(day);
                      const { retCount, remCount } = getDayCounts(dateStr);
                      const holidayName = getHoliday(day);
                      const hasEvents = retCount > 0 || remCount > 0;

                      return (
                        <div 
                          key={dIdx} 
                          onClick={() => handleDayClick(day)}
                          className={`p-3 border-r last:border-r-0 border-slate-300 dark:border-white/10 flex flex-col justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer relative group ${
                            holidayName ? 'bg-amber-50 dark:bg-blue-950/20' : 'bg-white dark:bg-black/10'
                          }`}
                        >
                          {/* Day marker */}
                          <div className="flex justify-between items-start">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              holidayName ? 'text-amber-700 dark:text-blue-300' : 'text-slate-500 dark:text-white/50'
                            }`}>
                              {formatShortLabel(day)}
                            </span>

                            {holidayName && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-blue-400 shadow-md"></span>
                            )}
                          </div>

                          {/* Content elements inside day cell */}
                          {holidayName ? (
                            <div className="my-1.5 p-1 bg-amber-100 dark:bg-blue-900/30 rounded border border-amber-200 dark:border-blue-500/20 text-center">
                              <p className="text-[8px] font-bold uppercase text-amber-800 dark:text-blue-300 tracking-wider truncate">
                                {holidayName}
                              </p>
                            </div>
                          ) : (
                            <div className="my-2 flex flex-col gap-1 items-center justify-center">
                              <div className="flex items-center gap-1.5 w-full justify-center">
                                <span className={`text-lg font-black ${retCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-white/10'}`}>
                                  {retCount}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 dark:text-white/30 uppercase">RET.</span>
                              </div>
                              <div className="flex items-center gap-1.5 w-full justify-center">
                                <span className={`text-lg font-black ${remCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-300 dark:text-white/10'}`}>
                                  {remCount}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 dark:text-white/30 uppercase">REM.</span>
                              </div>
                            </div>
                          )}

                          {/* Bottom Hover Interaction Banner */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 right-2 text-[8px] uppercase tracking-wider font-extrabold text-blue-500 dark:text-blue-400">
                            Ver Detalhes
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Click-on-day details lookup modal (Classic Vista/Windows dialog) */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="aero-black-panel w-full max-w-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] bg-slate-100 dark:bg-slate-950">
            {/* Modal Titlebar */}
            <div className="p-4 border-b border-white/10 bg-slate-200 dark:bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="text-blue-500 dark:text-blue-400" size={18} />
                <h3 className="font-bold text-sm tracking-wide text-slate-900 dark:text-white">
                  Cronograma de Coleta — {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedDay(null)}
                className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-700 dark:text-white transition-transform active:scale-90"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {selectedDayDonations.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-white/40">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Nenhum agendamento para este dia útil</p>
                  <p className="text-xs text-slate-500 dark:text-white/50">Não há retiradas ou remarcações de doações cadastradas nesta data.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-white/60">
                    Encontrado(s) <span className="font-bold text-slate-900 dark:text-white">{selectedDayDonations.length}</span> agendamento(s) para este dia:
                  </p>

                  <div className="space-y-3">
                    {selectedDayDonations.map(({ doacao, doador, items, type }, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border flex flex-col gap-3 transition-shadow hover:shadow-md ${
                          type === 'REM' 
                            ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/20' 
                            : 'bg-blue-500/5 dark:bg-blue-950/20 border-blue-200 dark:border-blue-500/20'
                        }`}
                      >
                        {/* Title of row */}
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                type === 'REM' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              }`}>
                                {type === 'REM' ? 'Remarcado' : 'Retirada'}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Doação #{doacao.codigo_doacao}
                              </span>
                            </div>

                            <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                              <User size={14} className="text-slate-400" />
                              {doador ? doador.nome : 'Doador não especificado'}
                              {doador && (
                                <span className="font-mono text-xs font-normal text-slate-400">
                                  (Doador #{doador.codigo_doador})
                                </span>
                              )}
                            </h4>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Colaborador</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-white">
                              {doacao.responsavel || 'Não definido'}
                            </span>
                          </div>
                        </div>

                        {/* Donor Details: Phone and Address */}
                        {doador && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-black/5 dark:bg-black/25 p-2.5 rounded-lg border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-white/70">
                              <Phone size={12} className="text-slate-400" />
                              <span>{doador.celular || doador.fixo || 'Sem telefone'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-white/70">
                              <MapPin size={12} className="text-slate-400" />
                              <span className="truncate">
                                {doador.logradouro || doador.endereco || 'Sem endereço'} - {doador.bairro || ''} ({doador.cidade || ''})
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Items listed */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Gift size={11} /> Itens da Carga
                          </span>
                          {items.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic pl-1">Nenhum item físico detalhado nesta doação.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                              {items.map((item, itemIdx) => (
                                <div key={itemIdx} className="text-[11px] flex justify-between bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2 py-1 rounded">
                                  <span className="text-slate-700 dark:text-white/80 font-medium truncate max-w-[150px]">
                                    {item.item}
                                  </span>
                                  <span className="font-mono text-blue-600 dark:text-blue-300 font-bold whitespace-nowrap pl-2">
                                    {item.qtde} {item.unidade}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Obs row if exists */}
                        {doacao.observacoes && (
                          <div className="text-[11px] bg-amber-50 dark:bg-amber-500/5 text-amber-800 dark:text-amber-200 border border-amber-200/40 dark:border-amber-500/10 p-2 rounded-lg">
                            <span className="font-bold">Observações: </span>
                            {doacao.observacoes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-200 dark:bg-white/5 flex justify-end">
              <button 
                onClick={() => setSelectedDay(null)}
                className="vista-button px-6 py-2 rounded-xl text-xs font-bold bg-slate-300 dark:bg-slate-800"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
