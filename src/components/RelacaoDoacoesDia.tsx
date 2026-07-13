import React, { useState } from 'react';
import { supabase, isRealSupabaseConfigured, dbMock } from '../services/supabase';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { Doacao, Doador } from '../types';
import {
  Printer, Search, AlertCircle, Calendar
} from 'lucide-react';

interface RelacaoRow {
  retirada: string;
  remarcada: string;
  codigo_doacao: number;
  codigo_doador: number;
  nome_doador: string;
  endereco: string;
  bairro: string;
  regiao: string;
  cep: string;
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

export const RelacaoDoacoesDia: React.FC = () => {
  const { addLog } = useThemeAuth();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [results, setResults] = useState<RelacaoRow[]>([]);
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
      let fonte = 'mock';

      if (isRealSupabaseConfigured && supabase) {
        try {
          const { data: dData } = await supabase.from('doacoes').select('*').order('codigo_doador', { ascending: true });
          const { data: doadData } = await supabase.from('doadores').select('*').order('codigo_doador', { ascending: true });
          if (dData && dData.length > 0) { doacoes = dData; fonte = 'supabase'; }
          if (doadData) doadores = doadData;
        } catch (e) {
          console.error('Supabase fetch failed:', e);
        }
      }

      if (doacoes.length === 0) {
        doacoes = dbMock.get<Doacao>('DOACOES');
        doadores = dbMock.get<Doador>('DOADORES');
        fonte = 'mock';
      }

      let diag = `Fonte: ${fonte}\nDoações: ${doacoes.length}, Doadores: ${doadores.length}\n`;
      diag += `DataInicio="${dataInicio}" DataFim="${dataFim}"\n`;
      doacoes.forEach(d => {
        diag += `  #${d.codigo_doacao}: ret="${d.data_retirada}" rem="${d.remarcado_para}"\n`;
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

      const doadorMap = new Map<number, Doador>();
      doadores.forEach(d => {
        if (d.codigo_doador != null) doadorMap.set(d.codigo_doador, d);
      });

      const sorted = [...filtered].sort((a, b) => {
        const codA = a.codigo_doador ?? 0;
        const codB = b.codigo_doador ?? 0;
        return codA - codB;
      });

      const rows: RelacaoRow[] = sorted.map(d => {
        const donor = d.codigo_doador != null ? doadorMap.get(d.codigo_doador) : undefined;
        return {
          retirada: formatDateBR(d.data_retirada),
          remarcada: formatDateBR(d.remarcado_para),
          codigo_doacao: d.codigo_doacao,
          codigo_doador: d.codigo_doador ?? 0,
          nome_doador: donor?.nome || '',
          endereco: donor?.endereco || '',
          bairro: donor?.bairro || '',
          regiao: donor?.regiao || '',
          cep: donor?.cep || '',
        };
      });

      setResults(rows);
      setSearched(true);
      setDiagnostic(diag);

      if (addLog) {
        addLog(
          'Pesquisou Relação das Doações do Dia',
          'Relatórios / Doações do Dia',
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
        'Imprimiu Relação das Doações do Dia',
        'Relatórios / Doações do Dia',
        `Período: ${dataInicio} a ${dataFim}`
      );
    }
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:text-black">

      {/* Filtros */}
      <section className="aero-black-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl print:hidden">
        <header className="h-14 flex items-center justify-between px-6 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10">
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-300 drop-shadow" size={18} />
            <h2 className="text-white font-bold text-sm tracking-wide text-glow">
              Relação das Doações do Dia
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

      {/* Resultados */}
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
                    <th className="px-4 py-4 whitespace-nowrap">RETIRADA</th>
                    <th className="px-4 py-4 whitespace-nowrap">DOAÇÃO</th>
                    <th className="px-4 py-4 whitespace-nowrap">DOADOR</th>
                    <th className="px-4 py-4 whitespace-nowrap">NOME DO DOADOR</th>
                    <th className="px-4 py-4 whitespace-nowrap">ENDEREÇO</th>
                    <th className="px-4 py-4 whitespace-nowrap">BAIRRO</th>
                    <th className="px-4 py-4 whitespace-nowrap">REGIÃO</th>
                    <th className="px-4 py-4 whitespace-nowrap">CEP</th>
                    <th className="px-4 py-4 whitespace-nowrap">REMARCADA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {results.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                      <td className="px-4 py-4 text-slate-800 dark:text-slate-200 font-mono text-xs">
                        {row.retirada || '-'}
                      </td>
                      <td className="px-4 py-4 text-blue-600 dark:text-blue-400 font-bold font-mono text-xs">
                        #{String(row.codigo_doacao).padStart(6, '0')}
                      </td>
                      <td className="px-4 py-4 text-slate-800 dark:text-slate-200 font-mono text-xs">
                        #{String(row.codigo_doador).padStart(6, '0')}
                      </td>
                      <td className="px-4 py-4 text-slate-800 dark:text-slate-200 font-medium text-xs">
                        {row.nome_doador}
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 text-xs">
                        {row.endereco}
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 text-xs">
                        {row.bairro}
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 text-xs">
                        {row.regiao}
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 text-xs font-mono">
                        {row.cep}
                      </td>
                      <td className="px-4 py-4 text-slate-800 dark:text-slate-200 font-mono text-xs">
                        {row.remarcada || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* Versão para impressão */}
      {results.length > 0 && (
        <div className="hidden print:block print:bg-white print:text-black p-6">
          <h1 className="text-xl font-bold text-center mb-2" style={{ color: '#000080' }}>
            Relação das Doações do Dia
          </h1>
          <p className="text-center text-sm mb-6" style={{ color: '#000' }}>
            Período: {dataInicio} a {dataFim}
          </p>

          <table className="w-full text-left border-collapse text-xs" style={{ border: '1px solid #000' }}>
            <thead>
              <tr style={{ backgroundColor: '#000080', color: '#fff' }}>
                <th className="px-3 py-2 border" style={{ border: '1px solid #000' }}>RETIRADA</th>
                <th className="px-3 py-2 border" style={{ border: '1px solid #000' }}>DOAÇÃO</th>
                <th className="px-3 py-2 border" style={{ border: '1px solid #000' }}>DOADOR</th>
                <th className="px-3 py-2 border" style={{ border: '1px solid #000' }}>NOME DO DOADOR</th>
                <th className="px-3 py-2 border" style={{ border: '1px solid #000' }}>ENDEREÇO</th>
                <th className="px-3 py-2 border" style={{ border: '1px solid #000' }}>BAIRRO</th>
                <th className="px-3 py-2 border" style={{ border: '1px solid #000' }}>REGIÃO</th>
                <th className="px-3 py-2 border" style={{ border: '1px solid #000' }}>CEP</th>
                <th className="px-3 py-2 border" style={{ border: '1px solid #000' }}>REMARCADA</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 border" style={{ border: '1px solid #000' }}>{row.retirada || '-'}</td>
                  <td className="px-3 py-2 border" style={{ border: '1px solid #000' }}>#{String(row.codigo_doacao).padStart(6, '0')}</td>
                  <td className="px-3 py-2 border" style={{ border: '1px solid #000' }}>#{String(row.codigo_doador).padStart(6, '0')}</td>
                  <td className="px-3 py-2 border" style={{ border: '1px solid #000' }}>{row.nome_doador}</td>
                  <td className="px-3 py-2 border" style={{ border: '1px solid #000' }}>{row.endereco}</td>
                  <td className="px-3 py-2 border" style={{ border: '1px solid #000' }}>{row.bairro}</td>
                  <td className="px-3 py-2 border" style={{ border: '1px solid #000' }}>{row.regiao}</td>
                  <td className="px-3 py-2 border" style={{ border: '1px solid #000' }}>{row.cep}</td>
                  <td className="px-3 py-2 border" style={{ border: '1px solid #000' }}>{row.remarcada || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs text-center mt-6" style={{ color: '#666' }}>
            Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
};
