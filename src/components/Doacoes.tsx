/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock, fetchAllRecords } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Doacao, ItemDoacao, Doador, Categoria, ItemCatalogo } from '../types';
import { 
  Gift, User, Calendar, FileText, PlusCircle, Trash2, 
  Search, Save, RefreshCw, Sparkles, X, CheckCircle2, Ban,
  ChevronLeft, ChevronRight
} from 'lucide-react';

interface DoacoesProps {
  prefilledDoadorId?: number | null;
  clearPrefilledDoadorId?: () => void;
}

export const Doacoes: React.FC<DoacoesProps> = ({ prefilledDoadorId, clearPrefilledDoadorId }) => {
  const { addLog } = useThemeAuth();
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [itensCatalogo, setItensCatalogo] = useState<ItemCatalogo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 1000;

  // Dropdown selectors / searchers

  // Active Donation Form State
  const [selectedDoacao, setSelectedDoacao] = useState<Doacao | null>(null);
  const [formState, setFormState] = useState<Omit<Doacao, 'codigo_doacao'>>({
    codigo_doador: undefined,
    data_doacao: new Date().toISOString().split('T')[0],
    data_retirada: '',
    remarcado_para: '',
    responsavel: '',
    observacoes: '',
    data_cancelamento: '',
    data_baixa: '',
    data_solicitacao: new Date().toISOString().split('T')[0]
  });

  // Donation Items Grid State
  const [itemsList, setItemsList] = useState<Omit<ItemDoacao, 'id'>[]>([]);

  // Individual item creation temporary fields
  const [tempItem, setTempItem] = useState<{
    categoria: string;
    item: string;
    unidade: string;
    qtde: number;
    codigo_item: string;
  }>({
    categoria: '',
    item: '',
    unidade: 'UN',
    qtde: 1,
    codigo_item: ''
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [nextDonationCode, setNextDonationCode] = useState<number | null>(null);

  const computeNextCode = (list: Doacao[]) => {
    const maxCode = list.reduce((max, d) => Math.max(max, d.codigo_doacao), 0);
    setNextDonationCode(maxCode + 1);
  };

  const loadEssentialData = async () => {
    setIsLoading(true);
    if (isRealSupabaseConfigured && supabase) {
      try {
        const donors = await fetchAllRecords<any>('doadores', { order: { column: 'nome' } });
        const { data: cats } = await supabase.from('categoria').select('*').eq('status', 'Ativo');
        const catItems = await fetchAllRecords<any>('itens');

        const { data: allDoacoes, count } = await supabase
          .from('doacoes')
          .select('codigo_doacao', { count: 'exact', head: false })
          .order('codigo_doacao', { ascending: false });
        const total = count || 0;
        setTotalCount(total);
        computeNextCode(allDoacoes || []);

        const from = (currentPage - 1) * pageSize;
        const to = Math.min(from + pageSize - 1, total - 1);
        let donates: Doacao[] = [];
        if (from <= to) {
          const { data } = await supabase
            .from('doacoes')
            .select('*')
            .order('codigo_doacao', { ascending: false })
            .range(from, to);
          donates = data || [];
        }

        setDoadores(donors || []);
        setCategorias(cats || []);
        setItensCatalogo(catItems || []);
        setDoacoes(donates || []);
      } catch (e: any) {
        console.error(e);
        showFeedback('error', 'Erro ao carregar dados do Supabase: ' + e.message);
      }
    } else {
      setDoadores(dbMock.get<Doador>('DOADORES'));
      setCategorias(dbMock.get<Categoria>('CATEGORIA').filter(c => c.status === 'Ativo'));
      setItensCatalogo(dbMock.get<ItemCatalogo>('ITENS'));
      
      const list = dbMock.get<Doacao>('DOACOES');
      list.sort((a, b) => b.codigo_doacao - a.codigo_doacao);
      setTotalCount(list.length);
      setDoacoes(list);
      computeNextCode(list);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadEssentialData();
  }, [currentPage]);

  useEffect(() => {
    if (prefilledDoadorId !== undefined && prefilledDoadorId !== null) {
      setFormState(prev => ({
        ...prev,
        codigo_doador: prefilledDoadorId
      }));
      if (clearPrefilledDoadorId) {
        clearPrefilledDoadorId();
      }
    }
  }, [prefilledDoadorId, doadores]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Switch Catalog Item and Auto-fill Code and Unit
  const handleItemSelect = (itemName: string) => {
    const matched = itensCatalogo.find(i => i.nome === itemName);
    if (matched) {
      setTempItem(prev => ({
        ...prev,
        item: itemName,
        unidade: matched.unidade || 'UN',
        codigo_item: matched.codigo_completo || ''
      }));
    } else {
      setTempItem(prev => ({
        ...prev,
        item: itemName
      }));
    }
  };

  const handleCategorySelect = (catName: string) => {
    const matchedCat = categorias.find(c => c.nome === catName);
    const codeBase = matchedCat?.codigo_base || '';
    
    setTempItem(prev => ({
      ...prev,
      categoria: catName,
      item: '',
      codigo_item: codeBase ? `${codeBase}-` : ''
    }));
  };

  // Load items of a specific selected donation
  const loadDonationItems = async (codigoDoacao: number) => {
    if (isRealSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('itens_doacao')
          .select('*')
          .eq('id_doacao', String(codigoDoacao));
        if (error) throw error;
        setItemsList(data || []);
      } catch (e: any) {
        console.error(e);
        showFeedback('error', 'Erro ao carregar itens da doação: ' + e.message);
      }
    } else {
      const allItems = dbMock.get<ItemDoacao>('ITENS_DOACAO');
      const filtered = allItems.filter(i => String(i.id_doacao) === String(codigoDoacao));
      setItemsList(filtered);
    }
  };

  // Add item to temporary list
  const addTempItem = () => {
    if (!tempItem.categoria || !tempItem.item) {
      showFeedback('error', 'Por favor, selecione a categoria e o item!');
      return;
    }
    if (tempItem.qtde <= 0) {
      showFeedback('error', 'Quantidade deve ser maior que zero!');
      return;
    }

    const newItem: Omit<ItemDoacao, 'id'> = {
      id_doacao: selectedDoacao ? String(selectedDoacao.codigo_doacao) : 'TEMP',
      categoria: tempItem.categoria,
      item: tempItem.item,
      unidade: tempItem.unidade,
      qtde: tempItem.qtde,
      codigo_item: tempItem.codigo_item || `ITEM-${Date.now()}`
    };

    setItemsList(prev => [...prev, newItem]);
    // reset item selectors
    setTempItem({
      categoria: '',
      item: '',
      unidade: 'UN',
      qtde: 1,
      codigo_item: ''
    });
    showFeedback('success', 'Item adicionado à lista.');
  };

  // Delete item from grid
  const removeGridItem = (index: number) => {
    setItemsList(prev => prev.filter((_, i) => i !== index));
    showFeedback('success', 'Item removido da lista.');
  };

  const handleReset = () => {
    setSelectedDoacao(null);
    setFormState({
      codigo_doador: undefined,
      data_doacao: new Date().toISOString().split('T')[0],
      data_retirada: '',
      remarcado_para: '',
      responsavel: '',
      observacoes: '',
      data_cancelamento: '',
      data_baixa: '',
      data_solicitacao: new Date().toISOString().split('T')[0]
    });
    setItemsList([]);
    setTempItem({
      categoria: '',
      item: '',
      unidade: 'UN',
      qtde: 1,
      codigo_item: ''
    });
  };

  // Save full Donation (Create or Update)
  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.codigo_doador) {
      showFeedback('error', 'É necessário selecionar um doador para a doação!');
      return;
    }
    if (itemsList.length === 0) {
      showFeedback('error', 'A doação precisa de pelo menos 1 item físico cadastrado!');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedDoacao) {
        const codigoDoacao = selectedDoacao.codigo_doacao;
        // UPDATE
        if (isRealSupabaseConfigured && supabase) {
          // Update header
          const { error: headerErr } = await supabase
            .from('doacoes')
            .update(formState)
            .eq('codigo_doacao', codigoDoacao);
          if (headerErr) throw headerErr;

          // Delete old items and insert updated ones
          await supabase.from('itens_doacao').delete().eq('id_doacao', String(codigoDoacao));
          const itemsToSave = itemsList.map(item => ({
            id_doacao: String(codigoDoacao),
            categoria: item.categoria,
            item: item.item,
            unidade: item.unidade,
            qtde: item.qtde,
            codigo_item: item.codigo_item
          }));
          const { error: itemsErr } = await supabase.from('itens_doacao').insert(itemsToSave);
          if (itemsErr) throw itemsErr;
        } else {
          // Mock Update
          const list = dbMock.get<Doacao>('DOACOES');
          const updated = list.map(item => 
            item.codigo_doacao === codigoDoacao 
              ? { ...item, ...formState } 
              : item
          );
          dbMock.save('DOACOES', updated);

          // Items Update
          const allItems = dbMock.get<ItemDoacao>('ITENS_DOACAO');
          const cleanItems = allItems.filter(i => String(i.id_doacao) !== String(codigoDoacao));
          
          const newItems = itemsList.map((item, idx) => ({
            id: Date.now() + idx,
            id_doacao: String(codigoDoacao),
            categoria: item.categoria,
            item: item.item,
            unidade: item.unidade,
            qtde: item.qtde,
            codigo_item: item.codigo_item,
            created_at: new Date().toISOString()
          }));
          dbMock.save('ITENS_DOACAO', [...cleanItems, ...newItems]);
        }
        await addLog('Alterou Doação', 'Doações', `Doação #${codigoDoacao} alterada. Itens: ${itemsList.length}`);
        showFeedback('success', `Registro de Doação #${codigoDoacao} atualizado com sucesso!`);
      } else {
        // CREATE
        let newCodigo = 1;
        if (isRealSupabaseConfigured && supabase) {
          const { data: newD, error: headerErr } = await supabase
            .from('doacoes')
            .insert(formState)
            .select()
            .single();
          if (headerErr) throw headerErr;
          newCodigo = newD.codigo_doacao;

          const itemsToSave = itemsList.map(item => ({
            id_doacao: String(newCodigo),
            categoria: item.categoria,
            item: item.item,
            unidade: item.unidade,
            qtde: item.qtde,
            codigo_item: item.codigo_item
          }));
          const { error: itemsErr } = await supabase.from('itens_doacao').insert(itemsToSave);
          if (itemsErr) throw itemsErr;
        } else {
          const list = dbMock.get<Doacao>('DOACOES');
          newCodigo = list.length > 0 ? Math.max(...list.map(d => d.codigo_doacao)) + 1 : 1;
          const newDoacao: Doacao = {
            codigo_doacao: newCodigo,
            ...formState,
            created_at: new Date().toISOString()
          };
          dbMock.save('DOACOES', [...list, newDoacao]);

          // Items Save
          const allItems = dbMock.get<ItemDoacao>('ITENS_DOACAO');
          const newItems = itemsList.map((item, idx) => ({
            id: Date.now() + idx,
            id_doacao: String(newCodigo),
            categoria: item.categoria,
            item: item.item,
            unidade: item.unidade,
            qtde: item.qtde,
            codigo_item: item.codigo_item,
            created_at: new Date().toISOString()
          }));
          dbMock.save('ITENS_DOACAO', [...allItems, ...newItems]);
        }
        await addLog('Registrou Doação', 'Doações', `Doação #${newCodigo} registrada com sucesso.`);
        showFeedback('success', `Nova Doação registrada com Código #${newCodigo}!`);
      }
      handleReset();
      setCurrentPage(1);
    } catch (e: any) {
      console.error(e);
      showFeedback('error', 'Erro ao salvar doação: ' + e.message);
    }
    setIsLoading(false);
  };

  const handleEditSelectDoacao = async (doacao: Doacao) => {
    setSelectedDoacao(doacao);
    setFormState({
      codigo_doador: doacao.codigo_doador,
      data_doacao: doacao.data_doacao || '',
      data_retirada: doacao.data_retirada || '',
      remarcado_para: doacao.remarcado_para || '',
      responsavel: doacao.responsavel || '',
      observacoes: doacao.observacoes || '',
      data_cancelamento: doacao.data_cancelamento || '',
      data_baixa: doacao.data_baixa || '',
      data_solicitacao: doacao.data_solicitacao || ''
    });
    
    await loadDonationItems(doacao.codigo_doacao);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDoacao = async (codigo: number) => {
    if (!confirm(`Confirma a exclusão definitiva da doação #${codigo}?`)) return;

    setIsLoading(true);
    try {
      if (isRealSupabaseConfigured && supabase) {
        // Delete items first
        await supabase.from('itens_doacao').delete().eq('id_doacao', String(codigo));
        // Delete header
        const { error } = await supabase.from('doacoes').delete().eq('codigo_doacao', codigo);
        if (error) throw error;
      } else {
        const list = dbMock.get<Doacao>('DOACOES');
        dbMock.save('DOACOES', list.filter(item => item.codigo_doacao !== codigo));

        const items = dbMock.get<ItemDoacao>('ITENS_DOACAO');
        dbMock.save('ITENS_DOACAO', items.filter(item => String(item.id_doacao) !== String(codigo)));
      }
      await addLog('Excluiu Doação', 'Doações', `Doação #${codigo} removida.`);
      showFeedback('success', `Doação #${codigo} excluída com sucesso!`);
      handleReset();
      setCurrentPage(1);
    } catch (e: any) {
      console.error(e);
      showFeedback('error', 'Erro ao deletar doação: ' + e.message);
    }
    setIsLoading(false);
  };

  // Filter donations list
  const filteredDoacoesList = doacoes.filter(doc => {
    const donorObj = doadores.find(d => d.codigo_doador === doc.codigo_doador);
    const donorName = donorObj ? donorObj.nome.toLowerCase() : '';
    const matchSearch = String(doc.codigo_doacao).includes(searchTerm) || 
                        donorName.includes(searchTerm.toLowerCase()) ||
                        (doc.responsavel && doc.responsavel.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSearch;
  });

  // Filter Catalog Items based on the selected Category
  const availableCatalogItems = itensCatalogo.filter(i => i.codigo_base === categorias.find(c => c.nome === tempItem.categoria)?.codigo_base);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Alert Feedbacks */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg transition-all ${
          message.type === 'success' 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' 
            : 'bg-red-500/20 border-red-500/30 text-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="text-emerald-400 mt-0.5" size={18} /> : <Ban className="text-red-400 mt-0.5" size={18} />}
          <div>
            <p className="font-bold text-sm">{message.type === 'success' ? 'Sucesso!' : 'Ação Requerida'}</p>
            <p className="text-xs mt-0.5 opacity-90">{message.text}</p>
          </div>
        </div>
      )}

      {/* Donation Creation Form */}
      <section className="aero-black-panel rounded-2xl border border-white/15 overflow-hidden shadow-2xl relative">
        <header className="h-14 flex items-center justify-between px-6 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10">
          <div className="flex items-center gap-3">
            <Gift className="text-blue-300 drop-shadow" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide text-glow">
              {selectedDoacao ? `Editando Registro de Doação: #${selectedDoacao.codigo_doacao}` : 'Lançar Novo Recebimento de Doações'}
            </h2>
          </div>
          <span className="text-[10px] bg-white/10 text-white/70 px-2.5 py-1 rounded border border-white/10 font-bold uppercase tracking-wider font-mono">
            Modo Administrativo
          </span>
        </header>

        <form onSubmit={handleSaveDonation} className="p-6 md:p-8 space-y-8 relative z-10">
          
          {/* Form Top Title */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <User className="text-blue-300" size={15} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Origem & Responsabilidade</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Donation ID (Readonly) */}
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Código Doação</label>
              <input
                type="text"
                readOnly
                value={selectedDoacao ? String(selectedDoacao.codigo_doacao).padStart(6, '0') : (nextDonationCode ? String(nextDonationCode).padStart(6, '0') : 'CARREGANDO...')}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-xs font-semibold font-mono opacity-60 text-blue-200 cursor-not-allowed"
              />
            </div>

            {/* Código do Doador (read-only, filled from Doadores) */}
            <div className="md:col-span-5 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Código do Doador <span className="text-red-400">*</span></label>
              <input
                type="text"
                readOnly
                value={formState.codigo_doador ? String(formState.codigo_doador).padStart(6, '0') : 'SELECIONE UM DOADOR NO FORMULÁRIO DE DOADORES'}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-xs font-semibold font-mono opacity-70 text-purple-200 cursor-not-allowed"
              />
            </div>

            {/* Responsável */}
            <div className="md:col-span-4 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Colaborador Responsável <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                placeholder="Nome do colaborador"
                value={formState.responsavel}
                onChange={e => setFormState(prev => ({ ...prev, responsavel: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Group 2: Datas Importantes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Data Solicitação</label>
              <input
                type="date"
                value={formState.data_solicitacao}
                onChange={e => setFormState(prev => ({ ...prev, data_solicitacao: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Data Doação <span className="text-red-400">*</span></label>
              <input
                type="date"
                required
                value={formState.data_doacao}
                onChange={e => setFormState(prev => ({ ...prev, data_doacao: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Data Retirada</label>
              <input
                type="date"
                value={formState.data_retirada}
                onChange={e => setFormState(prev => ({ ...prev, data_retirada: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Remarcado Para</label>
              <input
                type="date"
                value={formState.remarcado_para}
                onChange={e => setFormState(prev => ({ ...prev, remarcado_para: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Data Baixa (Conclusão)</label>
              <input
                type="date"
                value={formState.data_baixa}
                onChange={e => setFormState(prev => ({ ...prev, data_baixa: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-xs text-green-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Data de Cancelamento</label>
              <input
                type="date"
                value={formState.data_cancelamento}
                onChange={e => setFormState(prev => ({ ...prev, data_cancelamento: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-xs text-red-300"
              />
            </div>

            <div className="md:col-span-8 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Observações Gerais</label>
              <textarea
                rows={1}
                placeholder="Instruções de entrega, detalhes de acesso ao condomínio, etc..."
                value={formState.observacoes}
                onChange={e => setFormState(prev => ({ ...prev, observacoes: e.target.value }))}
                className="aero-input-gloss w-full p-3 rounded-xl text-sm resize-none h-[40px] leading-tight"
              />
            </div>
          </div>

          {/* NESTED SUBSECTION: ITENS DA DOAÇÃO */}
          <div className="pt-6 border-t border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <PlusCircle className="text-emerald-400 animate-pulse" size={16} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Ficha de Bens Físicos Coletados (Estoque)</span>
              </div>
            </div>

            {/* Quick Temp Item Adder Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
              
              {/* Category */}
              <div className="md:col-span-3 flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase text-white/60">Categoria</label>
                <select
                  value={tempItem.categoria}
                  onChange={e => handleCategorySelect(e.target.value)}
                  className="aero-input-gloss h-9 w-full px-3 rounded-lg text-xs cursor-pointer appearance-none"
                >
                  <option value="" className="bg-slate-900">Selecione...</option>
                  {categorias.map(c => (
                    <option key={c.codigo_base} value={c.nome} className="bg-slate-900">{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Item / Description */}
              <div className="md:col-span-3 flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase text-white/60">Item / Descrição</label>
                <select
                  value={tempItem.item}
                  onChange={e => handleItemSelect(e.target.value)}
                  disabled={!tempItem.categoria}
                  className="aero-input-gloss h-9 w-full px-3 rounded-lg text-xs cursor-pointer appearance-none disabled:opacity-50"
                >
                  <option value="" className="bg-slate-900">Selecione...</option>
                  {availableCatalogItems.map(i => (
                    <option key={i.codigo_completo} value={i.nome} className="bg-slate-900">{i.nome}</option>
                  ))}
                </select>
              </div>

              {/* Unidade */}
              <div className="md:col-span-1.5 flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase text-white/60 text-center">Unidade</label>
                <input
                  type="text"
                  readOnly
                  value={tempItem.unidade}
                  className="aero-input-gloss h-9 w-full text-center rounded-lg text-xs font-bold text-white/70"
                />
              </div>

              {/* Quantidade */}
              <div className="md:col-span-1.5 flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase text-white/60 text-center">Qtde</label>
                <input
                  type="number"
                  min={1}
                  value={tempItem.qtde}
                  onChange={e => setTempItem(prev => ({ ...prev, qtde: parseInt(e.target.value) || 1 }))}
                  className="aero-input-gloss h-9 w-full text-center rounded-lg text-xs"
                />
              </div>

              {/* Código Item (Readonly) */}
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase text-white/60">Cód. Item</label>
                <input
                  type="text"
                  readOnly
                  placeholder="Automático"
                  value={tempItem.codigo_item}
                  className="aero-input-gloss h-9 w-full px-3 rounded-lg text-xs font-mono opacity-70 cursor-not-allowed"
                />
              </div>

              {/* Insert Action */}
              <div className="md:col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={addTempItem}
                  className="aero-button-primary w-full h-9 rounded-lg flex items-center justify-center gap-1 text-xs cursor-pointer"
                >
                  <PlusCircle size={14} />
                  <span>Incluir</span>
                </button>
              </div>
            </div>

            {/* Current Items Grid list table */}
            <div className="rounded-xl overflow-hidden border border-white/5 bg-black/10">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/5 text-left border-b border-white/5 font-mono text-[9px] uppercase tracking-wider text-white/40">
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Item físico</th>
                    <th className="p-3 text-center">Und.</th>
                    <th className="p-3 text-center">Quantidade</th>
                    <th className="p-3">Código Catálogo</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {itemsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-xs text-white/30 italic">
                        Nenhum bem físico inserido nesta carga ainda.
                      </td>
                    </tr>
                  ) : (
                    itemsList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 text-xs">
                        <td className="p-3 font-semibold text-white/80">{item.categoria}</td>
                        <td className="p-3 text-white">{item.item}</td>
                        <td className="p-3 text-center font-mono font-bold text-white/60">{item.unidade}</td>
                        <td className="p-3 text-center font-bold text-blue-200">{item.qtde}</td>
                        <td className="p-3 font-mono text-white/40">{item.codigo_item}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeGridItem(idx)}
                            className="p-1 hover:text-red-400 text-white/40 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Main actions footer bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-white/10 gap-4">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto px-6 h-11 rounded-xl text-white/50 hover:text-white text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
            >
              Cancelar Edição
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="aero-button-primary w-full sm:w-auto px-12 h-11 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <>
                  <Save size={15} />
                  {selectedDoacao ? 'Gravar Alterações Doação' : 'Concluir Lançamento Carga'}
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* List / History Table */}
      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <header className="px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-b from-white/10 to-transparent">
          <div className="flex items-center gap-3">
            <Gift className="text-blue-300" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide uppercase text-glow">Doações Cadastradas</h2>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isRealSupabaseConfigured && supabase && (
              <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all border border-white/10 text-white cursor-pointer"
                  title="Página Anterior"
                >
                  <ChevronLeft size={12} />
                </button>
                <span className="font-mono text-[10px] font-extrabold px-2 bg-black/50 text-emerald-300 border border-white/10 rounded-md text-center min-w-[70px]">
                  {currentPage} / {Math.ceil(totalCount / pageSize) || 1}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize) || 1, p + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize) || 1}
                  className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all border border-white/10 text-white cursor-pointer"
                  title="Próxima Página"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
            <span className="bg-white/10 text-white text-[10px] px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 font-bold">
              {totalCount || filteredDoacoesList.length} registro(s) no banco
            </span>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Quick search filter */}
          <div className="relative max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Buscar por código, responsável ou doador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="aero-input-gloss w-full h-10 pl-10 pr-4 rounded-xl text-sm text-white placeholder-white/30"
            />
          </div>

          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/10 text-left border-b border-white/10 font-mono text-[9px] uppercase tracking-wider text-white/50">
                    <th className="p-4">Reg #</th>
                    <th className="p-4">Doador</th>
                    <th className="p-4 text-center">Data Lançamento</th>
                    <th className="p-4">Responsável</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredDoacoesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-sm text-white/40">
                        Nenhuma doação cadastrada encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredDoacoesList.map(doc => {
                      const donor = doadores.find(d => d.codigo_doador === doc.codigo_doador);
                      
                      // Status identification
                      let statusBadge = (
                        <span className="bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-400/30 uppercase tracking-tighter">
                          Pendente
                        </span>
                      );
                      if (doc.data_cancelamento) {
                        statusBadge = (
                          <span className="bg-red-400/20 text-red-300 px-3 py-1 rounded-full text-[10px] font-bold border border-red-400/30 uppercase tracking-tighter">
                            Cancelado
                          </span>
                        );
                      } else if (doc.data_baixa) {
                        statusBadge = (
                          <span className="bg-green-400/20 text-green-300 px-3 py-1 rounded-full text-[10px] font-bold border border-green-400/30 uppercase tracking-tighter">
                            Baixado / Entregue
                          </span>
                        );
                      }

                      return (
                        <tr key={doc.codigo_doacao} className="hover:bg-white/5 transition-colors group text-sm text-white/90">
                          <td className="p-4 font-mono font-bold text-blue-200">
                            #{String(doc.codigo_doacao).padStart(4, '0')}
                          </td>
                          <td className="p-4 font-semibold">
                            {donor ? donor.nome : `Doador #${doc.codigo_doador}`}
                          </td>
                          <td className="p-4 text-center font-mono text-xs">
                            {doc.data_doacao}
                          </td>
                          <td className="p-4 text-xs font-semibold text-white/70">
                            {doc.responsavel || 'Não especificado'}
                          </td>
                          <td className="p-4">
                            {statusBadge}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2.5">
                              <button
                                onClick={() => handleEditSelectDoacao(doc)}
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
                                title="Ver / Editar Doação"
                              >
                                <FileText size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteDoacao(doc.codigo_doacao)}
                                className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/30 border border-red-500/20 flex items-center justify-center text-red-300 transition-all cursor-pointer"
                                title="Deletar Doação"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
