/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Doador {
  codigo_doador: number; // sequencial
  data_cadastro?: string;
  celular?: string;
  fixo?: string;
  nome: string;
  contato?: string;
  email?: string;
  whatsapp?: string;
  cep?: string;
  logradouro?: string;
  endereco?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cod_tlmk?: string;
  cod_matcob?: string;
  tipo_doador?: string;
  dia_semana?: string;
  regiao?: string;
  mapa?: string;
  historico?: string;
  created_at?: string;
}

export interface Doacao {
  codigo_doacao: number; // sequencial
  codigo_doador?: number;
  data_doacao?: string;
  data_retirada?: string;
  remarcado_para?: string;
  responsavel?: string;
  observacoes?: string;
  data_cancelamento?: string;
  data_baixa?: string;
  data_solicitacao?: string;
  created_at?: string;
}

export interface ItemDoacao {
  id: number;
  id_doacao: string; // text
  categoria?: string;
  item?: string;
  unidade?: string;
  qtde?: number;
  codigo_item?: string;
  created_at?: string;
}

export interface Categoria {
  codigo_base: string;
  nome: string;
  descricao?: string;
  status?: string;
  created_at?: string;
}

export interface ItemCatalogo {
  codigo_completo: string;
  codigo_base: string;
  nome: string;
  unidade?: string;
  qtde?: number;
  created_at?: string;
}

export interface Movimentacao {
  id: string; // uuid
  codigo_completo: string;
  tipo: 'Entrada' | 'Saída' | 'E' | 'S' | 'Ajuste';
  quantidade: number;
  motivo?: string;
  created_at?: string;
}

export interface Motorista {
  id: string; // uuid
  nome: string;
  rg?: string;
  cpf?: string;
  telefone?: string;
  ativo?: boolean;
  created_at?: string;
}

export interface Veiculo {
  id: string; // uuid
  descricao: string; // fallback from descrição
  placa?: string;
  ativo?: boolean;
  created_at?: string;
}

export interface EnderecoColeta {
  id: number;
  logradouro?: string;
  endereco?: string;
  cep?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  mapa?: string;
  created_at?: string;
}

export interface Regiao {
  id: string; // uuid
  nome: string;
}

export interface TipoDoador {
  id: string; // uuid
  nome: string;
}

export interface PerfilUsuario {
  id: string; // uuid
  user_id: string; // uuid
  email: string;
  role: 'Administrador' | 'Operador' | 'Visualizador' | string;
  departamento?: string;
  status?: string;
  created_at?: string;
}

export interface LogSistema {
  id: string; // uuid
  usuario_email: string;
  acao: string;
  modulo: string;
  detalhes?: string;
  terminal?: string;
  created_at?: string;
}
