/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock, fetchAllRecords } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Doacao, Doador, ItemDoacao, ItemCatalogo } from '../types';
import { 
  Search, Save, Printer, Info, CheckCircle2, AlertCircle, 
  Calendar, User, X, CheckSquare, RefreshCw, Loader2, Package, Inbox, Clock
} from 'lucide-react';

export const StatusIndividual: React.FC = () => {
  const { addLog, user } = useThemeAuth();
  
  // Data lists
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const [itensDoacao, setItensDoacao] = useState<ItemDoacao[]>([]);
  const [catalogItems, setCatalogItems] = useState<ItemCatalogo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoacao, setSelectedDoacao] = useState<Doacao | null>(null);
  const [selectedDoador, setSelectedDoador] = useState<Doador | null>(null);
  const [selectedItems, setSelectedItems] = useState<ItemDoacao[]>([]);
  
  // Form states for status modification
  const [actionType, setActionType] = useState<'baixar' | 'remarcar' | 'cancelar'>('baixar');
  const [dataRetirada, setDataRetirada] = useState('');
  const [dataBaixa, setDataBaixa] = useState('');
  const [dataRemarcar, setDataRemarcar] = useState('');
  const [dataCancelamento, setDataCancelamento] = useState('');
  const [motivoAlteracao, setMotivoAlteracao] = useState('');
  const [responsavel, setResponsavel] = useState('');

  // Status message state
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    let docs: Doacao[] = [];
    let donors: Doador[] = [];
    let items: ItemDoacao[] = [];
    let catalog: ItemCatalogo[] = [];

    if (isRealSupabaseConfigured && supabase) {
      try {
        docs = await fetchAllRecords<any>('doacoes', { order: { column: 'codigo_doacao', ascending: false } });
        donors = await fetchAllRecords<any>('doadores');
        items = await fetchAllRecords<any>('itens_doacao');
        catalog = await fetchAllRecords<any>('itens');
      } catch (e: any) {
        console.error('Supabase fetch failed in StatusIndividual:', e);
      }
      if (docs.length === 0) {
        docs = dbMock.get<Doacao>('DOACOES');
        donors = dbMock.get<Doador>('DOADORES');
        items = dbMock.get<ItemDoacao>('ITENS_DOACAO');
        catalog = dbMock.get<ItemCatalogo>('ITENS');
      }
    } else {
      docs = dbMock.get<Doacao>('DOACOES');
      donors = dbMock.get<Doador>('DOADORES');
      items = dbMock.get<ItemDoacao>('ITENS_DOACAO');
      catalog = dbMock.get<ItemCatalogo>('ITENS');
    }

    setDoacoes(docs);
    setDoadores(donors);
    setItensDoacao(items);
    setCatalogItems(catalog);
    setIsLoading(false);
  };

  const showMsg = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Select a donation to edit
  const handleSelectDonation = (donation: Doacao) => {
    setSelectedDoacao(donation);
    
    // Find associated donor
    const donor = doadores.find(d => d.codigo_doador === donation.codigo_doador) || null;
    setSelectedDoador(donor);

    // Find associated items
    const items = itensDoacao.filter(item => String(item.id_doacao) === String(donation.codigo_doacao));
    setSelectedItems(items);

    // Populate form fields
    setDataRetirada(donation.data_retirada || '');
    setDataBaixa(donation.data_baixa || '');
    setDataRemarcar(donation.remarcado_para || '');
    setDataCancelamento(donation.data_cancelamento || '');
    setMotivoAlteracao(donation.observacoes || '');
    setResponsavel(donation.responsavel || user?.nome || 'Admin User');

    // Preset action type based on current status
    if (donation.data_cancelamento) {
      setActionType('cancelar');
    } else if (donation.data_baixa) {
      setActionType('baixar');
    } else if (donation.remarcado_para) {
      setActionType('remarcar');
    } else {
      setActionType('baixar');
      if (!donation.data_baixa) {
        setDataBaixa(new Date().toISOString().split('T')[0]);
      }
    }
  };

  // Filter donations list based on search query (id or donor name)
  const filteredDonations = React.useMemo(() => {
    if (!searchQuery.trim()) {
      // Default to 5 most recent pending or any donations to allow quick testing
      return doacoes.slice(0, 5);
    }

    const query = searchQuery.toLowerCase();
    return doacoes.filter(doc => {
      const isIdMatch = String(doc.codigo_doacao).includes(query);
      const donor = doadores.find(d => d.codigo_doador === doc.codigo_doador);
      const isNameMatch = donor ? donor.nome.toLowerCase().includes(query) : false;
      return isIdMatch || isNameMatch;
    });
  }, [doacoes, doadores, searchQuery]);

  // Compute status metrics for active donation
  const activeStatus = React.useMemo(() => {
    if (!selectedDoacao) {
      return { 
        label: 'AGUARDANDO', 
        color: 'text-slate-400 bg-slate-100 dark:text-slate-400 dark:bg-white/5', 
        percent: 0, 
        subtext: 'Nenhuma doação selecionada' 
      };
    }
    if (selectedDoacao.data_cancelamento) {
      return { 
        label: 'CANCELADA', 
        color: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-950/40', 
        percent: 100, 
        isError: true, 
        subtext: 'Processo de doação interrompido' 
      };
    }
    if (selectedDoacao.data_baixa) {
      return { 
        label: 'BAIXADA', 
        color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40', 
        percent: 100, 
        subtext: 'Doação concluída e estocada' 
      };
    }
    if (selectedDoacao.remarcado_para) {
      return { 
        label: 'REMARCADA', 
        color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950/40', 
        percent: 65, 
        subtext: 'Alteração no agendamento de retirada' 
      };
    }
    return { 
      label: 'PENDENTE', 
      color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40', 
      percent: 45, 
      subtext: 'Aguardando confirmação de coleta' 
    };
  }, [selectedDoacao]);

  // Clear loaded donation selection
  const handleClear = () => {
    setSelectedDoacao(null);
    setSelectedDoador(null);
    setSelectedItems([]);
    setSearchQuery('');
    setDataRetirada('');
    setDataBaixa('');
    setDataRemarcar('');
    setDataCancelamento('');
    setMotivoAlteracao('');
    setResponsavel('');
  };

  // Save changes to database
  const handleSave = async () => {
    if (!selectedDoacao) {
      showMsg('error', 'Selecione uma doação antes de salvar!');
      return;
    }

    setIsSaving(true);
    const updatedFields: Partial<Doacao> = {
      responsavel,
      observacoes: motivoAlteracao,
    };

    // Determine values based on selected Action
    if (actionType === 'baixar') {
      const finalBaixaDate = dataBaixa || new Date().toISOString().split('T')[0];
      updatedFields.data_baixa = finalBaixaDate;
      updatedFields.data_retirada = dataRetirada || selectedDoacao.data_retirada;
      updatedFields.remarcado_para = undefined; // clear remarcar
      updatedFields.data_cancelamento = undefined; // clear cancel
    } else if (actionType === 'remarcar') {
      if (!dataRemarcar) {
        showMsg('error', 'Por favor, informe a nova data de remarcação!');
        setIsSaving(false);
        return;
      }
      updatedFields.remarcado_para = dataRemarcar;
      updatedFields.data_retirada = dataRetirada || selectedDoacao.data_retirada;
      updatedFields.data_baixa = undefined; // clear baixa
      updatedFields.data_cancelamento = undefined; // clear cancel
    } else if (actionType === 'cancelar') {
      const finalCancelDate = dataCancelamento || new Date().toISOString().split('T')[0];
      updatedFields.data_cancelamento = finalCancelDate;
      updatedFields.data_baixa = undefined; // clear baixa
      updatedFields.remarcado_para = undefined; // clear remarcar
    }

    try {
      if (isRealSupabaseConfigured && supabase) {
        // 1. If transitioning from PENDING/REMARCADA to BAIXADA, adjust catalog quantities!
        const wasBaixada = !!selectedDoacao.data_baixa;
        const nowBaixada = actionType === 'baixar';

        if (nowBaixada && !wasBaixada) {
          // Add items qty to stock
          for (const item of selectedItems) {
            if (item.codigo_item && item.qtde) {
              const { data: currentCatItem } = await supabase
                .from('itens')
                .select('qtde')
                .eq('codigo_completo', item.codigo_item)
                .maybeSingle();
              const currentQty = currentCatItem?.qtde || 0;
              await supabase
                .from('itens')
                .update({ qtde: currentQty + item.qtde })
                .eq('codigo_completo', item.codigo_item);

              // Movement log
              await supabase.from('movimentacoes').insert({
                codigo_completo: item.codigo_item,
                tipo: 'Entrada',
                quantidade: item.qtde,
                motivo: `Status Individual - Baixa de doação #${selectedDoacao.codigo_doacao}`
              });
            }
          }
        } 
        // 2. If reversing a previously BAIXADA donation to other status (Estorno)
        else if (!nowBaixada && wasBaixada) {
          // Subtract items qty from stock
          for (const item of selectedItems) {
            if (item.codigo_item && item.qtde) {
              const { data: currentCatItem } = await supabase
                .from('itens')
                .select('qtde')
                .eq('codigo_completo', item.codigo_item)
                .maybeSingle();
              const currentQty = currentCatItem?.qtde || 0;
              await supabase
                .from('itens')
                .update({ qtde: Math.max(0, currentQty - item.qtde) })
                .eq('codigo_completo', item.codigo_item);

              // Movement log
              await supabase.from('movimentacoes').insert({
                codigo_completo: item.codigo_item,
                tipo: 'Estorno',
                quantidade: item.qtde,
                motivo: `Status Individual - Estorno/Remarcação de doação #${selectedDoacao.codigo_doacao}`
              });
            }
          }
        }

        // 3. Update the doacao record
        const { error: updateErr } = await supabase
          .from('doacoes')
          .update(updatedFields)
          .eq('codigo_doacao', selectedDoacao.codigo_doacao);

        if (updateErr) throw updateErr;

      } else {
        // Mock DB implementation
        const mockDonations = dbMock.get<Doacao>('DOACOES');
        const mockCatalog = dbMock.get<ItemCatalogo>('ITENS');
        const mockMovs = dbMock.get<any>('MOVIMENTACOES');

        const wasBaixada = !!selectedDoacao.data_baixa;
        const nowBaixada = actionType === 'baixar';

        if (nowBaixada && !wasBaixada) {
          selectedItems.forEach(item => {
            mockCatalog.forEach(c => {
              if (c.codigo_completo === item.codigo_item) {
                c.qtde = (c.qtde || 0) + (item.qtde || 0);
              }
            });
            mockMovs.push({
              id: crypto.randomUUID(),
              codigo_completo: item.codigo_item,
              tipo: 'Entrada',
              quantidade: item.qtde,
              motivo: `Status Individual - Baixa de doação #${selectedDoacao.codigo_doacao} (Demo)`,
              created_at: new Date().toISOString()
            });
          });
        } else if (!nowBaixada && wasBaixada) {
          selectedItems.forEach(item => {
            mockCatalog.forEach(c => {
              if (c.codigo_completo === item.codigo_item) {
                c.qtde = Math.max(0, (c.qtde || 0) - (item.qtde || 0));
              }
            });
            mockMovs.push({
              id: crypto.randomUUID(),
              codigo_completo: item.codigo_item,
              tipo: 'Estorno',
              quantidade: item.qtde,
              motivo: `Status Individual - Estorno de doação #${selectedDoacao.codigo_doacao} (Demo)`,
              created_at: new Date().toISOString()
            });
          });
        }

        // Update mock donation fields
        mockDonations.forEach(d => {
          if (d.codigo_doacao === selectedDoacao.codigo_doacao) {
            d.responsavel = updatedFields.responsavel;
            d.observacoes = updatedFields.observacoes;
            d.data_baixa = updatedFields.data_baixa;
            d.data_retirada = updatedFields.data_retirada;
            d.remarcado_para = updatedFields.remarcado_para;
            d.data_cancelamento = updatedFields.data_cancelamento;
          }
        });

        dbMock.save('DOACOES', mockDonations);
        dbMock.save('ITENS', mockCatalog);
        dbMock.save('MOVIMENTACOES', mockMovs);
      }

      await addLog(
        'Modificou Status Individual', 
        'Coletas', 
        `Alterou status da doação #${selectedDoacao.codigo_doacao} para ${actionType.toUpperCase()}`
      );

      showMsg('success', 'Status e dados salvos com sucesso!');
      
      // Refresh local lists and re-select updated donation
      await loadInitialData();
      
      // Find and select the updated donation
      const updatedList = isRealSupabaseConfigured && supabase 
        ? await fetchAllRecords<any>('doacoes')
        : dbMock.get<Doacao>('DOACOES');
      const freshlyUpdated = updatedList.find(d => d.codigo_doacao === selectedDoacao.codigo_doacao);
      if (freshlyUpdated) {
        setSelectedDoacao(freshlyUpdated);
      }
    } catch (e: any) {
      console.error(e);
      showMsg('error', 'Falha ao salvar dados: ' + e.message);
    }
    setIsSaving(false);
  };

  const handlePrintCI = () => {
    if (!selectedDoacao) {
      showMsg('error', 'Selecione uma doação primeiro!');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const donorName = selectedDoador?.nome || 'Não Informado';
    const donorPhone = selectedDoador?.celular || selectedDoador?.fixo || 'Não Informado';
    const donorAddress = `${selectedDoador?.logradouro || selectedDoador?.endereco || ''}, ${selectedDoador?.bairro || ''} - ${selectedDoador?.cidade || ''}/${selectedDoador?.estado || ''}`;

    const itemsRows = selectedItems.map(i => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${i.item || 'Item'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${i.categoria || 'Sem Categoria'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${i.qtde} ${i.unidade || 'UN'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante de Identificação - Doação #${selectedDoacao.codigo_doacao}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .card { border: 1px dashed #333; padding: 15px; margin-bottom: 20px; background-color: #f9f9f9; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f0f0f0; padding: 8px; border: 1px solid #ddd; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #777; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>ABRIGO DOAÇÕES - COMPROVANTE DE IDENTIFICAÇÃO (CI)</h2>
            <p>Código de Controle Sequencial: <strong>#${selectedDoacao.codigo_doacao}</strong></p>
          </div>
          
          <div class="card">
            <h3>DADOS DO DOADOR</h3>
            <p><strong>Nome:</strong> ${donorName}</p>
            <p><strong>Telefone:</strong> ${donorPhone}</p>
            <p><strong>Endereço:</strong> ${donorAddress}</p>
          </div>

          <div class="card">
            <h3>INFORMAÇÕES DE AGENDAMENTO</h3>
            <div class="grid">
              <div>
                <p><strong>Data de Retirada Prevista:</strong> ${selectedDoacao.data_retirada || '-'}</p>
                <p><strong>Remarcado Para:</strong> ${selectedDoacao.remarcado_para || '-'}</p>
              </div>
              <div>
                <p><strong>Data de Baixa/Entrega:</strong> ${selectedDoacao.data_baixa || '-'}</p>
                <p><strong>Data de Cancelamento:</strong> ${selectedDoacao.data_cancelamento || '-'}</p>
              </div>
            </div>
            <p><strong>Colaborador Responsável:</strong> ${selectedDoacao.responsavel || '-'}</p>
            <p><strong>Observações/Motivo:</strong> ${selectedDoacao.observacoes || '-'}</p>
          </div>

          <h3>ITENS CATALOGADOS NA DOAÇÃO</h3>
          <table>
            <thead>
              <tr>
                <th>Descrição do Item</th>
                <th>Categoria</th>
                <th>Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows || '<tr><td colspan="3" style="text-align: center; padding: 15px;">Nenhum item adicionado</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 60px; display: flex; justify-content: space-around;">
            <div style="text-align: center; border-top: 1px solid #333; width: 200px; padding-top: 5px; font-size: 12px;">
              Assinatura do Responsável
            </div>
            <div style="text-align: center; border-top: 1px solid #333; width: 200px; padding-top: 5px; font-size: 12px;">
              Assinatura do Doador
            </div>
          </div>

          <div class="footer">
            Documento emitido em ${new Date().toLocaleString('pt-BR')} pelo Sistema Abrigo-doacoes
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    addLog('Imprimiu CI', 'Coletas', `Gerou comprovante impresso para doação #${selectedDoacao.codigo_doacao}`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-white max-w-[1400px] mx-auto">
      {/* Feedback Alert */}
      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-md animate-scale-up ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-800 dark:text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/35 text-rose-800 dark:text-rose-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left main columns - Actions & Forms */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section: Localizar Doação */}
          <section className="aero-black-panel rounded-2xl p-6 border-white/15 shadow-xl">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-300 mb-4 flex items-center gap-2">
              <Search size={14} />
              Localizar Doação
            </h2>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="aero-input-gloss w-full pl-11 pr-4 py-2.5 rounded-xl text-sm font-medium"
                  placeholder="ID da Doação ou Nome do Doador..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (filteredDonations.length > 0 && !selectedDoacao) {
                      handleSelectDonation(filteredDonations[0]);
                      showMsg('success', `Doação #${filteredDonations[0].codigo_doacao} carregada.`);
                    } else if (filteredDonations.length === 0) {
                      showMsg('error', 'Nenhuma doação correspondente encontrada.');
                    }
                  }}
                  className="aero-button-primary px-6 rounded-xl text-sm font-bold h-[42px] flex items-center gap-2 cursor-pointer"
                >
                  Filtrar
                </button>
                <button
                  onClick={handleClear}
                  className="vista-button px-6 rounded-xl text-sm font-medium h-[42px] hover:text-white cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Quick selection items list */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/35 mb-2">
                {searchQuery.trim() ? 'Resultados Encontrados' : 'Doações Recentes / Sugestões'}
              </p>
              {isLoading ? (
                <div className="flex items-center gap-2 py-2 text-xs text-slate-500 dark:text-white/40">
                  <RefreshCw size={14} className="animate-spin" />
                  Carregando registros...
                </div>
              ) : filteredDonations.length === 0 ? (
                <p className="text-xs italic text-slate-400 dark:text-white/30 py-2">Nenhuma doação correspondente.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredDonations.map((doc) => {
                    const isSelected = selectedDoacao?.codigo_doacao === doc.codigo_doacao;
                    const donor = doadores.find(d => d.codigo_doador === doc.codigo_doador);
                    return (
                      <div
                        key={doc.codigo_doacao}
                        onClick={() => handleSelectDonation(doc)}
                        className={`p-2 rounded-lg cursor-pointer border text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-800 dark:text-blue-300 font-bold shadow-inner'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="font-mono text-[11px] bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-800 dark:text-white mr-2">
                            #{doc.codigo_doacao}
                          </span>
                          <span>{donor?.nome || 'Doador Anônimo'}</span>
                        </div>
                        <span className="text-[10px] opacity-60 shrink-0">
                          {doc.data_baixa ? 'Baixada' : doc.data_cancelamento ? 'Cancelada' : 'Pendente'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Section: Gestão de Status e Datas */}
          <section className="aero-black-panel rounded-2xl border-white/15 shadow-xl overflow-hidden">
            {/* Header sub bar */}
            <div className="bg-slate-100 dark:bg-white/5 px-6 py-3 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-blue-300">
                Gestão de Status e Datas
              </h2>
            </div>

            <div className="p-6 space-y-8">
              {/* Action Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-3">
                  Selecione a Ação
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Action: Baixar */}
                  <button
                    onClick={() => {
                      setActionType('baixar');
                      if (!dataBaixa) setDataBaixa(new Date().toISOString().split('T')[0]);
                    }}
                    className={`group relative p-4 rounded-xl text-left border cursor-pointer transition-all ${
                      actionType === 'baixar'
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 shadow-sm'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <CheckCircle2 size={20} className={actionType === 'baixar' ? 'text-emerald-500' : 'text-slate-400 dark:text-white/40'} />
                      {actionType === 'baixar' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>}
                    </div>
                    <p className="font-bold text-sm">Baixar (Retirada)</p>
                    <p className="text-[10px] text-slate-500 dark:text-white/40">Concluir fluxo de doação</p>
                  </button>

                  {/* Action: Remarcar */}
                  <button
                    onClick={() => {
                      setActionType('remarcar');
                    }}
                    className={`group relative p-4 rounded-xl text-left border cursor-pointer transition-all ${
                      actionType === 'remarcar'
                        ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/50 text-blue-800 dark:text-blue-300 shadow-sm'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <Calendar size={20} className={actionType === 'remarcar' ? 'text-blue-500' : 'text-slate-400 dark:text-white/40'} />
                      {actionType === 'remarcar' && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>}
                    </div>
                    <p className="font-bold text-sm">Remarcar</p>
                    <p className="text-[10px] text-slate-500 dark:text-white/40">Alterar agendamento</p>
                  </button>

                  {/* Action: Cancelar */}
                  <button
                    onClick={() => {
                      setActionType('cancelar');
                      if (!dataCancelamento) setDataCancelamento(new Date().toISOString().split('T')[0]);
                    }}
                    className={`group relative p-4 rounded-xl text-left border cursor-pointer transition-all ${
                      actionType === 'cancelar'
                        ? 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/50 text-rose-800 dark:text-rose-300 shadow-sm'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <X size={20} className={actionType === 'cancelar' ? 'text-rose-500' : 'text-slate-400 dark:text-white/40'} />
                      {actionType === 'cancelar' && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>}
                    </div>
                    <p className="font-bold text-sm">Cancelar</p>
                    <p className="text-[10px] text-slate-500 dark:text-white/40">Interromper processo</p>
                  </button>
                </div>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date 1: Retirada */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-white/50 px-1">
                    D. Retirada
                  </label>
                  <input
                    type="date"
                    value={dataRetirada}
                    onChange={(e) => setDataRetirada(e.target.value)}
                    className="aero-input-gloss w-full p-2.5 rounded-lg text-xs"
                  />
                </div>

                {/* Date 2: Data Baixa */}
                <div className={`space-y-1.5 transition-opacity ${actionType !== 'baixar' ? 'opacity-40' : ''}`}>
                  <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-white/50 px-1">
                    Data Baixa
                  </label>
                  <input
                    type="date"
                    value={dataBaixa}
                    onChange={(e) => setDataBaixa(e.target.value)}
                    disabled={actionType !== 'baixar'}
                    className="aero-input-gloss w-full p-2.5 rounded-lg text-xs disabled:bg-slate-200/50 dark:disabled:bg-black/60"
                  />
                </div>

                {/* Date 3: Remarcar */}
                <div className={`space-y-1.5 transition-opacity ${actionType !== 'remarcar' ? 'opacity-40' : ''}`}>
                  <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-white/50 px-1">
                    Remarcar
                  </label>
                  <input
                    type="date"
                    value={dataRemarcar}
                    onChange={(e) => setDataRemarcar(e.target.value)}
                    disabled={actionType !== 'remarcar'}
                    className="aero-input-gloss w-full p-2.5 rounded-lg text-xs disabled:bg-slate-200/50 dark:disabled:bg-black/60"
                  />
                </div>

                {/* Date 4: Cancelamento */}
                <div className={`space-y-1.5 transition-opacity ${actionType !== 'cancelar' ? 'opacity-40' : ''}`}>
                  <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-white/50 px-1">
                    Cancelamento
                  </label>
                  <input
                    type="date"
                    value={dataCancelamento}
                    onChange={(e) => setDataCancelamento(e.target.value)}
                    disabled={actionType !== 'cancelar'}
                    className="aero-input-gloss w-full p-2.5 rounded-lg text-xs disabled:bg-slate-200/50 dark:disabled:bg-black/60"
                  />
                </div>
              </div>

              {/* Notes & Assignee/Responsibility Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Notes */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-white/50 px-1">
                    Motivo da Alteração
                  </label>
                  <textarea
                    value={motivoAlteracao}
                    onChange={(e) => setMotivoAlteracao(e.target.value)}
                    placeholder="Descreva brevemente o motivo da mudança de status..."
                    rows={3}
                    className="aero-input-gloss w-full p-3 rounded-lg text-xs resize-none"
                  />
                </div>

                {/* Responsibility */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-white/50 px-1">
                      Responsável Atual
                    </label>
                    <div className="aero-input-gloss w-full p-2.5 rounded-lg text-xs flex items-center gap-2 bg-slate-100 dark:bg-black/40">
                      <User size={16} className="text-blue-500 dark:text-blue-300" />
                      <input
                        type="text"
                        value={responsavel}
                        onChange={(e) => setResponsavel(e.target.value)}
                        className="bg-transparent border-none outline-none p-0 w-full text-xs text-slate-800 dark:text-white font-medium focus:ring-0"
                        placeholder="Nome do operador..."
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <p className="text-[10px] text-slate-500 dark:text-white/40 leading-tight">
                      Última atualização:{' '}
                      {selectedDoacao && selectedDoacao.created_at 
                        ? new Date(selectedDoacao.created_at).toLocaleString('pt-BR') 
                        : 'Nenhum registro carregado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div className="bg-slate-100 dark:bg-black/40 p-6 flex justify-end items-center border-t border-slate-200 dark:border-white/5">
              <button
                onClick={handleSave}
                disabled={isSaving || !selectedDoacao}
                className="aero-button-primary px-12 py-3 rounded-xl font-bold flex items-center gap-3 text-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Gravar Dados
              </button>
            </div>
          </section>
        </div>

        {/* Right side - Sidebar context widgets */}
        <aside className="lg:col-span-4 space-y-6">
          
          {/* Status Indicator Widget */}
          <div className="aero-black-panel rounded-2xl p-6 border-white/15 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-blue-300 mb-4">
              Status Atual
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full aero-black-panel flex items-center justify-center relative overflow-hidden">
                <Clock 
                  size={30} 
                  className={`text-3xl ${
                    activeStatus.label === 'PENDENTE' ? 'text-amber-500 animate-pulse' : 
                    activeStatus.label === 'REMARCADA' ? 'text-blue-400' :
                    activeStatus.label === 'BAIXADA' ? 'text-emerald-500' :
                    activeStatus.label === 'CANCELADA' ? 'text-rose-500' : 'text-slate-400'
                  }`} 
                />
                <div className={`absolute inset-0 opacity-10 ${
                  activeStatus.label === 'PENDENTE' ? 'bg-amber-500' :
                  activeStatus.label === 'REMARCADA' ? 'bg-blue-400' :
                  activeStatus.label === 'BAIXADA' ? 'bg-emerald-500' :
                  activeStatus.label === 'CANCELADA' ? 'bg-rose-500' : 'bg-slate-400'
                }`}></div>
              </div>
              <div>
                <span className="text-2xl font-black block tracking-tight">
                  {activeStatus.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-white/50 leading-none">
                  {activeStatus.subtext}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 h-2 w-full bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden">
              <div 
                className={`shimmer-green h-full rounded-full transition-all duration-500 ${
                  activeStatus.label === 'PENDENTE' ? 'bg-amber-500' : 
                  activeStatus.label === 'REMARCADA' ? 'bg-blue-500' : 
                  activeStatus.label === 'BAIXADA' ? 'bg-emerald-500' : 
                  activeStatus.label === 'CANCELADA' ? 'bg-rose-500' : 'bg-slate-400'
                }`}
                style={{ width: `${activeStatus.percent}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-slate-400 dark:text-white/40 uppercase font-semibold">
                Progresso do Fluxo
              </span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-emerald-400">
                {activeStatus.percent}%
              </span>
            </div>
          </div>

          {/* Items List Widget */}
          <div className="aero-black-panel rounded-2xl border-white/15 shadow-xl flex flex-col min-h-[300px]">
            <div className="bg-slate-100 dark:bg-white/10 px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-white/90">
                Itens da Doação
              </h3>
              <span className="text-[10px] bg-slate-200 dark:bg-white/20 px-2 py-0.5 rounded-full font-bold">
                {selectedItems.length} Itens
              </span>
            </div>

            {selectedItems.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-50">
                <Inbox size={48} className="text-slate-400 dark:text-white/40" />
                <p className="text-xs italic text-slate-600 dark:text-white/70 leading-relaxed">
                  Nenhuma doação carregada no momento. Utilize o campo de busca ao lado.
                </p>
              </div>
            ) : (
              <div className="flex-grow p-4 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
                {selectedItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/25">
                        <Package size={16} className="text-blue-500 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-white">{item.item || 'Item'}</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/40">{item.categoria || 'Sem categoria'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-200 dark:bg-white/10 px-2 py-1 rounded text-slate-800 dark:text-white whitespace-nowrap">
                      {item.qtde} {item.unidade || 'UN'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions / Output Widget */}
          <div className="aero-black-panel rounded-2xl p-4 border-white/15 shadow-xl">
            <button
              onClick={handlePrintCI}
              disabled={!selectedDoacao}
              className="vista-button w-full py-3 rounded-xl flex items-center justify-center gap-3 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={18} />
              Imprimir CI
            </button>
            <p className="text-[10px] text-center mt-3 text-slate-400 dark:text-white/30 uppercase font-bold tracking-wider">
              Comprovante de Identificação (PDF)
            </p>
          </div>

          {/* Info Advisory Card */}
          <div className="bg-blue-500/10 dark:bg-primary/20 border border-blue-500/30 dark:border-primary/30 rounded-2xl p-4 flex gap-3 shadow-md">
            <Info className="text-blue-600 dark:text-blue-400 shrink-0" size={18} />
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-white/70">
              <strong>Aviso:</strong> A alteração de status para "Baixada" gera automaticamente o registro histórico de estoque e bloqueia edições posteriores desautorizadas.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
};
