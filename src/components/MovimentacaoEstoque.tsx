/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Categoria, ItemCatalogo, Movimentacao } from '../types';
import { 
  ArrowLeftRight, Save, Trash2, Search, AlertCircle, CheckCircle, RefreshCw, Filter, CornerDownRight, History, Info
} from 'lucide-react';

export const MovimentacaoEstoque: React.FC = () => {
  const { user, addLog } = useThemeAuth();
  const [loading, setLoading] = useState(false);
  
  // Data lists
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  
  // Search and Filters
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Feedbacks
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formState, setFormState] = useState({
    categoria: '',
    item_codigo: '',
    tipo: 'Entrada' as 'Entrada' | 'Saída' | 'Ajuste',
    quantidade: 0,
    motivo: '',
    data: new Date().toISOString().split('T')[0]
  });

  const loadData = async () => {
    setLoading(true);
    try {
      if (isRealSupabaseConfigured && supabase) {
        const { data: cats } = await supabase.from('categoria').select('*').order('nome');
        const { data: products } = await supabase.from('itens').select('*').order('nome');
        const { data: movs } = await supabase
          .from('movimentacoes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        setCategorias(cats || []);
        setItens(products || []);
        setMovimentacoes(movs || []);
      } else {
        setCategorias(dbMock.get<Categoria>('CATEGORIA'));
        setItens(dbMock.get<ItemCatalogo>('ITENS'));
        setMovimentacoes(dbMock.get<Movimentacao>('MOVIMENTACOES'));
      }
    } catch (e: any) {
      console.error('Erro ao ler dados do estoque:', e);
      showFeedback('error', 'Erro ao sincronizar com o banco: ' + e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      setSuccessMsg(text);
      setTimeout(() => setSuccessMsg(null), 5000);
    } else {
      setErrorMsg(text);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleReset = () => {
    setFormState({
      categoria: '',
      item_codigo: '',
      tipo: 'Entrada',
      quantidade: 0,
      motivo: '',
      data: new Date().toISOString().split('T')[0]
    });
  };

  const handleCategoryChangeInForm = (catCode: string) => {
    setFormState(prev => ({
      ...prev,
      categoria: catCode,
      item_codigo: ''
    }));
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { item_codigo, tipo, quantidade, motivo, data } = formState;

    if (!item_codigo) {
      showFeedback('error', 'Por favor, selecione o item para movimentação.');
      return;
    }

    if (quantidade <= 0) {
      showFeedback('error', 'A quantidade movimentada deve ser maior que zero.');
      return;
    }

    setLoading(true);

    try {
      const selectedItem = itens.find(i => i.codigo_completo === item_codigo);
      if (!selectedItem) {
        showFeedback('error', 'Item selecionado não encontrado no cadastro.');
        setLoading(false);
        return;
      }

      const currentQty = selectedItem.qtde || 0;
      let newQty = currentQty;

      if (tipo === 'Entrada') {
        newQty = currentQty + quantidade;
      } else if (tipo === 'Saída') {
        newQty = currentQty - quantidade;
        if (newQty < 0) {
          const proceed = window.confirm(
            `Atenção: A quantidade de saída (${quantidade}) é superior ao estoque atual (${currentQty}).\nO saldo final deste item ficará negativo (${newQty}). Deseja continuar?`
          );
          if (!proceed) {
            setLoading(false);
            return;
          }
        }
      } else if (tipo === 'Ajuste') {
        newQty = quantidade;
      }

      const newMov: Movimentacao = {
        id: crypto.randomUUID(),
        codigo_completo: item_codigo,
        tipo: tipo,
        quantidade: quantidade,
        motivo: motivo.trim() || `Movimentação manual de ${tipo.toLowerCase()}`,
        created_at: new Date(data + 'T12:00:00').toISOString()
      };

      if (isRealSupabaseConfigured && supabase) {
        const { error: movErr } = await supabase.from('movimentacoes').insert([newMov]);
        if (movErr) throw movErr;

        const { error: itemErr } = await supabase
          .from('itens')
          .update({ qtde: newQty })
          .eq('codigo_completo', item_codigo);
        if (itemErr) throw itemErr;
      } else {
        const allMovs = dbMock.get<Movimentacao>('MOVIMENTACOES');
        dbMock.save('MOVIMENTACOES', [newMov, ...allMovs]);

        const allItens = dbMock.get<ItemCatalogo>('ITENS');
        const updatedItens = allItens.map(i => 
          i.codigo_completo === item_codigo ? { ...i, qtde: newQty } : i
        );
        dbMock.save('ITENS', updatedItens);
      }

      if (addLog) {
        await addLog(
          `Movimentou Estoque (${tipo})`,
          'Estoque / Movimentações',
          `Item: ${selectedItem.nome} (${item_codigo}), Qtd: ${quantidade}, Saldo Anterior: ${currentQty}, Novo Saldo: ${newQty}`
        );
      }

      showFeedback('success', `Movimentação de ${tipo.toLowerCase()} registrada com sucesso!`);
      handleReset();
      await loadData();
    } catch (e: any) {
      console.error('Erro ao salvar movimentação:', e);
      showFeedback('error', 'Erro ao salvar movimentação: ' + e.message);
    }
    setLoading(false);
  };

  const handleDeleteMovement = async (mov: Movimentacao) => {
    const selectedItem = itens.find(i => i.codigo_completo === mov.codigo_completo);
    const itemDesc = selectedItem ? `${selectedItem.nome} (${mov.codigo_completo})` : mov.codigo_completo;

    if (!window.confirm(`Deseja realmente reverter e excluir esta movimentação de estoque para "${itemDesc}"? O estoque atual será reajustado.`)) {
      return;
    }

    setLoading(true);

    try {
      const currentQty = selectedItem?.qtde || 0;
      let restoredQty = currentQty;

      if (mov.tipo === 'Entrada') {
        restoredQty = currentQty - mov.quantidade;
      } else if (mov.tipo === 'Saída') {
        restoredQty = currentQty + mov.quantidade;
      } else if (mov.tipo === 'Ajuste') {
        showFeedback('error', 'Não é possível restaurar o estoque anterior de um "Ajuste" automaticamente. Ajuste o estoque manualmente.');
        setLoading(false);
        return;
      }

      if (isRealSupabaseConfigured && supabase) {
        const { error: delErr } = await supabase.from('movimentacoes').delete().eq('id', mov.id);
        if (delErr) throw delErr;

        if (selectedItem) {
          const { error: itemErr } = await supabase
            .from('itens')
            .update({ qtde: restoredQty })
            .eq('codigo_completo', mov.codigo_completo);
          if (itemErr) throw itemErr;
        }
      } else {
        const allMovs = dbMock.get<Movimentacao>('MOVIMENTACOES');
        dbMock.save('MOVIMENTACOES', allMovs.filter(m => m.id !== mov.id));

        if (selectedItem) {
          const allItens = dbMock.get<ItemCatalogo>('ITENS');
          const updatedItens = allItens.map(i => 
            i.codigo_completo === mov.codigo_completo ? { ...i, qtde: restoredQty } : i
          );
          dbMock.save('ITENS', updatedItens);
        }
      }

      if (addLog) {
        await addLog(
          'Reverteu Movimentação',
          'Estoque / Movimentações',
          `Reverteu ${mov.tipo} de ${mov.quantidade} itens para: ${itemDesc}`
        );
      }

      showFeedback('success', 'Movimentação excluída e estoque restabelecido com sucesso!');
      await loadData();
    } catch (e: any) {
      console.error('Erro ao excluir:', e);
      showFeedback('error', 'Erro ao excluir movimentação: ' + e.message);
    }
    setLoading(false);
  };

  const formFilteredItens = formState.categoria
    ? itens.filter(i => i.codigo_base === categorias.find(c => c.nome === formState.categoria)?.codigo_base)
    : itens;

  const filteredHistory = movimentacoes.filter(mov => {
    const item = itens.find(i => i.codigo_completo === mov.codigo_completo);
    const itemName = item?.nome || '';
    const matchSearch = mov.codigo_completo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (mov.motivo || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedCategoryFilter) {
      return matchSearch && item?.codigo_base === selectedCategoryFilter;
    }
    return matchSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {errorMsg && (
        <div className="p-4 rounded-xl border bg-red-500/20 border-red-500/30 text-red-100 text-xs flex items-center gap-3">
          <AlertCircle size={16} className="text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border bg-emerald-500/20 border-emerald-500/30 text-emerald-100 text-xs flex items-center gap-3">
          <CheckCircle size={16} className="text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <header className="h-14 flex items-center justify-between px-6 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="text-blue-300 drop-shadow animate-pulse" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide text-glow">
              Nova Movimentação de Estoque
            </h2>
          </div>
          <span className="text-[10px] bg-blue-500/20 text-blue-200 px-2.5 py-1 rounded border border-blue-500/30 font-bold uppercase tracking-wider font-mono">
            Movimentações
          </span>
        </header>

        <form onSubmit={handleSaveMovement} className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Data do Registro <span className="text-red-400">*</span></label>
              <input
                type="date"
                required
                value={formState.data}
                onChange={e => setFormState(prev => ({ ...prev, data: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="md:col-span-4 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Filtrar por Categoria</label>
              <select
                value={formState.categoria}
                onChange={e => handleCategoryChangeInForm(e.target.value)}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm cursor-pointer appearance-none"
              >
                <option value="">-- Todas as Categorias --</option>
                {categorias.map(cat => (
                  <option key={cat.codigo_base} value={cat.nome}>
                    {cat.nome} ({cat.codigo_base})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-5 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Item (Código ou Nome) <span className="text-red-400">*</span></label>
              <select
                required
                value={formState.item_codigo}
                onChange={e => setFormState(prev => ({ ...prev, item_codigo: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm cursor-pointer appearance-none"
              >
                <option value="">Pesquise o item...</option>
                {formFilteredItens.map(item => (
                  <option key={item.codigo_completo} value={item.codigo_completo}>
                    {item.codigo_completo} - {item.nome} ({item.unidade || 'UN'}) [Estoque: {item.qtde || 0}]
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Tipo <span className="text-red-400">*</span></label>
              <select
                required
                value={formState.tipo}
                onChange={e => setFormState(prev => ({ ...prev, tipo: e.target.value as any }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm cursor-pointer appearance-none text-center font-bold"
              >
                <option value="Entrada">Entrada (+)</option>
                <option value="Saída">Saída (-)</option>
                <option value="Ajuste">Ajuste (inventário/correção)</option>
              </select>
            </div>

            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Quantidade <span className="text-red-400">*</span></label>
              <input
                type="number"
                min="1"
                required
                placeholder="Ex: 5"
                value={formState.quantidade || ''}
                onChange={e => setFormState(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm font-bold text-center"
              />
            </div>

            <div className="md:col-span-5 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Motivo / Observação</label>
              <input
                type="text"
                placeholder="Ex: Produto enviado ao Bazar Vicentina ou Correção de contagem"
                value={formState.motivo}
                onChange={e => setFormState(prev => ({ ...prev, motivo: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl text-white/50 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Limpar Campos
            </button>
            <button
              type="submit"
              disabled={loading}
              className="aero-button-primary px-8 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
            >
              {loading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span>Salvar Movimentação</span>
            </button>
          </div>
        </form>
      </section>

      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <header className="h-14 flex flex-col md:flex-row md:items-center justify-between px-6 py-3 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <History className="text-yellow-400 drop-shadow animate-pulse" size={16} />
            <div>
              <h2 className="text-white font-bold text-sm tracking-wide text-glow uppercase">
                Histórico Recente
              </h2>
              <p className="text-[9px] text-slate-400 leading-none">Últimas 50 movimentações registradas</p>
            </div>
            <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-slate-300 font-mono">
              {filteredHistory.length} registros
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
            <div className="relative w-full md:w-48">
              <Filter className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="aero-input-gloss w-full h-9 pl-9 pr-4 rounded-xl text-xs cursor-pointer appearance-none py-1"
              >
                <option value="">Todas as Categorias</option>
                {categorias.map(cat => (
                  <option key={cat.codigo_base} value={cat.codigo_base}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Buscar código, item ou observação..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="aero-input-gloss w-full h-9 pl-9 pr-4 rounded-xl text-xs"
              />
            </div>
          </div>
        </header>

        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
              <ArrowLeftRight className="text-slate-500 dark:text-slate-400" size={28} />
            </div>
            <p className="font-bold text-slate-300 mb-1">Nenhuma movimentação encontrada.</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Preencha e salve o formulário acima para efetuar a primeira movimentação de estoque.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5">
                  <th className="py-3 px-6">Data</th>
                  <th className="py-3 px-6">Código</th>
                  <th className="py-3 px-6">Nome do Item</th>
                  <th className="py-3 px-6 text-center">Tipo</th>
                  <th className="py-3 px-6 text-center">Qtd</th>
                  <th className="py-3 px-6">Motivo / Observação</th>
                  <th className="py-3 px-6 text-right">Reverter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredHistory.map(mov => {
                  const item = itens.find(i => i.codigo_completo === mov.codigo_completo);
                  const itemName = item?.nome || 'Item não cadastrado';
                  
                  return (
                    <tr key={mov.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-6 font-mono text-slate-400">
                        {mov.created_at ? new Date(mov.created_at).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="py-3 px-6 font-mono font-bold text-white">
                        {mov.codigo_completo}
                      </td>
                      <td className="py-3 px-6 text-slate-200">
                        {itemName}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          mov.tipo === 'Entrada'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' 
                            : mov.tipo === 'Saída'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/20'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/20'
                        }`}>
                          {mov.tipo === 'Entrada' ? '↑ Entrada' : mov.tipo === 'Saída' ? '↓ Saída' : '🔧 Ajuste'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center font-bold text-white font-mono">
                        {mov.quantidade}
                      </td>
                      <td className="py-3 px-6 text-slate-400 italic max-w-xs truncate" title={mov.motivo}>
                        {mov.motivo || '-'}
                      </td>
                      <td className="py-3 px-6 text-right">
                        {mov.tipo !== 'Ajuste' ? (
                          <button
                            onClick={() => handleDeleteMovement(mov)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 transition-all cursor-pointer"
                            title="Reverter Movimentação e reajustar estoque"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 px-1.5 py-0.5" title="Ajuste não pode ser desfeito automaticamente">
                            N/A
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
