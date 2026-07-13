/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock, fetchAllRecords } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Categoria, ItemCatalogo } from '../types';
import { 
  Folder, Package, Search, Save, Trash2, Edit3, Plus, 
  RefreshCw, Check, AlertTriangle, PlayCircle
} from 'lucide-react';

export const CategoriasItens: React.FC = () => {
  const { addLog } = useThemeAuth();
  const [activeTab, setActiveTab] = useState<'categorias' | 'itens'>('categorias');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data States
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [catSearch, setCatSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  // Form State - Categoria
  const [selectedCat, setSelectedCat] = useState<Categoria | null>(null);
  const [catForm, setCatForm] = useState<Categoria>({
    codigo_base: '',
    nome: '',
    descricao: '',
    status: 'Ativo'
  });

  // Form State - Item
  const [selectedItem, setSelectedItem] = useState<ItemCatalogo | null>(null);
  const [itemForm, setItemForm] = useState<ItemCatalogo>({
    codigo_completo: '',
    codigo_base: '',
    nome: '',
    unidade: 'UN',
    qtde: 0
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAllData = async () => {
    setIsLoading(true);
    if (isRealSupabaseConfigured && supabase) {
      try {
        const cats = await fetchAllRecords<any>('categoria', { order: { column: 'nome' } });
        const products = await fetchAllRecords<any>('itens', { order: { column: 'nome' } });
        setCategorias(cats || []);
        setItens(products || []);
      } catch (e: any) {
        console.error(e);
        showFeedback('error', 'Erro ao consultar banco de dados: ' + e.message);
      }
    } else {
      setCategorias(dbMock.get<Categoria>('CATEGORIA'));
      setItens(dbMock.get<ItemCatalogo>('ITENS'));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Switch Categorias vs Itens Tab
  const handleTabSwitch = (tab: 'categorias' | 'itens') => {
    setActiveTab(tab);
    setMessage(null);
    handleResetCatForm();
    handleResetItemForm();
  };

  // Handle auto code suggestion for products based on category base prefix
  const handleItemCategoryChange = (basePrefix: string) => {
    const categoryProducts = itens.filter(i => i.codigo_base === basePrefix);
    const nextSeq = categoryProducts.length + 1;
    const formattedSeq = String(nextSeq).padStart(3, '0');
    
    setItemForm(prev => ({
      ...prev,
      codigo_base: basePrefix,
      codigo_completo: basePrefix ? `${basePrefix}-${formattedSeq}` : ''
    }));
  };

  // Category CRUD
  const handleResetCatForm = () => {
    setSelectedCat(null);
    setCatForm({
      codigo_base: '',
      nome: '',
      descricao: '',
      status: 'Ativo'
    });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.codigo_base || !catForm.nome) {
      showFeedback('error', 'Os campos Código Base e Nome são obrigatórios!');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedCat) {
        // UPDATE
        if (isRealSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('categoria')
            .update({
              nome: catForm.nome,
              descricao: catForm.descricao,
              status: catForm.status
            })
            .eq('codigo_base', selectedCat.codigo_base);
          if (error) throw error;
        } else {
          const list = dbMock.get<Categoria>('CATEGORIA');
          const updated = list.map(c => 
            c.codigo_base === selectedCat.codigo_base 
              ? { ...c, nome: catForm.nome, descricao: catForm.descricao, status: catForm.status }
              : c
          );
          dbMock.save('CATEGORIA', updated);
        }
        await addLog('Alterou Categoria', 'Categorias', `Categoria: ${catForm.nome} (${catForm.codigo_base})`);
        showFeedback('success', `Categoria "${catForm.nome}" atualizada com sucesso!`);
      } else {
        // CREATE
        // Check uniqueness
        const exists = categorias.some(c => c.codigo_base.toLowerCase() === catForm.codigo_base.toLowerCase());
        if (exists) {
          showFeedback('error', `O Código Base "${catForm.codigo_base}" já está cadastrado.`);
          setIsLoading(false);
          return;
        }

        if (isRealSupabaseConfigured && supabase) {
          const { error } = await supabase.from('categoria').insert(catForm);
          if (error) throw error;
        } else {
          const list = dbMock.get<Categoria>('CATEGORIA');
          dbMock.save('CATEGORIA', [...list, { ...catForm, created_at: new Date().toISOString() }]);
        }
        await addLog('Cadastrou Categoria', 'Categorias', `Categoria: ${catForm.nome} (${catForm.codigo_base})`);
        showFeedback('success', `Nova Categoria "${catForm.nome}" cadastrada com sucesso!`);
      }
      handleResetCatForm();
      loadAllData();
    } catch (e: any) {
      console.error(e);
      showFeedback('error', 'Erro ao salvar categoria: ' + e.message);
    }
    setIsLoading(false);
  };

  const handleDeleteCategory = async (base: string, name: string) => {
    // Check if items are associated
    const associated = itens.some(i => i.codigo_base === base);
    if (associated) {
      showFeedback('error', `Impossível excluir. Existem produtos no catálogo que pertencem à categoria "${name}".`);
      return;
    }

    if (!confirm(`Confirma a exclusão definitiva da categoria "${name}" (${base})?`)) return;

    setIsLoading(true);
    try {
      if (isRealSupabaseConfigured && supabase) {
        const { error } = await supabase.from('categoria').delete().eq('codigo_base', base);
        if (error) throw error;
      } else {
        const list = dbMock.get<Categoria>('CATEGORIA');
        dbMock.save('CATEGORIA', list.filter(c => c.codigo_base !== base));
      }
      await addLog('Excluiu Categoria', 'Categorias', `Categoria: ${name} (${base})`);
      showFeedback('success', `Categoria "${name}" excluída do banco com sucesso.`);
      handleResetCatForm();
      loadAllData();
    } catch (e: any) {
      console.error(e);
      showFeedback('error', 'Erro ao excluir categoria: ' + e.message);
    }
    setIsLoading(false);
  };

  // Item Catalog CRUD
  const handleResetItemForm = () => {
    setSelectedItem(null);
    setItemForm({
      codigo_completo: '',
      codigo_base: '',
      nome: '',
      unidade: 'UN',
      qtde: 0
    });
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.codigo_completo || !itemForm.codigo_base || !itemForm.nome) {
      showFeedback('error', 'Os campos Código Completo, Categoria e Nome do Item são obrigatórios!');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedItem) {
        // UPDATE
        if (isRealSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('itens')
            .update({
              nome: itemForm.nome,
              unidade: itemForm.unidade,
              qtde: itemForm.qtde
            })
            .eq('codigo_completo', selectedItem.codigo_completo);
          if (error) throw error;
        } else {
          const list = dbMock.get<ItemCatalogo>('ITENS');
          const updated = list.map(i => 
            i.codigo_completo === selectedItem.codigo_completo 
              ? { ...i, nome: itemForm.nome, unidade: itemForm.unidade, qtde: itemForm.qtde }
              : i
          );
          dbMock.save('ITENS', updated);
        }
        await addLog('Alterou Item Catálogo', 'Itens', `Item: ${itemForm.nome} (${itemForm.codigo_completo})`);
        showFeedback('success', `Item de catálogo "${itemForm.nome}" atualizado com sucesso!`);
      } else {
        // CREATE
        // Check uniqueness
        const exists = itens.some(i => i.codigo_completo.toLowerCase() === itemForm.codigo_completo.toLowerCase());
        if (exists) {
          showFeedback('error', `O Código Completo "${itemForm.codigo_completo}" já está cadastrado.`);
          setIsLoading(false);
          return;
        }

        if (isRealSupabaseConfigured && supabase) {
          const { error } = await supabase.from('itens').insert(itemForm);
          if (error) throw error;
        } else {
          const list = dbMock.get<ItemCatalogo>('ITENS');
          dbMock.save('ITENS', [...list, { ...itemForm, created_at: new Date().toISOString() }]);
        }
        await addLog('Cadastrou Item Catálogo', 'Itens', `Item: ${itemForm.nome} (${itemForm.codigo_completo})`);
        showFeedback('success', `Produto de catálogo "${itemForm.nome}" cadastrado com sucesso!`);
      }
      handleResetItemForm();
      loadAllData();
    } catch (e: any) {
      console.error(e);
      showFeedback('error', 'Erro ao salvar item no catálogo: ' + e.message);
    }
    setIsLoading(false);
  };

  const handleDeleteItem = async (codigo: string, name: string) => {
    if (!confirm(`Deseja remover "${name}" (${codigo}) do catálogo de itens?`)) return;

    setIsLoading(true);
    try {
      if (isRealSupabaseConfigured && supabase) {
        const { error } = await supabase.from('itens').delete().eq('codigo_completo', codigo);
        if (error) throw error;
      } else {
        const list = dbMock.get<ItemCatalogo>('ITENS');
        dbMock.save('ITENS', list.filter(i => i.codigo_completo !== codigo));
      }
      await addLog('Excluiu Item Catálogo', 'Itens', `Item: ${name} (${codigo})`);
      showFeedback('success', `Item "${name}" excluído.`);
      handleResetItemForm();
      loadAllData();
    } catch (e: any) {
      console.error(e);
      showFeedback('error', 'Erro ao deletar item: ' + e.message);
    }
    setIsLoading(false);
  };

  // Filter lists
  const filteredCategorias = categorias.filter(c => 
    c.nome.toLowerCase().includes(catSearch.toLowerCase()) ||
    c.codigo_base.toLowerCase().includes(catSearch.toLowerCase())
  );

  const filteredItens = itens.filter(i => 
    i.nome.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.codigo_completo.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.codigo_base.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Visual Tab Selector */}
      <nav className="flex items-center gap-1 border-b border-white/10">
        <button
          onClick={() => handleTabSwitch('categorias')}
          className={`px-8 py-3 rounded-t-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'categorias' ? 'tab-active' : 'tab-inactive hover:opacity-100'
          }`}
        >
          <Folder size={15} />
          Cadastro de Categorias
        </button>
        <button
          onClick={() => handleTabSwitch('itens')}
          className={`px-8 py-3 rounded-t-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'itens' ? 'tab-active' : 'tab-inactive hover:opacity-100'
          }`}
        >
          <Package size={15} />
          Catálogo Geral de Itens
        </button>
      </nav>

      {/* Alert Feedbacks */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg transition-all ${
          message.type === 'success' 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' 
            : 'bg-red-500/20 border-red-500/30 text-red-100'
        }`}>
          {message.type === 'success' ? <Check className="text-emerald-400 mt-0.5" size={18} /> : <AlertTriangle className="text-red-400 mt-0.5" size={18} />}
          <div>
            <p className="font-bold text-sm">{message.type === 'success' ? 'Sucesso!' : 'Erro de Validação'}</p>
            <p className="text-xs mt-0.5 opacity-90">{message.text}</p>
          </div>
        </div>
      )}

      {/* MODULE 1: CATEGORIAS */}
      {activeTab === 'categorias' && (
        <div className="space-y-8 animate-fade-in">
          {/* Registration Form */}
          <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
              <Folder className="text-blue-300" size={16} />
              <h2 className="text-white font-bold text-xs uppercase tracking-wider text-glow">
                {selectedCat ? `Editar Categoria: ${selectedCat.nome}` : 'Nova Categoria'}
              </h2>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Código Base */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Código Base <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="Ex: ALI"
                    readOnly={!!selectedCat}
                    value={catForm.codigo_base}
                    onChange={e => setCatForm(prev => ({ ...prev, codigo_base: e.target.value.toUpperCase() }))}
                    className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm font-mono font-bold uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Nome */}
                <div className="md:col-span-4 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Nome da Categoria <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    placeholder="Nome amigável da categoria"
                    value={catForm.nome}
                    onChange={e => setCatForm(prev => ({ ...prev, nome: e.target.value }))}
                    className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm font-semibold"
                  />
                </div>

                {/* Descrição */}
                <div className="md:col-span-4 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Descrição Geral</label>
                  <input
                    type="text"
                    placeholder="Breve descrição dos itens permitidos"
                    value={catForm.descricao}
                    onChange={e => setCatForm(prev => ({ ...prev, descricao: e.target.value }))}
                    className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
                  />
                </div>

                {/* Status */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Status</label>
                  <select
                    value={catForm.status}
                    onChange={e => setCatForm(prev => ({ ...prev, status: e.target.value }))}
                    className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm cursor-pointer appearance-none"
                  >
                    <option value="Ativo" className="bg-slate-900">Ativo</option>
                    <option value="Inativo" className="bg-slate-900">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-between items-center pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleResetCatForm}
                  className="px-6 py-2.5 rounded-xl text-white/50 hover:text-white text-xs font-bold uppercase tracking-wider"
                >
                  Limpar / Cancelar
                </button>
                <div className="flex gap-3">
                  {selectedCat && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(selectedCat.codigo_base, selectedCat.nome)}
                      className="px-6 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 text-xs font-bold uppercase tracking-wider"
                    >
                      Excluir Categoria
                    </button>
                  )}
                  <button
                    type="submit"
                    className="aero-button-primary px-8 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    Salvar Registro
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* List Table */}
          <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder size={16} />
                <h3 className="text-white font-bold text-xs uppercase tracking-wider">Categorias Cadastradas</h3>
              </div>
              <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full font-bold">
                {filteredCategorias.length} REGISTRO(S)
              </span>
            </header>

            <div className="p-6 space-y-6">
              <div className="relative max-w-md">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Filtrar categorias..."
                  value={catSearch}
                  onChange={e => setCatSearch(e.target.value)}
                  className="aero-input-gloss w-full h-10 pl-10 pr-4 rounded-xl text-sm"
                />
              </div>

              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white/10 text-left border-b border-white/10 font-mono text-[9px] uppercase text-white/50">
                      <th className="p-4">Código Base</th>
                      <th className="p-4">Nome Categoria</th>
                      <th className="p-4">Descrição</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredCategorias.map(c => (
                      <tr key={c.codigo_base} className="hover:bg-white/5 transition-colors group text-sm text-white/80">
                        <td className="p-4">
                          <span className="bg-white/10 px-2.5 py-1 rounded text-xs font-mono border border-white/10 font-bold text-blue-200">
                            {c.codigo_base}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-white">{c.nome}</td>
                        <td className="p-4 text-white/60">{c.descricao || 'Nenhuma descrição.'}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                            c.status === 'Ativo' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {c.status || 'Ativo'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedCat(c);
                              setCatForm(c);
                            }}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white cursor-pointer ml-auto"
                          >
                            <Edit3 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* MODULE 2: CATALOGO DE ITENS */}
      {activeTab === 'itens' && (
        <div className="space-y-8 animate-fade-in">
          {/* Registration Form */}
          <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
              <Package className="text-blue-300" size={16} />
              <h2 className="text-white font-bold text-xs uppercase tracking-wider text-glow">
                {selectedItem ? `Editar Item: ${selectedItem.nome}` : 'Cadastrar Novo Item no Catálogo'}
              </h2>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Select Category */}
                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Selecione a Categoria <span className="text-red-400">*</span></label>
                  <select
                    disabled={!!selectedItem}
                    value={itemForm.codigo_base}
                    onChange={e => handleItemCategoryChange(e.target.value)}
                    className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm cursor-pointer appearance-none disabled:opacity-60"
                  >
                    <option value="" className="bg-slate-900">Selecione...</option>
                    {categorias.map(c => (
                      <option key={c.codigo_base} value={c.codigo_base} className="bg-slate-900">{c.nome} ({c.codigo_base})</option>
                    ))}
                  </select>
                </div>

                {/* Auto Complete Complete Code */}
                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Código Completo</label>
                  <input
                    type="text"
                    readOnly
                    placeholder="Gerado a partir da categoria"
                    value={itemForm.codigo_completo}
                    className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm font-mono font-bold text-blue-200 opacity-60 cursor-not-allowed"
                  />
                </div>

                {/* Nome do Item */}
                <div className="md:col-span-4 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Nome do Item / Descrição <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    placeholder="Ex: Agasalho de Lã M, Arroz T1 5kg"
                    value={itemForm.nome}
                    onChange={e => setItemForm(prev => ({ ...prev, nome: e.target.value }))}
                    className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm font-semibold"
                  />
                </div>

                {/* Unidade de Medida */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Unidade</label>
                  <select
                    value={itemForm.unidade}
                    onChange={e => setItemForm(prev => ({ ...prev, unidade: e.target.value }))}
                    className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm cursor-pointer appearance-none"
                  >
                    <option value="UN" className="bg-slate-900">UN (Unidade)</option>
                    <option value="KG" className="bg-slate-900">KG (Quilo)</option>
                    <option value="PAR" className="bg-slate-900">PAR (Par)</option>
                    <option value="CX" className="bg-slate-900">CX (Caixa)</option>
                    <option value="LITRO" className="bg-slate-900">LITRO</option>
                    <option value="METRO" className="bg-slate-900">METRO</option>
                  </select>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-between items-center pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleResetItemForm}
                  className="px-6 py-2.5 rounded-xl text-white/50 hover:text-white text-xs font-bold uppercase tracking-wider"
                >
                  Limpar / Cancelar
                </button>
                <div className="flex gap-3">
                  {selectedItem && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(selectedItem.codigo_completo, selectedItem.nome)}
                      className="px-6 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 text-xs font-bold uppercase tracking-wider"
                    >
                      Remover Item
                    </button>
                  )}
                  <button
                    type="submit"
                    className="aero-button-primary px-8 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    Salvar Item no Catálogo
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* List Table */}
          <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={16} />
                <h3 className="text-white font-bold text-xs uppercase tracking-wider">Catálogo Físico e Estoque Atual</h3>
              </div>
              <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full font-bold">
                {filteredItens.length} REGISTRO(S)
              </span>
            </header>

            <div className="p-6 space-y-6">
              <div className="relative max-w-md">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Buscar no catálogo por nome, código ou categoria..."
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  className="aero-input-gloss w-full h-10 pl-10 pr-4 rounded-xl text-sm"
                />
              </div>

              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white/10 text-left border-b border-white/10 font-mono text-[9px] uppercase text-white/50">
                      <th className="p-4">Cód. Completo</th>
                      <th className="p-4">Item Físico / Descrição</th>
                      <th className="p-4">Categoria Base</th>
                      <th className="p-4 text-center">Unidade</th>
                      <th className="p-4 text-center">Saldo Estoque</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredItens.map(i => (
                      <tr key={i.codigo_completo} className="hover:bg-white/5 transition-colors group text-sm text-white/80">
                        <td className="p-4">
                          <span className="bg-white/10 px-2.5 py-1 rounded text-xs font-mono border border-white/10 font-bold text-blue-200">
                            {i.codigo_completo}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-white">{i.nome}</td>
                        <td className="p-4">
                          {categorias.find(c => c.codigo_base === i.codigo_base)?.nome || i.codigo_base}
                        </td>
                        <td className="p-4 text-center font-mono text-xs">{i.unidade || 'UN'}</td>
                        <td className="p-4 text-center font-bold text-emerald-300">
                          {i.qtde}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedItem(i);
                              setItemForm(i);
                            }}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white cursor-pointer ml-auto"
                          >
                            <Edit3 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
