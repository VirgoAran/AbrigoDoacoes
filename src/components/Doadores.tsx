/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock, fetchAllRecords } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Doador } from '../types';
import { fetchAddressByCep } from '../utils/cep';
import { 
  UserPlus, Search, Save, Trash2, Edit3, MapPin, 
  HelpCircle, Sparkles, RefreshCw, Smartphone, Phone, AlertCircle,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Plus, X, Gift
} from 'lucide-react';

interface DoadoresProps {
  onOpenDoacoes?: (codigoDoador: number) => void;
}

export const Doadores: React.FC<DoadoresProps> = ({ onOpenDoacoes }) => {
  const { addLog } = useThemeAuth();
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFields, setSearchFields] = useState({ codigo: '', nome: '', cep: '', telefone: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 2000;
  
  // Form State
  const [selectedDoador, setSelectedDoador] = useState<Doador | null>(null);
  const [formState, setFormState] = useState<Omit<Doador, 'codigo_doador'>>({
    nome: '',
    data_cadastro: new Date().toISOString().split('T')[0],
    celular: '',
    fixo: '',
    contato: '',
    email: '',
    whatsapp: '',
    cep: '',
    logradouro: '',
    endereco: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cod_tlmk: '',
    cod_matcob: '',
    tipo_doador: '',
    dia_semana: '',
    regiao: '',
    mapa: '',
    historico: ''
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCepLoading, setIsCepLoading] = useState(false);

  const loadDoadores = async () => {
    setIsLoading(true);
    let loadedList: Doador[] = [];
    if (isRealSupabaseConfigured && supabase) {
      try {
        const { count } = await supabase
          .from('doadores')
          .select('*', { count: 'exact', head: true });
        const total = count || 0;
        setTotalCount(total);

        const from = (currentPage - 1) * pageSize;
        const to = Math.min(from + pageSize - 1, total - 1);
        if (from <= to) {
          const { data } = await supabase
            .from('doadores')
            .select('*')
            .order('codigo_doador', { ascending: true })
            .range(from, to);
          loadedList = data || [];
        }
        setDoadores(loadedList);
      } catch (e: any) {
        console.error(e);
        showFeedback('error', 'Erro ao carregar doadores: ' + e.message);
      }
    } else {
      const list = dbMock.get<Doador>('DOADORES');
      list.sort((a, b) => a.codigo_doador - b.codigo_doador);
      loadedList = list;
      setTotalCount(list.length);
      setDoadores(list);
    }

    if (isInitialLoad && loadedList.length > 0) {
      const firstDoador = loadedList[0];
      setSelectedDoador(firstDoador);
      setFormState({
        nome: firstDoador.nome || '',
        data_cadastro: firstDoador.data_cadastro || new Date().toISOString().split('T')[0],
        celular: firstDoador.celular || '',
        fixo: firstDoador.fixo || '',
        contato: firstDoador.contato || '',
        email: firstDoador.email || '',
        whatsapp: firstDoador.whatsapp || '',
        cep: firstDoador.cep || '',
        logradouro: firstDoador.logradouro || '',
        endereco: firstDoador.endereco || '',
        complemento: firstDoador.complemento || '',
        bairro: firstDoador.bairro || '',
        cidade: firstDoador.cidade || '',
        estado: firstDoador.estado || '',
        cod_tlmk: firstDoador.cod_tlmk || '',
        cod_matcob: firstDoador.cod_matcob || '',
        tipo_doador: firstDoador.tipo_doador || '',
        dia_semana: firstDoador.dia_semana || '',
        regiao: firstDoador.regiao || '',
        mapa: firstDoador.mapa || '',
        historico: firstDoador.historico || ''
      });
      setIsInitialLoad(false);
    }
    setIsLoading(false);
  };

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    loadDoadores();
  }, [currentPage]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // CEP Automatic Fill
  const handleCepBlur = async () => {
    const cep = formState.cep?.replace(/\D/g, '') || '';
    if (cep.length !== 8) return;

    setIsCepLoading(true);
    const result = await fetchAddressByCep(cep);
    setIsCepLoading(false);

    if (result) {
      setFormState(prev => ({
        ...prev,
        logradouro: result.logradouro ? 'Rua' : prev.logradouro,
        endereco: result.logradouro || prev.endereco,
        bairro: result.bairro || prev.bairro,
        cidade: result.localidade || prev.cidade,
        estado: result.uf || prev.estado,
        mapa: prev.mapa || `https://maps.google.com/?q=${result.localidade}+${result.uf}`
      }));
      showFeedback('success', 'Endereço localizado com sucesso!');
    } else {
      showFeedback('error', 'CEP não localizado ou erro na consulta.');
    }
  };

  // Reset/Clear Form
  const handleReset = () => {
    setSelectedDoador(null);
    setFormState({
      nome: '',
      data_cadastro: new Date().toISOString().split('T')[0],
      celular: '',
      fixo: '',
      contato: '',
      email: '',
      whatsapp: '',
      cep: '',
      logradouro: '',
      endereco: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cod_tlmk: '',
      cod_matcob: '',
      tipo_doador: '',
      dia_semana: '',
      regiao: '',
      mapa: '',
      historico: ''
    });
  };

  // Submit Handler (Create/Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.nome) {
      showFeedback('error', 'O campo Nome Completo é obrigatório!');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedDoador) {
        // UPDATE
        if (isRealSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('doadores')
            .update(formState)
            .eq('codigo_doador', selectedDoador.codigo_doador);
          if (error) throw error;
        } else {
          const list = dbMock.get<Doador>('DOADORES');
          const updated = list.map(item => 
            item.codigo_doador === selectedDoador.codigo_doador 
              ? { ...item, ...formState } 
              : item
          );
          dbMock.save('DOADORES', updated);
        }
        await addLog('Alterou Doador', 'Doadores', `Doador: ${formState.nome} (Código: ${selectedDoador.codigo_doador})`);
        showFeedback('success', `Doador "${formState.nome}" atualizado com sucesso!`);
      } else {
        // CREATE
        if (isRealSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('doadores')
            .insert(formState);
          if (error) throw error;
        } else {
          const list = dbMock.get<Doador>('DOADORES');
          const nextId = list.length > 0 ? Math.max(...list.map(d => d.codigo_doador)) + 1 : 1;
          const newDoador: Doador = {
            codigo_doador: nextId,
            ...formState,
            created_at: new Date().toISOString()
          };
          dbMock.save('DOADORES', [...list, newDoador]);
        }
        await addLog('Cadastrou Doador', 'Doadores', `Doador: ${formState.nome}`);
        showFeedback('success', `Doador "${formState.nome}" cadastrado com sucesso!`);
      }
      handleReset();
      setCurrentPage(1);
    } catch (e: any) {
      console.error(e);
      showFeedback('error', 'Ocorreu um erro ao salvar o doador: ' + e.message);
    }
    setIsLoading(false);
  };

  // Select item for Editing
  const handleEditSelect = (doador: Doador, shouldScroll = true) => {
    setSelectedDoador(doador);
    setFormState({
      nome: doador.nome || '',
      data_cadastro: doador.data_cadastro || new Date().toISOString().split('T')[0],
      celular: doador.celular || '',
      fixo: doador.fixo || '',
      contato: doador.contato || '',
      email: doador.email || '',
      whatsapp: doador.whatsapp || '',
      cep: doador.cep || '',
      logradouro: doador.logradouro || '',
      endereco: doador.endereco || '',
      complemento: doador.complemento || '',
      bairro: doador.bairro || '',
      cidade: doador.cidade || '',
      estado: doador.estado || '',
      cod_tlmk: doador.cod_tlmk || '',
      cod_matcob: doador.cod_matcob || '',
      tipo_doador: doador.tipo_doador || '',
      dia_semana: doador.dia_semana || '',
      regiao: doador.regiao || '',
      mapa: doador.mapa || '',
      historico: doador.historico || ''
    });
    // Scroll form into view gently
    if (shouldScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Delete Handler
  const handleDelete = async (codigo: number, nome: string) => {
    if (!confirm(`Tem certeza absoluta que deseja excluir o doador "${nome}"?`)) {
      return;
    }

    setIsLoading(true);
    try {
      if (isRealSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('doadores')
          .delete()
          .eq('codigo_doador', codigo);
        if (error) throw error;
      } else {
        const list = dbMock.get<Doador>('DOADORES');
        dbMock.save('DOADORES', list.filter(item => item.codigo_doador !== codigo));
      }
      await addLog('Excluiu Doador', 'Doadores', `Doador: ${nome} (Código: ${codigo})`);
      showFeedback('success', `Doador "${nome}" excluído com sucesso!`);
      setCurrentPage(1);
      if (selectedDoador?.codigo_doador === codigo) {
        handleReset();
      }
    } catch (e: any) {
      console.error(e);
      showFeedback('error', 'Erro ao excluir doador: ' + e.message);
    }
    setIsLoading(false);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const getDisplayRegistry = () => {
    const totalStr = String(totalCount).padStart(6, '0');
    if (!selectedDoador) {
      return `Novo / ${totalStr}`;
    }
    const idx = doadores.findIndex(d => d.codigo_doador === selectedDoador.codigo_doador);
    if (idx === -1) {
      return `0 / ${totalStr}`;
    }
    const globalIdx = (currentPage - 1) * pageSize + idx + 1;
    return `${globalIdx} / ${totalStr}`;
  };

  // Record Navigation handlers
  const handleGoFirst = () => {
    if (doadores.length > 0) {
      handleEditSelect(doadores[0], false);
    }
  };

  const handleGoLast = () => {
    if (doadores.length > 0) {
      handleEditSelect(doadores[doadores.length - 1], false);
    }
  };

  const handleGoPrev = () => {
    if (doadores.length === 0) return;
    if (!selectedDoador) {
      handleEditSelect(doadores[doadores.length - 1], false);
      return;
    }
    const idx = doadores.findIndex(d => d.codigo_doador === selectedDoador.codigo_doador);
    if (idx > 0) {
      handleEditSelect(doadores[idx - 1], false);
    }
  };

  const handleGoNext = () => {
    if (doadores.length === 0) return;
    if (!selectedDoador) {
      handleEditSelect(doadores[0], false);
      return;
    }
    const idx = doadores.findIndex(d => d.codigo_doador === selectedDoador.codigo_doador);
    if (idx < doadores.length - 1) {
      handleEditSelect(doadores[idx + 1], false);
    }
  };

  const handleCancel = () => {
    if (selectedDoador) {
      handleEditSelect(selectedDoador, false);
    } else if (doadores.length > 0) {
      handleEditSelect(doadores[0], false);
    } else {
      handleReset();
    }
    showFeedback('success', 'Operação cancelada/restaurada.');
  };

  const hasSearch = searchFields.codigo || searchFields.nome || searchFields.cep || searchFields.telefone;
  const filteredDoadores = hasSearch ? doadores.filter(d => {
    const matchCodigo = !searchFields.codigo || String(d.codigo_doador).includes(searchFields.codigo);
    const matchNome = !searchFields.nome || d.nome.toLowerCase().includes(searchFields.nome.toLowerCase());
    const matchCep = !searchFields.cep || (d.cep || '').includes(searchFields.cep);
    const matchTel = !searchFields.telefone || 
      (d.celular || '').includes(searchFields.telefone) || 
      (d.fixo || '').includes(searchFields.telefone);
    return matchCodigo && matchNome && matchCep && matchTel;
  }) : doadores;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Feedback Alert */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg transition-all ${
          message.type === 'success' 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' 
            : 'bg-red-500/20 border-red-500/30 text-red-100'
        }`}>
          {message.type === 'success' ? <Sparkles className="text-emerald-400 mt-0.5" size={18} /> : <AlertCircle className="text-red-400 mt-0.5" size={18} />}
          <div>
            <p className="font-bold text-sm">{message.type === 'success' ? 'Sucesso!' : 'Ocorreu um erro'}</p>
            <p className="text-xs mt-0.5 opacity-90">{message.text}</p>
          </div>
        </div>
      )}

      {/* Main Form Block */}
      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <header className="h-14 flex items-center justify-between px-6 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10">
          <div className="flex items-center gap-3">
            <UserPlus className="text-blue-300 drop-shadow" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide text-glow">
              {selectedDoador ? `Alterando Doador: #${selectedDoador.codigo_doador}` : 'Ficha de Cadastro de Doador'}
            </h2>
          </div>
          <span className="text-[10px] bg-white/10 text-white/70 px-2.5 py-1 rounded border border-white/10 font-bold uppercase tracking-wider font-mono">
            {selectedDoador ? 'Edição' : 'Novo Registro'}
          </span>
        </header>

        {/* Search / Filter Bar */}
        <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
          <div className="flex flex-col md:flex-row items-end gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-[80px]">
              <label className="text-[9px] font-bold uppercase tracking-wider text-white/40">Cód. Doador</label>
              <input
                type="text"
                placeholder="000000"
                value={searchFields.codigo}
                onChange={e => setSearchFields(prev => ({ ...prev, codigo: e.target.value }))}
                className="aero-input-gloss w-full h-9 px-3 rounded-lg text-xs font-mono"
              />
            </div>
            <div className="flex flex-col gap-1 flex-[3] min-w-[180px]">
              <label className="text-[9px] font-bold uppercase tracking-wider text-white/40">Nome Doador</label>
              <input
                type="text"
                placeholder="Nome do doador..."
                value={searchFields.nome}
                onChange={e => setSearchFields(prev => ({ ...prev, nome: e.target.value }))}
                className="aero-input-gloss w-full h-9 px-3 rounded-lg text-xs"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
              <label className="text-[9px] font-bold uppercase tracking-wider text-white/40">CEP</label>
              <input
                type="text"
                placeholder="00000-000"
                value={searchFields.cep}
                onChange={e => setSearchFields(prev => ({ ...prev, cep: e.target.value }))}
                className="aero-input-gloss w-full h-9 px-3 rounded-lg text-xs font-mono"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
              <label className="text-[9px] font-bold uppercase tracking-wider text-white/40">Telefone</label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={searchFields.telefone}
                onChange={e => setSearchFields(prev => ({ ...prev, telefone: e.target.value }))}
                className="aero-input-gloss w-full h-9 px-3 rounded-lg text-xs"
              />
            </div>
            <div className="flex items-center gap-2 pb-[2px]">
              <button
                type="button"
                onClick={() => setSearchFields(prev => ({ ...prev }))}
                className="h-9 px-5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Search size={12} />
                Filtrar
              </button>
              <button
                type="button"
                onClick={() => setSearchFields({ codigo: '', nome: '', cep: '', telefone: '' })}
                className="h-9 px-5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/70 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
              >
                <X size={12} />
                Limpar
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8 relative z-10">
          {/* SELETOR DE DOADOR CADASTRADO E NAVEGAÇÃO DE REGISTROS */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-5">
            {/* Top Row: Dropdown and Transition to Doações */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Carregar Doador Cadastrado (Seleção Direta)</label>
                <select
                  id="seletor-doador"
                  value={selectedDoador ? selectedDoador.codigo_doador : ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '') {
                      handleReset();
                    } else {
                      const found = doadores.find(d => d.codigo_doador === Number(val));
                      if (found) handleEditSelect(found, false);
                    }
                  }}
                  className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm font-semibold cursor-pointer appearance-none text-white bg-slate-950/80"
                >
                  <option value="" className="bg-slate-900 text-white/50">-- Novo Cadastro de Doador --</option>
                  {doadores.map(d => (
                    <option key={d.codigo_doador} value={d.codigo_doador} className="bg-slate-900 text-white">
                      #{String(d.codigo_doador).padStart(4, '0')} - {d.nome} {d.cidade ? `(${d.cidade}/${d.estado})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transition Button to Cadastro de Doações */}
              <div className="flex items-end">
                {selectedDoador && onOpenDoacoes ? (
                  <button
                    id="btn-lancar-doacao"
                    type="button"
                    onClick={() => onOpenDoacoes(selectedDoador.codigo_doador)}
                    className="h-10 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.02] active:scale-95 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 whitespace-nowrap w-full lg:w-auto"
                    title="Transferir para Cadastro de Doações"
                  >
                    <Gift size={14} className="text-purple-300" />
                    <span>Lançar Doação para este Doador</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="h-10 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-white/5 text-white/30 border border-white/5 whitespace-nowrap w-full lg:w-auto cursor-not-allowed animate-pulse"
                  >
                    <Gift size={14} />
                    <span>Lançar Doação (Selecione um Doador)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Row: Navigation Controls and Form Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
              {/* Record Navigation controls */}
              <div className="flex items-center gap-2 bg-black/30 p-1.5 rounded-xl border border-white/5">
                <button
                  id="btn-nav-primeiro"
                  type="button"
                  onClick={handleGoFirst}
                  disabled={doadores.length === 0 || (selectedDoador && doadores[0]?.codigo_doador === selectedDoador.codigo_doador)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all border border-white/10 text-white cursor-pointer"
                  title="Primeiro Registro"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  id="btn-nav-anterior"
                  type="button"
                  onClick={handleGoPrev}
                  disabled={doadores.length === 0 || (selectedDoador && doadores[0]?.codigo_doador === selectedDoador.codigo_doador)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all border border-white/10 text-white cursor-pointer"
                  title="Registro Anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Display format e.g. 1 / 046944 */}
                <span className="font-mono text-xs font-extrabold px-3 py-1.5 bg-black/50 text-blue-300 border border-white/10 rounded-lg min-w-[110px] text-center tracking-wider">
                  {getDisplayRegistry()}
                </span>

                <button
                  id="btn-nav-proximo"
                  type="button"
                  onClick={handleGoNext}
                  disabled={doadores.length === 0 || !selectedDoador || (selectedDoador && doadores[doadores.length - 1]?.codigo_doador === selectedDoador.codigo_doador)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all border border-white/10 text-white cursor-pointer"
                  title="Próximo Registro"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  id="btn-nav-ultimo"
                  type="button"
                  onClick={handleGoLast}
                  disabled={doadores.length === 0 || !selectedDoador || (selectedDoador && doadores[doadores.length - 1]?.codigo_doador === selectedDoador.codigo_doador)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all border border-white/10 text-white cursor-pointer"
                  title="Último Registro"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>

              {/* Page Navigation controls */}
              {isRealSupabaseConfigured && supabase && (
                <div className="flex items-center gap-2 bg-black/30 p-1.5 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all border border-white/10 text-white cursor-pointer"
                    title="Página Anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-mono text-xs font-extrabold px-3 py-1.5 bg-black/50 text-emerald-300 border border-white/10 rounded-lg min-w-[110px] text-center tracking-wider">
                    Pág {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all border border-white/10 text-white cursor-pointer"
                    title="Próxima Página"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Action buttons: + Novo, Salvar, Cancelar, Excluir */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-action-novo"
                  type="button"
                  onClick={handleReset}
                  className="px-4 h-9 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                  title="Iniciar Novo Cadastro"
                >
                  <Plus size={14} />
                  <span>+ Novo</span>
                </button>

                <button
                  id="btn-action-cancelar"
                  type="button"
                  onClick={handleCancel}
                  className="px-4 h-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white/80 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                  title="Cancelar alterações e restaurar"
                >
                  <X size={14} />
                  <span>Cancelar</span>
                </button>

                <button
                  id="btn-action-salvar"
                  type="submit"
                  disabled={isLoading}
                  className="px-5 h-9 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                  title="Salvar Registro"
                >
                  {isLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>Salvar</span>
                </button>

                {selectedDoador && (
                  <button
                    id="btn-action-excluir"
                    type="button"
                    onClick={() => handleDelete(selectedDoador.codigo_doador, selectedDoador.nome)}
                    className="px-3 h-9 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-300 text-xs font-bold transition-all cursor-pointer"
                    title="Excluir Registro Atual"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Group 1: Identificação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/60">Código Doador</label>
              <input
                type="text"
                readOnly
                value={selectedDoador ? String(selectedDoador.codigo_doador).padStart(6, '0') : 'AUTO-INCREMENTAL'}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm font-semibold opacity-60 cursor-not-allowed text-blue-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Data de Cadastro <span className="text-red-400">*</span></label>
              <input
                type="date"
                required
                value={formState.data_cadastro}
                onChange={e => setFormState(prev => ({ ...prev, data_cadastro: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Celular</label>
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                value={formState.celular}
                onChange={e => setFormState(prev => ({ ...prev, celular: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Fixo</label>
              <input
                type="tel"
                placeholder="(00) 0000-0000"
                value={formState.fixo}
                onChange={e => setFormState(prev => ({ ...prev, fixo: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Group 2: Pessoais / Contatos */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-6 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Nome Completo / Razão Social <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                placeholder="Nome do doador"
                value={formState.nome}
                onChange={e => setFormState(prev => ({ ...prev, nome: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="md:col-span-6 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Contato / Referência</label>
              <input
                type="text"
                placeholder="Ex: Esposa, Filho, Vizinho"
                value={formState.contato}
                onChange={e => setFormState(prev => ({ ...prev, contato: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="md:col-span-8 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">E-mail de Contato</label>
              <input
                type="email"
                placeholder="doador@provedor.com"
                value={formState.email}
                onChange={e => setFormState(prev => ({ ...prev, email: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="md:col-span-4 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">WhatsApp</label>
              <input
                type="tel"
                placeholder="(00) 90000-0000"
                value={formState.whatsapp}
                onChange={e => setFormState(prev => ({ ...prev, whatsapp: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Group 3: Localização Residencial (Aero Inner Panel) */}
          <div className="p-6 rounded-2xl aero-inner-panel space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <MapPin className="text-blue-300" size={15} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Endereço de Coleta</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-3 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">CEP</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={9}
                    placeholder="00000-000"
                    value={formState.cep}
                    onChange={e => setFormState(prev => ({ ...prev, cep: e.target.value }))}
                    onBlur={handleCepBlur}
                    className="aero-input-gloss w-full h-10 pl-4 pr-10 rounded-xl text-sm font-mono"
                  />
                  {isCepLoading && (
                    <span className="absolute right-3 top-2.5 animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  )}
                </div>
              </div>

              <div className="md:col-span-3 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Logradouro</label>
                <select
                  value={formState.logradouro}
                  onChange={e => setFormState(prev => ({ ...prev, logradouro: e.target.value }))}
                  className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm cursor-pointer appearance-none"
                >
                  <option value="" className="bg-slate-900">Selecione...</option>
                  <option value="Rua" className="bg-slate-900">Rua</option>
                  <option value="Avenida" className="bg-slate-900">Avenida</option>
                  <option value="Alameda" className="bg-slate-900">Alameda</option>
                  <option value="Travessa" className="bg-slate-900">Travessa</option>
                  <option value="Praça" className="bg-slate-900">Praça</option>
                  <option value="Rodovia" className="bg-slate-900">Rodovia</option>
                  <option value="Outro" className="bg-slate-900">Outro</option>
                </select>
              </div>

              <div className="md:col-span-6 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Endereço / Número <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Nome do logradouro, número, apto..."
                  value={formState.endereco}
                  onChange={e => setFormState(prev => ({ ...prev, endereco: e.target.value }))}
                  className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Complemento</label>
                <input
                  type="text"
                  placeholder="Apartamento, Bloco, fundos..."
                  value={formState.complemento}
                  onChange={e => setFormState(prev => ({ ...prev, complemento: e.target.value }))}
                  className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
                />
              </div>

              <div className="md:col-span-3 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Bairro</label>
                <input
                  type="text"
                  placeholder="Bairro de coleta"
                  value={formState.bairro}
                  onChange={e => setFormState(prev => ({ ...prev, bairro: e.target.value }))}
                  className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
                />
              </div>

              <div className="md:col-span-3 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Cidade</label>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={formState.cidade}
                  onChange={e => setFormState(prev => ({ ...prev, cidade: e.target.value }))}
                  className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="SP"
                  value={formState.estado}
                  onChange={e => setFormState(prev => ({ ...prev, estado: e.target.value.toUpperCase() }))}
                  className="aero-input-gloss w-full h-10 px-1 rounded-xl text-sm text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* Group 4: Classificação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Cód. Telemarketing</label>
              <input
                type="text"
                placeholder="Ex: TLMK-01"
                value={formState.cod_tlmk}
                onChange={e => setFormState(prev => ({ ...prev, cod_tlmk: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Cód. Matriz Cobrança</label>
              <input
                type="text"
                placeholder="Ex: COB-10"
                value={formState.cod_matcob}
                onChange={e => setFormState(prev => ({ ...prev, cod_matcob: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Tipo de Doador</label>
              <select
                value={formState.tipo_doador}
                onChange={e => setFormState(prev => ({ ...prev, tipo_doador: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm cursor-pointer appearance-none"
              >
                <option value="" className="bg-slate-900">Selecione...</option>
                <option value="Pessoa Física" className="bg-slate-900">Pessoa Física</option>
                <option value="Pessoa Jurídica" className="bg-slate-900">Pessoa Jurídica</option>
                <option value="Especial" className="bg-slate-900">Especial</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Dia Preferencial de Coleta</label>
              <select
                value={formState.dia_semana}
                onChange={e => setFormState(prev => ({ ...prev, dia_semana: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm cursor-pointer appearance-none"
              >
                <option value="" className="bg-slate-900">Qualquer dia</option>
                <option value="Segunda-feira" className="bg-slate-900">Segunda-feira</option>
                <option value="Terça-feira" className="bg-slate-900">Terça-feira</option>
                <option value="Quarta-feira" className="bg-slate-900">Quarta-feira</option>
                <option value="Quinta-feira" className="bg-slate-900">Quinta-feira</option>
                <option value="Sexta-feira" className="bg-slate-900">Sexta-feira</option>
                <option value="Sábado" className="bg-slate-900">Sábado</option>
              </select>
            </div>
          </div>

          {/* Group 5: Região e Histórico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Região / Setor</label>
                <input
                  type="text"
                  placeholder="Ex: Zona Norte, Centro, Região Metropolitana"
                  value={formState.regiao}
                  onChange={e => setFormState(prev => ({ ...prev, regiao: e.target.value }))}
                  className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Coordenadas / URL do Mapa</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="https://maps.google.com/?q=..."
                    value={formState.mapa}
                    onChange={e => setFormState(prev => ({ ...prev, mapa: e.target.value }))}
                    className="aero-input-gloss flex-1 h-10 px-4 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Histórico / Notas Internas</label>
              <textarea
                rows={4}
                placeholder="Observações importantes sobre o doador, rotina de entrega, preferências ou restrições..."
                value={formState.historico}
                onChange={e => setFormState(prev => ({ ...prev, historico: e.target.value }))}
                className="aero-input-gloss w-full p-4 rounded-xl text-sm resize-none h-[126px]"
              />
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-white/10 gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto px-6 h-11 rounded-xl text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
            >
              Cancelar / Reverter
            </button>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 sm:flex-none px-6 h-11 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-200 font-bold text-xs uppercase tracking-wider"
              >
                + Novo Cadastro
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="aero-button-primary flex-1 sm:flex-none px-10 h-11 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <>
                    <Save size={15} />
                    {selectedDoador ? 'Gravar Alteração' : 'Gravar Doador'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};
