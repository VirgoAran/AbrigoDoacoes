import React, { useRef } from "react";
import { Doador, Doacao, ItemDoacao } from "../types";
import { Printer } from "lucide-react";

interface FichaDoacaoReportProps {
  doacao: Doacao;
  doador: Doador;
  itens: ItemDoacao[];
}

export const FichaDoacaoReport: React.FC<FichaDoacaoReportProps> = ({
  doacao,
  doador,
  itens,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return "-";
    const partes = dataStr.split("-");
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
  };

  const formatarTelefone = (tel?: string) => {
    if (!tel) return "";
    const limpado = tel.replace(/\D/g, "");
    if (limpado.length === 11) {
      return `(${limpado.substring(0, 2)}) ${limpado.substring(2, 7)}-${limpado.substring(7)}`;
    }
    if (limpado.length === 10) {
      return `(${limpado.substring(0, 2)}) ${limpado.substring(2, 6)}-${limpado.substring(6)}`;
    }
    return tel;
  };

  const handlePrint = () => {
    window.print();
  };

  const maxRows = 6;
  const dummyRowsNeeded = Math.max(0, maxRows - itens.length);

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
      <style>{`
        @media print {
          #report-print-container-${doacao.codigo_doacao} {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 40px !important;
            background: white !important;
          }
        }
      `}</style>
      <div className="print:hidden flex flex-wrap justify-between items-center gap-3 mb-6 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800">Visualização de Impressão</h3>
          <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-medium">
            Ficha Nº {doacao.codigo_doacao}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório
          </button>
        </div>
      </div>

      <div className="flex justify-center overflow-x-auto p-2 bg-slate-200 rounded-lg print:bg-white print:border-none print:p-0">
        <div
          ref={reportRef}
          id={`report-print-container-${doacao.codigo_doacao}`}
          className="print:block bg-white w-[800px] min-w-[800px] shadow-lg p-10 text-[12px] font-mono text-black leading-tight border border-gray-300 select-all"
        >
          <section className="text-center mb-6">
            <h1 className="text-lg font-bold mb-3 tracking-widest text-black border-b border-black pb-2">
              FICHA DA DOAÇÃO
            </h1>
            <div className="flex justify-between items-start text-left mb-2 text-[11px]">
              <div>
                <p>
                  <span className="font-bold">Doador:</span> {doador.codigo_doador} &nbsp;&nbsp;&nbsp;
                  <span className="font-bold">Doação:</span> {doacao.codigo_doacao} &nbsp;&nbsp;&nbsp;
                  <span className="font-bold">Tipo de Doador:</span> {doador.tipo_doador || "-"}
                </p>
                <p className="mt-1">
                  <span className="font-bold">Retirar em:</span> {formatarData(doacao.data_retirada)}
                </p>
              </div>
              <div className="text-right">
                <p>{doador.cidade || "São Paulo"}, {formatarData(doacao.data_doacao)}</p>
                <p className="mt-1">
                  <span className="font-bold">Remarcado:</span>{" "}
                  {doacao.remarcado_para ? formatarData(doacao.remarcado_para) : "NÃO"}
                </p>
              </div>
            </div>
          </section>

          <section className="mb-6 space-y-1 text-[11px] border-t border-black pt-2">
            <div className="flex">
              <div className="w-1/2 pr-4 border-r border-dotted border-black">
                <p className="whitespace-pre-wrap">
                  <span className="font-bold">Obs.:</span> {doacao.observacoes || "Sem observações cadastrais."}
                </p>
              </div>
              <div className="w-1/2 pl-4">
                <p>
                  <span className="font-bold">Contato:</span> {doador.contato || "-"}
                </p>
              </div>
            </div>

            <div className="flex border-t border-dotted border-black pt-1 mt-1">
              <div className="w-3/4">
                <span className="font-bold">Nome:</span> {doador.nome}
              </div>
              <div className="w-1/4">
                <span className="font-bold">CEP:</span> {doador.cep || "-"}
              </div>
            </div>

            <div className="flex">
              <div className="w-3/4">
                <span className="font-bold">Endereço:</span> {doador.logradouro} {doador.endereco}
              </div>
              <div className="w-1/4">
                <span className="font-bold">Compl.:</span> {doador.complemento || "-"}
              </div>
            </div>

            <div className="flex">
              <div className="w-1/2">
                <span className="font-bold">Bairro:</span> {doador.bairro || "-"}
              </div>
              <div className="w-1/4">
                <span className="font-bold">Mapa:</span> {doador.mapa || "-"}
              </div>
              <div className="w-1/4">
                <span className="font-bold">Região:</span> {doador.regiao || "-"}
              </div>
            </div>

            <div className="flex">
              <div className="w-1/2">
                <span className="font-bold">Fone:</span> {formatarTelefone(doador.celular)}
              </div>
              <div className="w-1/2">
                <span className="font-bold">Email:</span> {doador.email || "-"}
              </div>
            </div>
          </section>

          <section className="mb-6 mt-6">
            <div className="flex justify-between items-end border-b border-black pb-2 mb-1">
              <div className="w-1/3 text-center">
                <p className="mb-1 text-sm">{"-"}</p>
                <div className="border-t border-black w-full text-[9px] uppercase tracking-wider">
                  Veículo
                </div>
              </div>
              <div className="w-1/3 text-center">
                <p className="mb-1 text-sm">{"-"}</p>
                <div className="border-t border-black w-full text-[9px] uppercase tracking-wider">
                  Motorista
                </div>
              </div>
            </div>
            <p className="text-left text-[10px] text-gray-700">
              {doacao.responsavel || "Sem Resp."}
            </p>
            <p className="text-left text-[9px] font-bold tracking-wider text-gray-600">
              ENC. DOAÇÕES
            </p>
          </section>

          <section className="mb-6">
            <div className="font-bold text-[10px] border-b border-black pb-1 mb-1 tracking-widest">
              DADOS DA DOAÇÃO
            </div>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-y border-black uppercase font-bold text-[10px]">
                  <th className="py-1 px-1 w-1/6">QUANTIDADE</th>
                  <th className="py-1 px-1 w-1/6">VOLUME</th>
                  <th className="py-1 px-1 w-1/4">CÓD. DOAÇÃO</th>
                  <th className="py-1 px-1 w-5/12">DESCRIÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-dotted border-gray-400">
                    <td className="py-1 px-1 text-center">{item.qtde}</td>
                    <td className="py-1 px-1">{item.unidade}</td>
                    <td className="py-1 px-1">{doacao.codigo_doacao}</td>
                    <td className="py-1 px-1">{item.item || "-"}</td>
                  </tr>
                ))}
                {Array.from({ length: dummyRowsNeeded }).map((_, i) => (
                  <tr key={`dummy-${i}`} className="border-b border-dotted border-gray-300">
                    <td className="h-6" colSpan={4}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="my-8 border-t-2 border-dashed border-gray-400 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-gray-500 text-[9px] font-bold tracking-widest uppercase flex items-center gap-1">
              DESTACAR AQUI PARA O RECIBO
            </div>
          </div>

          <section className="pt-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="w-14 h-14 border border-black rounded p-1 flex-shrink-0 flex items-center justify-center">
                <svg className="w-12 h-12 text-black" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="15" y="15" width="70" height="70" rx="4" />
                  <path d="M50 25 L50 75" />
                  <path d="M25 50 L75 50" />
                  <circle cx="50" cy="50" r="10" fill="white" stroke="black" strokeWidth="2" />
                </svg>
              </div>
              <div className="text-center flex-1">
                <h2 className="text-[12px] font-bold leading-tight">
                  ASSOCIAÇÃO ESPÍRITA BENEFICENTE DR. ADOLFO BEZERRA DE MENEZES
                </h2>
                <p className="text-[9px] mt-0.5">
                  Rua Dona Vicentina Alegretti, 265 - Penha - São Paulo - SP
                </p>
                <p className="text-[9px]">
                  CEP 03610-030 - Telefone (11) 2164-1800 - C.N.P.J. 60.478.245/0001-51
                </p>
                <p className="text-[9px]">
                  E-mail: doacoes@abrigobezerrademenezes.org.br - Site: www.abrigobezerrademenezes.org.br
                </p>
              </div>
            </div>

            <div className="text-center font-bold text-sm border-y border-black py-1 my-3 tracking-widest uppercase">
              RECIBO DA DOAÇÃO
            </div>

            <div className="space-y-2 mb-4 text-[11px]">
              <p>
                <span className="font-bold">Recebemos do(a) Sr.(a):</span> {doador.nome}
              </p>
              <p>
                <span className="font-bold">Endereço:</span> {doador.logradouro} {doador.endereco}{" "}
                {doador.complemento ? `nº ${doador.complemento}` : ""}
              </p>
              <p>
                <span className="font-bold">Bairro:</span> {doador.bairro || "-"} &nbsp;&nbsp;&nbsp;&nbsp;{" "}
                {doador.cidade || "-"} / {doador.estado || "-"} &nbsp;&nbsp;&nbsp;&nbsp;{" "}
                <span className="font-bold">CEP:</span> {doador.cep || "-"}
              </p>
              <p className="pt-2">As mercadorias abaixo discriminadas:</p>
            </div>

            <table className="w-full text-left text-[11px] border-collapse mb-8">
              <thead>
                <tr className="border-y border-black uppercase font-bold text-[10px]">
                  <th className="py-1 px-1 w-1/6">QUANTIDADE</th>
                  <th className="py-1 px-1 w-1/6">VOLUME</th>
                  <th className="py-1 px-1 w-1/4">CÓD. DOAÇÃO</th>
                  <th className="py-1 px-1 w-5/12">DESCRIÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, index) => (
                  <tr key={`rec-${item.id || index}`} className="border-b border-dotted border-gray-400">
                    <td className="py-1 px-1 text-center">{item.qtde}</td>
                    <td className="py-1 px-1">{item.unidade}</td>
                    <td className="py-1 px-1">{doacao.codigo_doacao}</td>
                    <td className="py-1 px-1">{item.item || "-"}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(2, dummyRowsNeeded - 2) }).map((_, i) => (
                  <tr key={`rec-dummy-${i}`} className="border-b border-dotted border-gray-300">
                    <td className="h-6" colSpan={4}></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-16 flex justify-between gap-8 px-4 text-[10px]">
              <div className="w-5/12 text-center">
                <div className="border-t border-black pt-1 font-bold">Doador</div>
              </div>
              <div className="w-5/12 text-center">
                <div className="border-t border-black pt-1 font-bold">
                  Associação Bezerra de Menezes
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
