import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Motorista } from '../types';
import { 
  UserCheck, Save, Trash2, Edit3, Plus, X, Search, AlertCircle, CheckCircle, RefreshCw, Phone
} from 'lucide-react';

export const Motoristas: React.FC = () => {
  const { user, addLog } = useThemeAuth();
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    nome: '',
    rg: '',
    cpf: '',
    telefone: '',
    data: new Date().toISOString().split('T')[0],
    ativo: true
  });

  const loadData = async () => {
    setLoading(true);
    if (isRealSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('motoristas')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setMotoristas(data || []);
      } catch (e: any) {
        console.error('Erro ao ler motoristas do Supabase:', e);
        setMotoristas(dbMock.get<Motorista>('MOTORISTAS'));
      }
    } else {
      setMotoristas(dbMock.get<Motorista>('MOTORISTAS'));
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
      nome: '',
      rg: '',
      cpf: '',
      telefone: '',
      data: new Date().toISOString().split('T')[0],
      ativo: true
    });
  };

  const handleSelectEdit = (m: Motorista) => {
    setSelectedId(m.id);
    setFormState({
      nome: m.nome || '',
      rg: m.rg || '',
      cpf: m.cpf || '',
      telefone: m.telefone || '',
      data: m.created_at ? m.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      ativo: m.ativo !== undefined ? m.ativo : true
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.nome.trim()) {
      showFeedback('error', 'O nome completo do motorista é obrigatório.');
      return;
    }

    setLoading(true);
    try {
      if (selectedId) {
        if (isRealSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('motoristas')
            .update({
              nome: formState.nome.trim(),
              rg: formState.rg.trim(),
              cpf: formState.cpf.trim(),
              telefone: formState.telefone.trim(),
              ativo: formState.ativo
            })
            .eq('id', selectedId);
          if (error) throw error;
        } else {
          const all = dbMock.get<Motorista>('MOTORISTAS');
          const updated = all.map(m => m.id === selectedId ? {
            ...m,
            nome: formState.nome.trim(),
            rg: formState.rg.trim(),
            cpf: formState.cpf.trim(),
            telefone: formState.telefone.trim(),
            ativo: formState.ativo
          } : m);
          dbMock.save('MOTORISTAS', updated);
        }

        if (addLog) addLog('Atualizou motorista', 'Frota / Motoristas', `ID: ${selectedId}, Nome: ${formState.nome.trim()}`);
        showFeedback('success', 'Motorista atualizado com sucesso!');
      } else {
        const newM: Motorista = {
          id: crypto.randomUUID(),
          nome: formState.nome.trim(),
          rg: formState.rg.trim(),
          cpf: formState.cpf.trim(),
          telefone: formState.telefone.trim(),
          ativo: formState.ativo,
          created_at: new Date(formState.data + 'T12:00:00').toISOString()
        };

        if (isRealSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('motoristas')
            .insert([newM]);
          if (error) throw error;
        } else {
          const all = dbMock.get<Motorista>('MOTORISTAS');
          dbMock.save('MOTORISTAS', [newM, ...all]);
        }

        if (addLog) addLog('Cadastrou motorista', 'Frota / Motoristas', `Nome: ${formState.nome.trim()}`);
        showFeedback('success', 'Novo motorista cadastrado com sucesso!');
      }

      handleReset();
      loadData();
    } catch (e: any) {
      showFeedback('error', 'Erro ao salvar motorista: ' + e.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o motorista ${name}?`)) return;

    setLoading(true);
    try {
      if (isRealSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('motoristas')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } else {
        const all = dbMock.get<Motorista>('MOTORISTAS');
        const filtered = all.filter(m => m.id !== id);
        dbMock.save('MOTORISTAS', filtered);
      }

      if (addLog) addLog('Excluiu motorista', 'Frota / Motoristas', `ID: ${id}, Nome: ${name}`);
      showFeedback('success', 'Motorista excluído com sucesso!');
      loadData();
    } catch (e: any) {
      showFeedback('error', 'Erro ao excluir motorista: ' + e.message);
    }
    setLoading(false);
  };

  const filteredMotoristas = motoristas.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.cpf || '').includes(searchTerm) ||
    (m.rg || '').includes(searchTerm)
  );

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
            <UserCheck className="text-blue-300 drop-shadow animate-pulse" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide text-glow">
              {selectedId ? `Alterando Motorista: ${formState.nome}` : 'Frota de Coleta: Novo Motorista'}
            </h2>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2.5 py-1 rounded border border-emerald-500/30 font-bold uppercase tracking-wider font-mono">
            Controle de Motoristas
          </span>
        </header>

        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Data de Registro <span className="text-red-400">*</span></label>
              <input
                type="date"
                required
                value={formState.data}
                onChange={e => setFormState(prev => ({ ...prev, data: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="md:col-span-5 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Nome Completo <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                placeholder="Ex: Reginaldo Ribeiro Silva"
                value={formState.nome}
                onChange={e => setFormState(prev => ({ ...prev, nome: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">RG</label>
              <input
                type="text"
                placeholder="00.000.000-0"
                value={formState.rg}
                onChange={e => setFormState(prev => ({ ...prev, rg: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm text-center"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">CPF</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={formState.cpf}
                onChange={e => setFormState(prev => ({ ...prev, cpf: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm text-center"
              />
            </div>

            <div className="md:col-span-4 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-sans flex items-center gap-1">
                <Phone size={10} /> Telefone / WhatsApp
              </label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={formState.telefone}
                onChange={e => setFormState(prev => ({ ...prev, telefone: e.target.value }))}
                className="aero-input-gloss w-full h-10 px-4 rounded-xl text-sm"
              />
            </div>

            <div className="md:col-span-3 flex flex-col gap-1.5">
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
              <span>Salvar Motorista</span>
            </button>
          </div>
        </form>
      </section>

      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <header className="h-14 flex flex-col md:flex-row md:items-center justify-between px-6 py-3 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-bold text-sm tracking-wide text-glow uppercase">
              Motoristas Cadastrados
            </h2>
            <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-slate-300">
              {filteredMotoristas.length}
            </span>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar motorista, CPF, RG..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="aero-input-gloss w-full h-9 pl-9 pr-4 rounded-xl text-xs"
            />
          </div>
        </header>

        {filteredMotoristas.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
              <UserCheck className="text-slate-500 dark:text-slate-400" size={28} />
            </div>
            <p className="font-bold text-slate-300 mb-1">Nenhum motorista cadastrado.</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Comece adicionando seu primeiro motorista no formulário acima para listar sua equipe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5">
                  <th className="py-3 px-6">Data Cadastro</th>
                  <th className="py-3 px-6">Nome Completo</th>
                  <th className="py-3 px-6 text-center">RG / CPF</th>
                  <th className="py-3 px-6 text-center">Contato</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredMotoristas.map(m => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-6 font-mono text-slate-400">
                      {m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-3 px-6 font-bold text-white">
                      {m.nome}
                    </td>
                    <td className="py-3 px-6 text-center font-mono text-slate-300 text-[11px]">
                      <div>{m.rg || 'Sem RG'}</div>
                      <div className="text-[10px] text-slate-500">{m.cpf || 'Sem CPF'}</div>
                    </td>
                    <td className="py-3 px-6 text-center text-slate-300">
                      {m.telefone || '-'}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        m.ativo !== false 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/20'
                      }`}>
                        {m.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleSelectEdit(m)}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition-all cursor-pointer"
                        title="Editar Motorista"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id, m.nome)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 transition-all cursor-pointer"
                        title="Excluir Motorista"
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
