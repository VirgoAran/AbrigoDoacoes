/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Calendar, X, AlertCircle } from 'lucide-react';

interface CronogramaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CronogramaModal: React.FC<CronogramaModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const scheduleItems = [
    {
      days: 'Seg./Ter./Sex.',
      color: 'bg-blue-600 dark:bg-blue-600 text-blue-50 border-blue-400/30',
      region: 'Penha',
      frequency: 'Semanal',
    },
    {
      days: 'Seg./Ter.',
      color: 'bg-purple-600 dark:bg-purple-600 text-purple-50 border-purple-400/30',
      region: 'Ponte Grande',
      frequency: 'Semanal',
    },
    {
      days: 'Qua.',
      color: 'bg-teal-500 dark:bg-teal-500 text-teal-50 border-teal-300/30',
      region: 'Tatuapé / Sapopemba',
      frequency: 'Semanal',
    },
    {
      days: 'Qui.',
      color: 'bg-orange-700 dark:bg-orange-700 text-orange-50 border-orange-500/30',
      region: 'Itaquera / Zona Sul',
      frequency: 'Quinzenal',
    },
    {
      days: 'Qui.',
      color: 'bg-green-600 dark:bg-green-600 text-green-50 border-green-400/30',
      region: 'Zona Oeste',
      frequency: 'Mensal',
    },
    {
      days: 'Qui.',
      color: 'bg-orange-600 dark:bg-orange-600 text-orange-50 border-orange-400/30',
      region: 'Zona Norte',
      frequency: 'Mensal',
    },
    {
      days: 'Sáb.',
      color: 'bg-red-600 dark:bg-red-600 text-red-50 border-red-400/30',
      region: 'à definir',
      frequency: 'Eventual',
    },
  ];

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 animate-fade-in"
    >
      {/* Main Container - Uses .aero-black-panel for automatic Windows 95 / Windows Vista theme adaptation */}
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-[2rem] overflow-hidden flex flex-col relative border border-slate-200/20 dark:border-white/10 shadow-2xl animate-scale-up aero-black-panel bg-white/95 dark:bg-slate-900/95"
      >
        {/* Decorative Top Gloss overlay */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

        {/* Close Button top-right (accessible helper) */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/70 transition-all cursor-pointer z-20 flex items-center justify-center border border-slate-200/50 dark:border-white/10 shadow-sm"
          title="Fechar"
        >
          <X size={16} />
        </button>

        {/* Header Section */}
        <header className="p-8 pb-4 relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <Calendar className="text-orange-500 dark:text-orange-400 w-8 h-8 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
            <h1 className="text-xl md:text-2xl font-extrabold uppercase tracking-widest text-slate-800 dark:text-white text-glow drop-shadow-md">
              Cronograma de Coleta
            </h1>
          </div>
          <p className="text-[10px] md:text-xs font-bold opacity-75 dark:opacity-50 tracking-wider ml-11 text-slate-600 dark:text-slate-300">
            PLANEJAMENTO SEMANAL / REGIÕES
          </p>
        </header>

        {/* List Section */}
        <div className="px-6 md:px-8 flex flex-col gap-3 mb-6 relative z-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {scheduleItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center p-3 rounded-2xl border border-slate-300/30 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all shadow-sm aero-inner-panel"
            >
              {/* Day Tag */}
              <div
                className={`w-32 h-10 flex items-center justify-center rounded-[12px] font-extrabold text-[11px] md:text-xs mr-4 border uppercase tracking-wider text-center shrink-0 shadow-sm ${item.color}`}
              >
                {item.days}
              </div>

              {/* Region & Frequency */}
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm md:text-base text-slate-800 dark:text-white truncate drop-shadow-sm">
                  {item.region}
                </span>
                <span className="text-[11px] md:text-xs text-slate-500 dark:text-white/50 font-bold">
                  {item.frequency}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Section */}
        <footer className="p-6 pt-0 pb-8 relative z-10 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200/60 dark:bg-black/20 border border-slate-300/40 dark:border-white/5 backdrop-blur-md shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
            <span className="text-[10px] text-slate-500 dark:text-white/50 font-bold uppercase tracking-[0.1em]">
              Sincronizado em tempo real
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
