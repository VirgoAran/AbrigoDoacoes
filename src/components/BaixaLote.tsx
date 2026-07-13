/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock, fetchAllRecords } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Doacao, ItemDoacao, ItemCatalogo, Doador } from '../types';
import { 
  CheckSquare, Square, RefreshCw, Layers, ArrowDownCircle, 
  ArrowUpCircle, Info, Search, ShieldCheck, HelpCircle
} from 'lucide-react';

export const BaixaLote: React.FC = () => {
  const { addLog } = useThemeAuth();
  const [loading, setLoading] = useState(false);
  const [donations, setDonations] = useState<Doacao[]>([]);
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'pendentes' | 'baixadas'>('pendentes');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    if (isRealSupabaseConfigured && supabase) {
      try {
        const docs = await fetchAllRecords<any>('doacoes', { order: { column: 'codigo_doacao', ascending: false } });
        const donors = await fetchAllRecords<any>('doadores');
        setDonations(docs || []);
        setDoadores(donors || []);
      } catch (e: any) {
        console.error(e);
        showMsg('error', 'Erro ao carregar dados do Supabase: ' + e.message);
      }
    } else {
      setDonations(dbMock.get<Doacao>('DOACOES'));
      setDoadores(dbMock.get<Doador>('DOADORES'));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    setSelectedIds([]);
  }, [activeSubTab]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Select / Deselect All
  const handleSelectAll = (filteredList: Doacao[]) => {
    const visibleIds = filteredList.map(d => d.codigo_doacao);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // BATCH PROCESS CHECKOUT
  const handleBatchCheckout = async () => {
    if (selectedIds.length === 0) {
      showMsg('error', 'Selecione pelo menos uma doação para processar a baixa!');
      return;
    }

    setLoading(true);
    const todayStr = new Date().toISOString().split('T')[0];
    let successCount = 0;

    try {
      if (isRealSupabaseConfigured && supabase) {
        for (const code of selectedIds) {
          // 1. Get donation items
          const { data: items } = await supabase
            .from('itens_doacao')
            .select('*')
            .eq('id_doacao', String(code));

          // 2. Add each item's qty to the stock catalog
          if (items && items.length > 0) {
            for (const item of items) {
              if (item.codigo_item && item.qtde) {
                // Fetch current stock
                const { data: catItem } = await supabase
                  .from('itens')
                  .select('qtde')
                  .eq('codigo_completo', item.codigo_item)
                  .single();
                
                const currentQty = catItem?.qtde || 0;
                await supabase
                  .from('itens')
                  .update({ qtde: currentQty + item.qtde })
                  .eq('codigo_completo', item.codigo_item);

                // Insert into movimentacoes log
                await supabase.from('movimentacoes').insert({
                  codigo_completo: item.codigo_item,
                  tipo: 'Entrada',
                  quantidade: item.qtde,
                  motivo: `Baixa de doação em lote #${code}`
                });
              }
            }
          }

          // 3. Update donation status (set data_baixa)
          await supabase
            .from('doacoes')
            .update({ data_baixa: todayStr })
            .eq('codigo_doacao', code);
          
          successCount++;
        }
      } else {
        // Mock Implementation
        const mockDonations = dbMock.get<Doacao>('DOACOES');
        const mockCatalog = dbMock.get<ItemCatalogo>('ITENS');
        const mockDonationItems = dbMock.get<ItemDoacao>('ITENS_DOACAO');
        const mockMovs = dbMock.get<any>('MOVIMENTACOES');

        for (const code of selectedIds) {
          // Get items
          const items = mockDonationItems.filter(i => String(i.id_doacao) === String(code));
          
          // Increment stock
          items.forEach(item => {
            mockCatalog.forEach(p => {
              if (p.codigo_completo === item.codigo_item) {
                p.qtde = (p.qtde || 0) + (item.qtde || 0);
              }
            });

            // Log movement
            mockMovs.push({
              id: crypto.randomUUID(),
              codigo_completo: item.codigo_item,
              tipo: 'Entrada',
              quantidade: item.qtde,
              motivo: `Baixa de doação em lote #${code} (Demo)`,
              created_at: new Date().toISOString()
            });
          });

          // Set date baja
          mockDonations.forEach(d => {
            if (d.codigo_doacao === code) {
              d.data_baixa = todayStr;
            }
          });

          successCount++;
        }

        dbMock.save('DOACOES', mockDonations);
        dbMock.save('ITENS', mockCatalog);
        dbMock.save('MOVIMENTACOES', mockMovs);
      }

      await addLog('Baixa Doações em Lote', 'Estoque', `Baixou ${successCount} doações. Códigos: ${selectedIds.join(', ')}`);
      showMsg('success', `${successCount} doações foram baixadas com sucesso e o saldo físico de estoque atualizado!`);
      setSelectedIds([]);
      loadData();
    } catch (e: any) {
      console.error(e);
      showMsg('error', 'Erro durante processamento de baixa: ' + e.message);
    }
    setLoading(false);
  };

  // BATCH PROCESS REVERT (Estorno)
  const handleBatchRevert = async () => {
    if (selectedIds.length === 0) {
      showMsg('error', 'Selecione pelo menos uma doação para estornar a baixa!');
      return;
    }

    setLoading(true);
    let successCount = 0;

    try {
      if (isRealSupabaseConfigured && supabase) {
        for (const code of selectedIds) {
          // 1. Get donation items
          const { data: items } = await supabase
            .from('itens_doacao')
            .select('*')
            .eq('id_doacao', String(code));

          // 2. Subtract each item's qty from stock
          if (items && items.length > 0) {
            for (const item of items) {
              if (item.codigo_item && item.qtde) {
                // Fetch current stock
                const { data: catItem } = await supabase
                  .from('itens')
                  .select('qtde')
                  .eq('codigo_completo', item.codigo_item)
                  .single();
                
                const currentQty = catItem?.qtde || 0;
                // Avoid falling below 0
                const newQty = Math.max(0, currentQty - item.qtde);

                await supabase
                  .from('itens')
                  .update({ qtde: newQty })
                  .eq('codigo_completo', item.codigo_item);

                // Log movement
                await supabase.from('movimentacoes').insert({
                  codigo_completo: item.codigo_item,
                  tipo: 'Saída',
                  quantidade: item.qtde,
                  motivo: `Estorno de baixa em lote #${code}`
                });
              }
            }
          }

          // 3. Clear data_baixa
          await supabase
            .from('doacoes')
            .update({ data_baixa: null })
            .eq('codigo_doacao', code);
          
          successCount++;
        }
      } else {
        // Mock Implementation
        const mockDonations = dbMock.get<Doacao>('DOACOES');
        const mockCatalog = dbMock.get<ItemCatalogo>('ITENS');
        const mockDonationItems = dbMock.get<ItemDoacao>('ITENS_DOACAO');
        const mockMovs = dbMock.get<any>('MOVIMENTACOES');

        for (const code of selectedIds) {
          // Get items
          const items = mockDonationItems.filter(i => String(i.id_doacao) === String(code));
          
          // Decrement stock
          items.forEach(item => {
            mockCatalog.forEach(p => {
              if (p.codigo_completo === item.codigo_item) {
                p.qtde = Math.max(0, (p.qtde || 0) - (item.qtde || 0));
              }
            });

            // Log movement
            mockMovs.push({
              id: crypto.randomUUID(),
              codigo_completo: item.codigo_item,
              tipo: 'Saída',
              quantidade: item.qtde,
              motivo: `Estorno de baixa em lote #${code} (Demo)`,
              created_at: new Date().toISOString()
            });
          });

          // Revert date
          mockDonations.forEach(d => {
            if (d.codigo_doacao === code) {
              d.data_baixa = '';
            }
          });

          successCount++;
        }

        dbMock.save('DOACOES', mockDonations);
        dbMock.save('ITENS', mockCatalog);
        dbMock.save('MOVIMENTACOES', mockMovs);
      }

      await addLog('Estorno Baixas em Lote', 'Estoque', `Estornou ${successCount} doações. Códigos: ${selectedIds.join(', ')}`);
      showMsg('success', `${successCount} doações foram estornadas com sucesso e o saldo de estoque foi corrigido!`);
      setSelectedIds([]);
      loadData();
    } catch (e: any) {
      console.error(e);
      showMsg('error', 'Erro durante estorno: ' + e.message);
    }
    setLoading(false);
  };

  // Filter list based on criteria
  const getFilteredList = () => {
    return donations.filter(d => {
      // Tab filter
      const matchesTab = activeSubTab === 'pendentes' 
        ? !d.data_baixa && !d.data_cancelamento
        : !!d.data_baixa;

      // Text search
      const donorObj = doadores.find(doad => doad.codigo_doador === d.codigo_doador);
      const donorName = donorObj ? donorObj.nome.toLowerCase() : '';
      const matchesSearch = String(d.codigo_doacao).includes(searchFilter) ||
                            donorName.includes(searchFilter.toLowerCase()) ||
                            (d.responsavel && d.responsavel.toLowerCase().includes(searchFilter.toLowerCase()));

      return matchesTab && matchesSearch;
    });
  };

  const filteredList = getFilteredList();
  const allSelectedOnTab = filteredList.length > 0 && filteredList.every(d => selectedIds.includes(d.codigo_doacao));

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Alert Notification */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg transition-all ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' 
            : 'bg-red-500/20 border-red-500/30 text-red-100'
        }`}>
          {statusMessage.type === 'success' ? <ShieldCheck className="text-emerald-400 mt-0.5" size={18} /> : <Info className="text-red-400 mt-0.5" size={18} />}
          <div>
            <p className="font-bold text-sm">{statusMessage.type === 'success' ? 'Sucesso!' : 'Alerta'}</p>
            <p className="text-xs mt-0.5 opacity-90">{statusMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <header className="h-14 flex items-center justify-between px-6 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10">
          <div className="flex items-center gap-3">
            <Layers className="text-blue-300 drop-shadow" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide text-glow">
              Painel de Baixa de Doações em Lote
            </h2>
          </div>
          <span className="text-[10px] bg-white/10 text-white/70 px-2.5 py-1 rounded border border-white/10 font-bold uppercase tracking-wider font-mono">
            Processamento em Lote
          </span>
        </header>

        <div className="p-6 md:p-8 space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-4 text-xs text-blue-200 leading-relaxed flex gap-3">
            <Info size={16} className="text-blue-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Efeito Cascata no Estoque Físico:</p>
              Ao selecionar múltiplas cargas de doação e confirmar a baixa, o sistema atualizará automaticamente 
              o saldo do catálogo de itens de cada produto que compõe a carga recebida, emitindo as movimentações 
              de entrada. No estorno, a quantidade correspondente é deduzida de forma segura.
            </div>
          </div>

          {/* Subtab Selectors */}
          <div className="flex gap-2 border-b border-white/15 pb-3">
            <button
              onClick={() => setActiveSubTab('pendentes')}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'pendentes' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-inner' 
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              <ArrowDownCircle size={14} />
              Cargas Pendentes de Baixa
            </button>
            <button
              onClick={() => setActiveSubTab('baixadas')}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'baixadas' 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/40 shadow-inner' 
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              <ArrowUpCircle size={14} />
              Cargas Já Baixadas (Estorno)
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Buscar por código ou doador..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="aero-input-gloss w-full h-10 pl-10 pr-4 rounded-xl text-sm"
              />
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              {activeSubTab === 'pendentes' ? (
                <button
                  onClick={handleBatchCheckout}
                  disabled={selectedIds.length === 0 || loading}
                  className="aero-button-primary w-full sm:w-auto px-8 h-10 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <ArrowDownCircle size={14} />}
                  <span>Processar Baixa ({selectedIds.length})</span>
                </button>
              ) : (
                <button
                  onClick={handleBatchRevert}
                  disabled={selectedIds.length === 0 || loading}
                  className="vista-button w-full sm:w-auto px-8 h-10 rounded-xl text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45 !bg-amber-400 !border-amber-500"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <ArrowUpCircle size={14} />}
                  <span>Estornar Baixas ({selectedIds.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/10 text-left border-b border-white/10 font-mono text-[9px] uppercase tracking-wider text-white/50">
                  <th className="p-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(filteredList)}
                      className="p-1 hover:text-white transition-colors cursor-pointer"
                      title="Selecionar Todos"
                    >
                      {allSelectedOnTab ? (
                        <CheckSquare className="text-blue-300" size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Doação Código</th>
                  <th className="p-4">Doador</th>
                  <th className="p-4">Data Registro</th>
                  <th className="p-4">Responsável</th>
                  <th className="p-4">{activeSubTab === 'pendentes' ? 'Status' : 'Data Baixa'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-white/90">
                {loading && filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-white/50">
                      <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                      Processando solicitações...
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-white/40 italic">
                      Nenhuma carga localizada nesta categoria.
                    </td>
                  </tr>
                ) : (
                  filteredList.map(doc => {
                    const isSelected = selectedIds.includes(doc.codigo_doacao);
                    const donor = doadores.find(d => d.codigo_doador === doc.codigo_doador);

                    return (
                      <tr 
                        key={doc.codigo_doacao} 
                        onClick={() => handleToggleSelectOne(doc.codigo_doacao)}
                        className={`hover:bg-white/5 transition-colors cursor-pointer ${
                          isSelected ? 'bg-white/5' : ''
                        }`}
                      >
                        <td className="p-4 text-center">
                          <button type="button" className="p-1">
                            {isSelected ? (
                              <CheckSquare className="text-blue-300 animate-scale-up" size={16} />
                            ) : (
                              <Square size={16} className="text-white/40" />
                            )}
                          </button>
                        </td>
                        <td className="p-4 font-mono font-bold text-blue-200">
                          #{String(doc.codigo_doacao).padStart(4, '0')}
                        </td>
                        <td className="p-4 font-semibold text-white">
                          {donor ? donor.nome : `Doador #${doc.codigo_doador}`}
                        </td>
                        <td className="p-4 font-mono text-xs text-white/60">
                          {doc.data_doacao}
                        </td>
                        <td className="p-4 text-xs">
                          {doc.responsavel || 'Não especificado'}
                        </td>
                        <td className="p-4">
                          {activeSubTab === 'pendentes' ? (
                            <span className="bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded text-[10px] font-bold border border-amber-400/30 uppercase tracking-tighter">
                              Aguardando
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-green-300 font-bold">
                              ✓ {doc.data_baixa}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
