/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock, fetchAllRecords } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Doacao, ItemDoacao, Doador } from '../types';
import { FichaDoacaoReport } from './FichaDoacaoReport';
import { 
  Printer, Search, X, AlertCircle
} from 'lucide-react';

export const RelatoriosDialog: React.FC = () => {
  const { addLog } = useThemeAuth();
  const [filterType, setFilterType] = useState<'doacao' | 'doador'>('doacao');
  const [selectedDoacaoId, setSelectedDoacaoId] = useState<number | ''>('');
  const [selectedDoadorId, setSelectedDoadorId] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  // Lists loaded
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const [itensDoacao, setItensDoacao] = useState<ItemDoacao[]>([]);

  // Selected result for printable sheet
  const [printableData, setPrintableData] = useState<{
    doador: Doador;
    doacao?: Doacao;
    items: ItemDoacao[];
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async (): Promise<{ docs: Doacao[]; donors: Doador[]; items: ItemDoacao[] }> => {
    setIsLoading(true);
    let docs: Doacao[] = [];
    let donors: Doador[] = [];
    let items: ItemDoacao[] = [];

    if (isRealSupabaseConfigured && supabase) {
      try {
        docs = await fetchAllRecords<any>('doacoes', { order: { column: 'codigo_doacao', ascending: false } });
        donors = await fetchAllRecords<any>('doadores', { order: { column: 'nome' } });
        items = await fetchAllRecords<any>('itens_doacao');
      } catch (e: any) {
        console.error('Supabase fetch failed, falling back to dbMock:', e);
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
    return { docs, donors, items };
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGeneratePreview = async () => {
    setErrorMsg(null);
    setPrintableData(null);

    // Dynamic load to make sure we always have the freshest records from the table "doacoes"
    const { docs, donors, items } = await loadData();

    if (filterType === 'doacao') {
      if (!selectedDoacaoId) {
        setErrorMsg('Por favor, digite ou selecione um Código de Doação válido.');
        return;
      }

      setIsLoading(true);
      let activeDoacao: Doacao | undefined;
      let donor: Doador | undefined;
      let itemsFiltered: ItemDoacao[] = [];

      if (isRealSupabaseConfigured && supabase) {
        try {
          // Fetch donation directly
          const { data: dData, error: dErr } = await supabase
            .from('doacoes')
            .select('*')
            .eq('codigo_doacao', Number(selectedDoacaoId))
            .maybeSingle();
          
          if (dErr) throw dErr;
          if (dData) {
            activeDoacao = dData;
            
            // Fetch donor directly
            if (activeDoacao.codigo_doador) {
              const { data: doadData, error: doadErr } = await supabase
                .from('doadores')
                .select('*')
                .eq('codigo_doador', Number(activeDoacao.codigo_doador))
                .maybeSingle();
              if (doadErr) throw doadErr;
              donor = doadData || undefined;
            }

            // Fetch items directly
            const { data: itemsData, error: itemsErr } = await supabase
              .from('itens_doacao')
              .select('*')
              .eq('id_doacao', String(activeDoacao.codigo_doacao));
            if (itemsErr) throw itemsErr;
            itemsFiltered = itemsData || [];
          }
        } catch (err: any) {
          console.error('Direct fetch from Supabase failed:', err);
        }
      }

      // Fallback to local arrays if direct fetch didn't find them or if not using real Supabase
      if (!activeDoacao) {
        activeDoacao = docs.find(d => String(d.codigo_doacao) === String(selectedDoacaoId));
      }
      
      if (activeDoacao) {
        if (!donor && activeDoacao.codigo_doador) {
          donor = donors.find(doad => String(doad.codigo_doador) === String(activeDoacao!.codigo_doador));
        }
        if (itemsFiltered.length === 0) {
          itemsFiltered = items.filter(i => String(i.id_doacao) === String(activeDoacao!.codigo_doacao));
        }
      }

      setIsLoading(false);

      if (!activeDoacao) {
        setErrorMsg(`Doação Código #${selectedDoacaoId} não foi localizada na tabela "doacoes".`);
        return;
      }

      if (!donor) {
        setErrorMsg(`Doador correspondente (Código #${activeDoacao.codigo_doador}) desta doação não foi localizado na tabela "doadores".`);
        return;
      }

      setPrintableData({
        doador: donor,
        doacao: activeDoacao,
        items: itemsFiltered
      });

      addLog('Visualizou Ficha de Doação', 'Relatórios', `Visualizou Ficha da Doação #${activeDoacao.codigo_doacao}`);
    } else {
      // By Donor
      if (!selectedDoadorId) {
        setErrorMsg('Por favor, digite ou selecione um Código de Doador válido.');
        return;
      }

      setIsLoading(true);
      let donorObj: Doador | undefined;
      let lastDoacao: Doacao | undefined;
      let itemsFiltered: ItemDoacao[] = [];

      if (isRealSupabaseConfigured && supabase) {
        try {
          // Fetch donor directly
          const { data: doadData, error: doadErr } = await supabase
            .from('doadores')
            .select('*')
            .eq('codigo_doador', Number(selectedDoadorId))
            .maybeSingle();
          if (doadErr) throw doadErr;
          donorObj = doadData || undefined;

          if (donorObj) {
            // Fetch last donation directly
            const { data: dData, error: dErr } = await supabase
              .from('doacoes')
              .select('*')
              .eq('codigo_doador', Number(donorObj.codigo_doador))
              .order('codigo_doacao', { ascending: false })
              .limit(1);
            if (dErr) throw dErr;
            if (dData && dData.length > 0) {
              lastDoacao = dData[0];

              // Fetch items of this last donation
              const { data: itemsData, error: itemsErr } = await supabase
                .from('itens_doacao')
                .select('*')
                .eq('id_doacao', String(lastDoacao.codigo_doacao));
              if (itemsErr) throw itemsErr;
              itemsFiltered = itemsData || [];
            }
          }
        } catch (err: any) {
          console.error('Direct fetch for donor from Supabase failed:', err);
        }
      }

      // Fallback to local arrays if direct fetch didn't find them or if not using real Supabase
      if (!donorObj) {
        donorObj = donors.find(d => String(d.codigo_doador) === String(selectedDoadorId));
      }
      
      if (donorObj) {
        if (!lastDoacao) {
          lastDoacao = docs.find(doc => String(doc.codigo_doador) === String(donorObj!.codigo_doador));
        }
        if (lastDoacao && itemsFiltered.length === 0) {
          itemsFiltered = items.filter(i => String(i.id_doacao) === String(lastDoacao!.codigo_doacao));
        }
      }

      setIsLoading(false);

      if (!donorObj) {
        setErrorMsg(`Doador Código #${selectedDoadorId} não foi localizado na tabela "doadores".`);
        return;
      }

      setPrintableData({
        doador: donorObj,
        doacao: lastDoacao,
        items: itemsFiltered
      });

      addLog('Visualizou Ficha de Doador', 'Relatórios', `Visualizou Relatório do Doador #${donorObj.codigo_doador}`);
    }
  };

  const handleTriggerPrint = () => {
    // Custom formatted window printing view using standard CSS print styles
    window.print();
    addLog('Imprimiu Ficha de Doações', 'Relatórios', `Imprimiu ficha física.`);
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:text-black">
      
      {/* Search selection Dialogue box */}
      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl print:hidden">
        <header className="h-14 flex items-center justify-between px-6 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10">
          <div className="flex items-center gap-3">
            <Printer className="text-blue-300 drop-shadow animate-pulse" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide text-glow">
              Impressão de Fichas de Recebimento
            </h2>
          </div>
          <span className="text-[10px] bg-white/10 text-white/70 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
            Janela de Diálogo
          </span>
        </header>

        <div className="p-6 md:p-8 space-y-6">
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/10 space-y-5">
            <p className="text-xs text-white/80 font-bold uppercase tracking-wider">
              1. Selecione o critério de emissão do relatório:
            </p>

            {/* Selector Option Radios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label 
                onClick={() => setFilterType('doacao')}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  filterType === 'doacao' 
                    ? 'bg-blue-500/20 border-blue-500/50 text-white' 
                    : 'bg-black/20 border-white/5 text-white/60 hover:text-white'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  filterType === 'doacao' ? 'border-blue-400' : 'border-white/30'
                }`}>
                  {filterType === 'doacao' && <div className="w-2.5 h-2.5 bg-blue-400 rounded-full" />}
                </div>
                <div>
                  <div className="font-bold text-sm">Código de Doação</div>
                  <div className="text-[10px] opacity-75">Imprimir ficha por carga individual recebida</div>
                </div>
              </label>

              <label 
                onClick={() => setFilterType('doador')}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  filterType === 'doador' 
                    ? 'bg-blue-500/20 border-blue-500/50 text-white' 
                    : 'bg-black/20 border-white/5 text-white/60 hover:text-white'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  filterType === 'doador' ? 'border-blue-400' : 'border-white/30'
                }`}>
                  {filterType === 'doador' && <div className="w-2.5 h-2.5 bg-blue-400 rounded-full" />}
                </div>
                <div>
                  <div className="font-bold text-sm">Código de Doador</div>
                  <div className="text-[10px] opacity-75">Imprimir ficha com as últimas doações do doador</div>
                </div>
              </label>
            </div>

            {/* Inputs selection dynamically */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
              {filterType === 'doacao' ? (
                <div className="md:col-span-8 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Código da Doação de Destino</label>
                  <div className="flex gap-2">
                    <input
                      id="input-codigo-doacao"
                      type="number"
                      placeholder="Digite o código da doação livremente..."
                      value={selectedDoacaoId}
                      onChange={e => setSelectedDoacaoId(e.target.value ? Number(e.target.value) : '')}
                      className="aero-input-gloss flex-1 h-11 px-4 rounded-xl text-sm text-white"
                    />
                    <select
                      id="select-codigo-doacao"
                      value={selectedDoacaoId}
                      onChange={e => setSelectedDoacaoId(e.target.value ? Number(e.target.value) : '')}
                      className="aero-input-gloss w-36 h-11 px-3 rounded-xl text-sm cursor-pointer bg-slate-950/80 text-white border border-white/10"
                    >
                      <option value="" className="bg-slate-900 text-white/50">Cód. Doação</option>
                      {doacoes.map(d => (
                        <option key={d.codigo_doacao} value={d.codigo_doacao} className="bg-slate-900 text-white">
                          #{d.codigo_doacao}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="md:col-span-8 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Código do Doador de Destino</label>
                  <div className="flex gap-2">
                    <input
                      id="input-codigo-doador"
                      type="number"
                      placeholder="Digite o código do doador livremente..."
                      value={selectedDoadorId}
                      onChange={e => setSelectedDoadorId(e.target.value ? Number(e.target.value) : '')}
                      className="aero-input-gloss flex-1 h-11 px-4 rounded-xl text-sm text-white"
                    />
                    <select
                      id="select-codigo-doador"
                      value={selectedDoadorId}
                      onChange={e => setSelectedDoadorId(e.target.value ? Number(e.target.value) : '')}
                      className="aero-input-gloss w-36 h-11 px-3 rounded-xl text-sm cursor-pointer bg-slate-950/80 text-white border border-white/10"
                    >
                      <option value="" className="bg-slate-900 text-white/50">Cód. Doador</option>
                      {doadores.map(d => (
                        <option key={d.codigo_doador} value={d.codigo_doador} className="bg-slate-900 text-white">
                          #{d.codigo_doador}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="md:col-span-4 flex items-end">
                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  className="aero-button-primary w-full h-11 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search size={15} />
                  <span>Gerar Ficha Preview</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-100 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PRINT PREVIEW COMPONENT VIEW */}
      {printableData && (
        <section className="bg-white text-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-300 max-w-4xl mx-auto space-y-8 animate-scale-up relative print:p-0 print:shadow-none print:border-none">
          
          {/* Header Action to print - Hidden on browser print */}
          <div className="absolute top-6 right-6 flex gap-3 print:hidden">
            <button
              onClick={() => setPrintableData(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <X size={12} />
              Fechar Ficha
            </button>
            <button
              onClick={handleTriggerPrint}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Printer size={13} />
              Imprimir Doação
            </button>
          </div>

          {printableData.doacao ? (
            <FichaDoacaoReport
              doacao={printableData.doacao}
              doador={printableData.doador}
              itens={printableData.items}
            />
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              Selecione um código de doação para visualizar a ficha detalhada.
            </div>
          )}
        </section>
      )}
    </div>
  );
};
