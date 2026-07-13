import React, { useState } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Doacao, Doador, ItemDoacao } from '../types';
import {
  Printer, Search, AlertCircle, Calendar
} from 'lucide-react';

interface RetiradaRow {
  codigo_doador: number;
  codigo_doacao: number;
  qtde: number;
  tipoDescricao: string;
  nome_doador: string;
  endereco: string;
  bairro: string;
  regiao: string;
  fones: string;
  mapa: string;
  observacoes: string;
  data_retirada: string;
  remarcado_para: string;
}

function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('T')) {
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

const printStyles = `
  @page { size: landscape; margin: 8mm; }
  @media print {
    body { font-size: 8pt; }
    .print-report { display: block !important; }
    .print-report table { page-break-inside: auto; }
    .print-report tr { page-break-inside: avoid; page-break-after: auto; }
  }
`;

export const RetiradasComplemento: React.FC = () => {
  const { addLog } = useThemeAuth();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [results, setResults] = useState<RetiradaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  const normalizeDate = (d: string | undefined | null): string => {
    if (!d) return '';
    const s = String(d).split('T')[0]?.split(' ')[0] || '';
    return s;
  };

  const handleSearch = async () => {
    setErrorMsg(null);
    setResults([]);
    setSearched(false);
    setDiagnostic(null);

    if (!dataInicio || !dataFim) {
      setErrorMsg('Preencha as datas de início e fim da pesquisa.');
      return;
    }

    if (dataFim < dataInicio) {
      setErrorMsg('A data fim deve ser maior ou igual à data início.');
      return;
    }

    setLoading(true);

    try {
      let doacoes: Doacao[] = [];
      let doadores: Doador[] = [];
      let itensDoacao: ItemDoacao[] = [];
      let fonte = 'mock';

      if (isRealSupabaseConfigured && supabase) {
        try {
          const { data: dData } = await supabase.from('doacoes').select('*').order('codigo_doador', { ascending: true });
          const { data: doadData } = await supabase.from('doadores').select('*');
          const { data: iData } = await supabase.from('itens_doacao').select('*');
          if (dData && dData.length > 0) { doacoes = dData; fonte = 'supabase'; }
          if (doadData) doadores = doadData;
          if (iData) itensDoacao = iData;
        } catch (e) {
          console.error('Supabase fetch failed:', e);
        }
      }

      if (doacoes.length === 0) {
        doacoes = dbMock.get<Doacao>('DOACOES');
        doadores = dbMock.get<Doador>('DOADORES');
        itensDoacao = dbMock.get<ItemDoacao>('ITENS_DOACAO');
        fonte = 'mock';
      }

      let diag = `Fonte: ${fonte}\nDoações carregadas: ${doacoes.length}, Doadores: ${doadores.length}, Itens: ${itensDoacao.length}\n`;
      diag += `DataInicio="${dataInicio}" DataFim="${dataFim}"\n`;
      diag += `Doações:\n`;
      doacoes.forEach(d => {
        diag += `  #${d.codigo_doacao}: ret="${d.data_retirada}" rem="${d.remarcado_para}"\n`;
      });
      diag += `Doadores:\n`;
      doadores.forEach(d => {
        diag += `  #${d.codigo_doador}: nome="${d.nome}" end="${d.endereco}"\n`;
      });
      diag += `Itens:\n`;
      itensDoacao.forEach(i => {
        diag += `  doac#${i.id_doacao}: qtde=${i.qtde} cat="${i.categoria}" item="${i.item}"\n`;
      });

      const doadorMap = new Map<number, Doador>();
      doadores.forEach(d => {
        if (d.codigo_doador != null) doadorMap.set(d.codigo_doador, d);
      });

      const doacaoItensMap = new Map<number, ItemDoacao[]>();
      itensDoacao.forEach(item => {
        const id = parseInt(item.id_doacao, 10);
        if (!isNaN(id)) {
          const list = doacaoItensMap.get(id) || [];
          list.push(item);
          doacaoItensMap.set(id, list);
        }
      });

      const filtered = doacoes.filter(d => {
        const ret = normalizeDate(d.data_retirada);
        const rem = normalizeDate(d.remarcado_para);
        const matchRet = ret >= dataInicio && ret <= dataFim;
        const matchRem = rem >= dataInicio && rem <= dataFim;
        diag += `  Filtro #${d.codigo_doacao}: ret="${ret}" (${matchRet}) rem="${rem}" (${matchRem}) => ${matchRet || matchRem}\n`;
        return matchRet || matchRem;
      });
      diag += `Filtrados: ${filtered.length}\n`;

      const sorted = [...filtered].sort((a, b) => {
        const codA = a.codigo_doador ?? 0;
        const codB = b.codigo_doador ?? 0;
        return codA - codB;
      });

      const rows: RetiradaRow[] = [];
      sorted.forEach(d => {
        const donor = d.codigo_doador != null ? doadorMap.get(d.codigo_doador) : undefined;
        const items = doacaoItensMap.get(d.codigo_doacao) || [];

        const enderecoCompleto = [donor?.endereco, donor?.complemento].filter(Boolean).join(' - ');

        if (items.length === 0) {
          rows.push({
            codigo_doador: d.codigo_doador ?? 0,
            codigo_doacao: d.codigo_doacao,
            qtde: 0,
            tipoDescricao: '',
            nome_doador: donor?.nome || '',
            endereco: enderecoCompleto,
            bairro: donor?.bairro || '',
            regiao: donor?.regiao || '',
            fones: [donor?.celular, donor?.fixo].filter(Boolean).join(' / '),
            mapa: donor?.mapa || '',
            observacoes: d.observacoes || '',
            data_retirada: formatDateBR(d.data_retirada),
            remarcado_para: formatDateBR(d.remarcado_para),
          });
        } else {
          items.forEach(item => {
            rows.push({
              codigo_doador: d.codigo_doador ?? 0,
              codigo_doacao: d.codigo_doacao,
              qtde: item.qtde ?? 0,
              tipoDescricao: [item.categoria, item.item].filter(Boolean).join(' - '),
              nome_doador: donor?.nome || '',
              endereco: enderecoCompleto,
              bairro: donor?.bairro || '',
              regiao: donor?.regiao || '',
              fones: [donor?.celular, donor?.fixo].filter(Boolean).join(' / '),
              mapa: donor?.mapa || '',
              observacoes: d.observacoes || '',
              data_retirada: formatDateBR(d.data_retirada),
              remarcado_para: formatDateBR(d.remarcado_para),
            });
          });
        }
      });

      setResults(rows);
      setSearched(true);
      setDiagnostic(diag);

      if (addLog) {
        addLog(
          'Pesquisou Retiradas com Complemento',
          'Relatórios / Retiradas com Complemento',
          `Período: ${dataInicio} a ${dataFim} — ${rows.length} registro(s)`
        );
      }
    } catch (e: any) {
      console.error('Erro ao pesquisar:', e);
      setErrorMsg('Ocorreu um erro ao carregar os dados: ' + (e?.message || e));
    }

    setLoading(false);
  };

  const handlePrint = () => {
    if (addLog) {
      addLog(
        'Imprimiu Retiradas com Complemento',
        'Relatórios / Retiradas com Complemento',
        `Período: ${dataInicio} a ${dataFim}`
      );
    }
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:text-black">

      <style>{printStyles}</style>

      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl print:hidden">
        <header className="h-14 flex items-center justify-between px-6 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10">
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-300 drop-shadow" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide text-glow">
              Retiradas com Complemento
            </h2>
          </div>
          <span className="text-[10px] bg-white/10 text-white/70 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
            Filtro por Período
          </span>
        </header>

        <div className="p-6 md:p-8 space-y-6">
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/10 space-y-5">
            <p className="text-xs text-white/80 font-bold uppercase tracking-wider">
              Selecione o período das retiradas:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Data Início
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="aero-input-gloss h-11 px-4 rounded-xl text-sm text-white"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  className="aero-input-gloss h-11 px-4 rounded-xl text-sm text-white"
                />
              </div>

              <div className="sm:col-span-1 flex gap-2">
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className="aero-button-primary w-full h-11 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Search size={15} />
                  <span>Pesquisar</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-100 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {diagnostic && (
              <details className="bg-slate-900/60 border border-white/10 rounded-xl p-3 print:hidden">
                <summary className="text-[10px] font-bold uppercase tracking-wider text-white/60 cursor-pointer">
                  Diagnóstico (clique para abrir)
                </summary>
                <pre className="mt-2 text-[9px] text-green-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {diagnostic}
                </pre>
              </details>
            )}
          </div>
        </div>
      </section>

      {loading && (
        <div className="text-center text-white/60 text-sm py-8">
          Carregando...
        </div>
      )}

      {!loading && searched && (
        <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <header className="h-14 flex items-center justify-between px-6 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10">
            <div className="flex items-center gap-3">
              <Printer className="text-blue-300 drop-shadow" size={18} />
              <h2 className="text-white font-bold text-sm tracking-wide text-glow">
                Resultados da Pesquisa
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] bg-white/10 text-white/70 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                {results.length} registro(s)
              </span>
              {results.length > 0 && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="aero-button-primary h-10 px-4 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Imprimir Relatório</span>
                </button>
              )}
            </div>
          </header>

          <div className="overflow-x-auto">
            {results.length === 0 ? (
              <div className="p-8 text-center text-white/50 text-sm">
                Nenhuma doação encontrada no período informado.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/30 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-3 py-3 whitespace-nowrap">DOADOR</th>
                    <th className="px-3 py-3 whitespace-nowrap">DOAÇÃO</th>
                    <th className="px-3 py-3 whitespace-nowrap">QTE</th>
                    <th className="px-3 py-3 whitespace-nowrap">TIPO DESCR.DOAÇÃO</th>
                    <th className="px-3 py-3 whitespace-nowrap">NOME DO DOADOR</th>
                    <th className="px-3 py-3 whitespace-nowrap">ENDEREÇO</th>
                    <th className="px-3 py-3 whitespace-nowrap">BAIRRO</th>
                    <th className="px-3 py-3 whitespace-nowrap">REGIÃO</th>
                    <th className="px-3 py-3 whitespace-nowrap">FONES</th>
                    <th className="px-3 py-3 whitespace-nowrap">MAPA</th>
                    <th className="px-3 py-3 whitespace-nowrap">OBSERVAÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {results.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                      <td className="px-3 py-3 text-slate-800 dark:text-slate-200 font-mono text-xs">
                        #{String(row.codigo_doador).padStart(6, '0')}
                      </td>
                      <td className="px-3 py-3 text-blue-600 dark:text-blue-400 font-bold font-mono text-xs">
                        #{String(row.codigo_doacao).padStart(6, '0')}
                      </td>
                      <td className="px-3 py-3 text-slate-800 dark:text-slate-200 font-mono text-xs text-center">
                        {row.qtde}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs max-w-[180px] break-words">
                        {row.tipoDescricao}
                      </td>
                      <td className="px-3 py-3 text-slate-800 dark:text-slate-200 font-medium text-xs max-w-[160px] break-words">
                        {row.nome_doador}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs max-w-[140px] break-words">
                        {row.endereco}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs">
                        {row.bairro}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs">
                        {row.regiao}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs max-w-[120px] break-words">
                        {row.fones}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs max-w-[100px] truncate" title={row.mapa}>
                        {row.mapa}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs max-w-[160px] break-words">
                        {row.observacoes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {results.length > 0 && (
        <div className="print-report hidden print:block print:bg-white print:text-black" style={{ width: '100%' }}>
          <h1 className="text-lg font-bold text-center mb-1" style={{ color: '#000080', fontSize: '14pt' }}>
            Retiradas com Complemento
          </h1>
          <p className="text-center text-sm mb-2" style={{ color: '#000', fontSize: '9pt' }}>
            Período: {formatDateBR(dataInicio + 'T00:00:00')} a {formatDateBR(dataFim + 'T00:00:00')}
          </p>

          <table className="w-full border-collapse" style={{ border: '1px solid #000', fontSize: '7.5pt' }}>
            <thead>
              <tr style={{ backgroundColor: '#000080', color: '#fff' }}>
                <th style={{ border: '1px solid #000', padding: '3px 4px', width: '6%' }}>DOADOR</th>
                <th style={{ border: '1px solid #000', padding: '3px 4px', width: '5%' }}>DOAÇÃO</th>
                <th style={{ border: '1px solid #000', padding: '3px 4px', width: '4%' }}>QTE</th>
                <th style={{ border: '1px solid #000', padding: '3px 4px', width: '15%' }}>TIPO DESCR.DOAÇÃO</th>
                <th style={{ border: '1px solid #000', padding: '3px 4px', width: '15%' }}>NOME DO DOADOR</th>
                <th style={{ border: '1px solid #000', padding: '3px 4px', width: '14%' }}>ENDEREÇO</th>
                <th style={{ border: '1px solid #000', padding: '3px 4px', width: '8%' }}>BAIRRO</th>
                <th style={{ border: '1px solid #000', padding: '3px 4px', width: '7%' }}>REGIÃO</th>
                <th style={{ border: '1px solid #000', padding: '3px 4px', width: '10%' }}>FONES</th>
                <th style={{ border: '1px solid #000', padding: '3px 4px', width: '7%' }}>MAPA</th>
                <th style={{ border: '1px solid #000', padding: '3px 4px', width: '9%' }}>OBSERVAÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    #{String(row.codigo_doador).padStart(6, '0')}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    #{String(row.codigo_doacao).padStart(6, '0')}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {row.qtde}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {row.tipoDescricao}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {row.nome_doador}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {row.endereco}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    {row.bairro}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    {row.regiao}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {row.fones}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', wordBreak: 'break-word', whiteSpace: 'normal', fontSize: '6.5pt' }}>
                    {row.mapa}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {row.observacoes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs text-center mt-2" style={{ color: '#666', fontSize: '7pt' }}>
            Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
};
