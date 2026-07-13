/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Veiculo } from '../types';
import { 
  Car, Save, Trash2, Edit3, Plus, X, Search, AlertCircle, CheckCircle, RefreshCw
} from 'lucide-react';

export const Veiculos: React.FC = () => {
  const { user, addLog } = useThemeAuth();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Alert Feedbacks
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    descricao: '',
    placa: '',
    data: new Date().toISOString().split('T')[0],
    ativo: true
  });

  const loadData = async () => {
    setLoading(true);
    if (isRealSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('veiculos')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setVeiculos(data || []);
      } catch (e: any) {
        console.error('Erro ao ler veículos do Supabase:', e);
        setVeiculos(dbMock.get<Veiculo>('VEICULOS'));
      }
    } else {
      setVeiculos(dbMock.get<Veiculo>('VEICULOS'));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      setSuccessMsg(text);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(text);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleReset = () => {
    setSelectedId(null);
    setFormState({
      descricao: '',
      placa: '',
      data: new Date().toISOString().split('T')[0],
      ativo: true
    });
  };

  const handleSelectEdit = (v: Veiculo) => {
    setSelectedId(v.id);
    setFormState({
      descricao: v.descricao || '',
      placa: v.placa || '',
      data: v.created_at ? v.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      ativo: v.ativo !== undefined ? v.ativo : true
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.descricao.trim() || !formState.placa.trim()) {
      showFeedback('error', 'Preencha a descrição do veículo e a placa.');
      return;
    }

    setLoading(true);
    const updatedPlaca = formState.placa.trim().toUpperCase();

    try {
      if (selectedId) {
        // Edit mode
        if (isRealSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('veiculos')
            .update({
              descricao: formState.descricao.trim(),
              placa: updatedPlaca,
              ativo: formState.ativo
            })
            .eq('id', selectedId);
          if (error) throw error;
        } else {
          const all = dbMock.get<Veiculo>('VEICULOS');
          const updated = all.map(v => v.id === selectedId ? {
            ...v,
            descricao: formState.descricao.trim(),
            placa: updatedPlaca,
            ativo: formState.ativo
          } : v);
          dbMock.save('VEICULOS', updated);
        }

        if (addLog) addLog('Atualizou veículo', 'Frota / Veículos', `ID: ${selectedId}, Placa: ${updatedPlaca}`);
        showFeedback('success', 'Veículo atualizado com sucesso!');
      } else {
        // Create mode
        const newV: Veiculo = {
          id: crypto.randomUUID(),
          descricao: formState.descricao.trim(),
          placa: updatedPlaca,
          ativo: formState.ativo,
          created_at: new Date(formState.data + 'T12:00:00').toISOString()
        };

        if (isRealSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('veiculos')
            .insert([newV]);
          if (error) throw error;
        } else {
          const all = dbMock.get<Veiculo>('VEICULOS');
          dbMock.save('VEICULOS', [newV, ...all]);
        }

        if (addLog) addLog('Cadastrou veículo', 'Frota / Veículos', `Placa: ${updatedPlaca}`);
        showFeedback('success', 'Novo veículo cadastrado com sucesso!');
      }

      handleReset();
      loadData();
    } catch (e: any) {
      showFeedback('error', 'Erro ao salvar veículo: ' + e.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, desc: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o veículo ${desc}?`)) return;

    setLoading(true);
    try {
      if (isRealSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('veiculos')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } else {
        const all = dbMock.get<Veiculo>('VEICULOS');
        const filtered = all.filter(v => v.id !== id);
        dbMock.save('VEICULOS', filtered);
      }

      if (addLog) addLog('Excluiu veículo', 'Frota / Veículos', `ID: ${id}, Desc: ${desc}`);
      showFeedback('success', 'Veículo excluído com sucesso!');
      loadData();
    } catch (e: any) {
      showFeedback('error', 'Erro ao excluir veículo: ' + e.message);
    }
    setLoading(false);
  };

  const filteredVeiculos = veiculos.filter(v => 
    v.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.placa || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Alert Banners */}
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

      {/* Main Registration Box */}
      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <header className="h-14 flex items-center justify-between px-6 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10">
          <div className="flex items-center gap-3">
            <Car className="text-blue-300 drop-shadow animate-pulse" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide text-glow">
              {selectedId ? `Alterando Veículo: ${formState.descricao}` : 'Frota de Coleta: Novo Veículo'}
            </h2>
          </div>
          <span className="text-[10px] bg-blue-500/20 text-blue-200 px-2.5 py-1 rounded border border-blue-500/30 font-bold uppercase tracking-wider font-mono">
            Controle de Veículos
          </span>
        </header>

        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Date Field */}
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Data de Cadastro <span className="text-red-400">*</span></label>
              <input
                type="date"
                required
                value={formState.data}
                onChange={e => setFormState(prev => ({ ...prev, data: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            {/* Vehicle Description */}
            <div className="md:col-span-5 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Veículo (Descrição) <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                placeholder="Ex: Caminhão Mercedes Benz L1620"
                value={formState.descricao}
                onChange={e => setFormState(prev => ({ ...prev, descricao: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            {/* Placa */}
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Placa <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                placeholder="ABC-1234"
                maxLength={8}
                value={formState.placa}
                onChange={e => setFormState(prev => ({ ...prev, placa: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm uppercase font-mono text-center tracking-wider"
              />
            </div>

            {/* Active Switch */}
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Status</label>
              <select
                value={formState.ativo ? 'true' : 'false'}
                onChange={e => setFormState(prev => ({ ...prev, ativo: e.target.value === 'true' }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm cursor-pointer appearance-none text-center"
              >
                <option value="true" className="bg-slate-900 text-white">Ativo</option>
                <option value="false" className="bg-slate-900 text-white">Inativo</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl text-white/50 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Limpar / Cancelar
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
              <span>Salvar Veículo</span>
            </button>
          </div>
        </form>
      </section>

      {/* List Section */}
      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <header className="h-14 flex flex-col md:flex-row md:items-center justify-between px-6 py-3 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-bold text-sm tracking-wide text-glow uppercase">
              Veículos Cadastrados
            </h2>
            <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-slate-300">
              {filteredVeiculos.length}
            </span>
          </div>

          {/* Search filter */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar veículo ou placa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="aero-input-gloss w-full h-9 pl-9 pr-4 rounded-xl text-xs"
            />
          </div>
        </header>

        {filteredVeiculos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
              <Car className="text-slate-500 dark:text-slate-400" size={28} />
            </div>
            <p className="font-bold text-slate-300 mb-1">Nenhum veículo cadastrado.</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Comece adicionando seu primeiro veículo no formulário acima para gerenciar sua frota.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5">
                  <th className="py-3 px-6">Data Cadastro</th>
                  <th className="py-3 px-6">Descrição / Veículo</th>
                  <th className="py-3 px-6 text-center">Placa</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredVeiculos.map(v => (
                  <tr key={v.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-6 font-mono text-slate-400">
                      {v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-3 px-6 font-bold text-white">
                      {v.descricao}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className="bg-slate-800 border border-slate-700/50 rounded-md px-2 py-0.5 font-mono font-bold tracking-wider text-slate-200">
                        {v.placa}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        v.ativo !== false 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/20'
                      }`}>
                        {v.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleSelectEdit(v)}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition-all cursor-pointer"
                        title="Editar Veículo"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id, v.descricao)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 transition-all cursor-pointer"
                        title="Excluir Veículo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
