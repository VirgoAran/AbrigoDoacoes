/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

// Access variables safely from Vite env or process env
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isRealSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-supabase-project.supabase.co');

// Initialize real client if configured
export const supabase = isRealSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local Storage Fallback Database to keep the preview 100% interactive without configuration!
const MOCK_STORAGE_KEYS = {
  DOADORES: 'abrigo_doacoes_doadores',
  DOACOES: 'abrigo_doacoes_doacoes',
  ITENS_DOACAO: 'abrigo_doacoes_itens_doacao',
  CATEGORIA: 'abrigo_doacoes_categoria',
  ITENS: 'abrigo_doacoes_itens',
  MOVIMENTACOES: 'abrigo_doacoes_movimentacoes',
  MOTORISTAS: 'abrigo_doacoes_motoristas',
  VEICULOS: 'abrigo_doacoes_veiculos',
  ENDERECO_COLETA: 'abrigo_doacoes_endereco_coleta',
  REGIOES: 'abrigo_doacoes_regioes',
  TIPOS_DOADOR: 'abrigo_doacoes_tipos_doador',
  PERFIS_USUARIOS: 'abrigo_doacoes_perfis_usuarios',
  LOGS_SISTEMA: 'abrigo_doacoes_logs_sistema',
  USERS_AUTH: 'abrigo_doacoes_users_auth',
  CURRENT_USER: 'abrigo_doacoes_current_user',
};

// Seed initial values if not present
const seedLocalStorage = () => {
  if (!localStorage.getItem(MOCK_STORAGE_KEYS.CATEGORIA)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.CATEGORIA, JSON.stringify([
      { codigo_base: 'ALI', nome: 'Alimentos', descricao: 'Alimentos não perecíveis', status: 'Ativo', created_at: new Date().toISOString() },
      { codigo_base: 'VES', nome: 'Vestuário', descricao: 'Roupas, calçados e agasalhos', status: 'Ativo', created_at: new Date().toISOString() },
      { codigo_base: 'MOV', nome: 'Móveis', descricao: 'Sofás, cadeiras, armários e camas', status: 'Ativo', created_at: new Date().toISOString() },
      { codigo_base: 'ELE', nome: 'Eletrodomésticos', descricao: 'Geladeiras, fogões, microondas', status: 'Ativo', created_at: new Date().toISOString() },
      { codigo_base: 'BRIN', nome: 'Brinquedos', descricao: 'Brinquedos e jogos infantis', status: 'Ativo', created_at: new Date().toISOString() },
    ]));
  }

  if (!localStorage.getItem(MOCK_STORAGE_KEYS.ITENS)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.ITENS, JSON.stringify([
      { codigo_completo: 'ALI-001', codigo_base: 'ALI', nome: 'Arroz T1 (5kg)', unidade: 'KG', qtde: 150, created_at: new Date().toISOString() },
      { codigo_completo: 'ALI-002', codigo_base: 'ALI', nome: 'Feijão Carioca (1kg)', unidade: 'KG', qtde: 85, created_at: new Date().toISOString() },
      { codigo_completo: 'VES-001', codigo_base: 'VES', nome: 'Agasalho de Lã M', unidade: 'UN', qtde: 42, created_at: new Date().toISOString() },
      { codigo_completo: 'VES-002', codigo_base: 'VES', nome: 'Tênis Esportivo Tam 38', unidade: 'UN', qtde: 18, created_at: new Date().toISOString() },
      { codigo_completo: 'MOV-001', codigo_base: 'MOV', nome: 'Cadeira de Escritório', unidade: 'UN', qtde: 12, created_at: new Date().toISOString() },
    ]));
  }

  if (!localStorage.getItem(MOCK_STORAGE_KEYS.DOADORES)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.DOADORES, JSON.stringify([
      {
        codigo_doador: 1,
        nome: 'Maria Silva Mendonça',
        data_cadastro: '2026-07-01',
        celular: '(11) 98765-4321',
        fixo: '(11) 3221-5544',
        contato: 'Irmão Carlos',
        email: 'maria.silva@email.com',
        whatsapp: '(11) 98765-4321',
        cep: '01310-100',
        logradouro: 'Avenida',
        endereco: 'Paulista, 1000 - Ap 42',
        complemento: 'Próximo ao Metrô',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
        cod_tlmk: 'TLMK-01',
        cod_matcob: 'COB-10',
        tipo_doador: 'Pessoa Física',
        dia_semana: 'Terça-feira',
        regiao: 'Centro',
        mapa: 'https://maps.google.com/?q=-23.561,-46.655',
        historico: 'Doadora constante de agasalhos e brinquedos.',
        created_at: new Date().toISOString()
      },
      {
        codigo_doador: 2,
        nome: 'Supermercado Nova Esperança',
        data_cadastro: '2026-07-05',
        celular: '(11) 99911-2233',
        fixo: '(11) 4567-8900',
        contato: 'Gerente Roberto',
        email: 'contato@novaesperanca.com',
        whatsapp: '(11) 99911-2233',
        cep: '04571-010',
        logradouro: 'Rua',
        endereco: 'Bandeirantes, 500',
        complemento: 'Setor de Docas',
        bairro: 'Brooklin',
        cidade: 'São Paulo',
        estado: 'SP',
        cod_tlmk: 'TLMK-03',
        cod_matcob: 'COB-02',
        tipo_doador: 'Pessoa Jurídica',
        dia_semana: 'Quinta-feira',
        regiao: 'Zona Sul',
        mapa: 'https://maps.google.com/?q=-23.608,-46.696',
        historico: 'Doações semanais de alimentos com data de vencimento próxima.',
        created_at: new Date().toISOString()
      },
      {
        codigo_doador: 3,
        nome: 'Distribuidora Aliança Ltda',
        data_cadastro: '2026-07-08',
        celular: '(11) 98877-6655',
        fixo: '(11) 5511-2233',
        contato: 'Diretor Pedro',
        email: 'pedro@alianca.com.br',
        whatsapp: '(11) 98877-6655',
        cep: '02011-200',
        logradouro: 'Rua',
        endereco: 'Voluntários da Pátria, 1500',
        complemento: 'Bloco B',
        bairro: 'Santana',
        cidade: 'São Paulo',
        estado: 'SP',
        cod_tlmk: 'TLMK-04',
        cod_matcob: 'COB-05',
        tipo_doador: 'Pessoa Jurídica',
        dia_semana: 'Segunda-feira',
        regiao: 'Zona Norte',
        mapa: 'https://maps.google.com/?q=-23.502,-46.625',
        historico: 'Doador corporativo de materiais escolares.',
        created_at: new Date().toISOString()
      }
    ]));
  }

  if (!localStorage.getItem(MOCK_STORAGE_KEYS.DOACOES)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.DOACOES, JSON.stringify([
      {
        codigo_doacao: 1,
        codigo_doador: 1,
        data_doacao: '2026-07-05',
        data_retirada: '2026-07-06',
        remarcado_para: '',
        responsavel: 'Ana Souza',
        observacoes: 'Necessita caminhão pequeno para cadeira.',
        data_cancelamento: '',
        data_baixa: '2026-07-06',
        data_solicitacao: '2026-07-04',
        created_at: new Date().toISOString()
      },
      {
        codigo_doacao: 2,
        codigo_doador: 2,
        data_doacao: '2026-07-10',
        data_retirada: '2026-07-11',
        remarcado_para: '',
        responsavel: 'Carlos Santos',
        observacoes: 'Falar com Roberto na recepção.',
        data_cancelamento: '',
        data_baixa: '',
        data_solicitacao: '2026-07-09',
        created_at: new Date().toISOString()
      },
      {
        codigo_doacao: 3,
        codigo_doador: 3,
        data_doacao: '2026-07-15',
        data_retirada: '',
        remarcado_para: '2026-07-18',
        responsavel: 'Lucia Lima',
        observacoes: 'Remarcado conforme pedido do doador.',
        data_cancelamento: '',
        data_baixa: '',
        data_solicitacao: '2026-07-10',
        created_at: new Date().toISOString()
      }
    ]));
  }

  if (!localStorage.getItem(MOCK_STORAGE_KEYS.ITENS_DOACAO)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.ITENS_DOACAO, JSON.stringify([
      { id: 1, id_doacao: '1', categoria: 'Vestuário', item: 'Agasalho de Lã M', unidade: 'UN', qtde: 12, codigo_item: 'VES-001', created_at: new Date().toISOString() },
      { id: 2, id_doacao: '1', categoria: 'Móveis', item: 'Cadeira de Escritório', unidade: 'UN', qtde: 1, codigo_item: 'MOV-001', created_at: new Date().toISOString() },
      { id: 3, id_doacao: '2', categoria: 'Alimentos', item: 'Arroz T1 (5kg)', unidade: 'KG', qtde: 50, codigo_item: 'ALI-001', created_at: new Date().toISOString() },
      { id: 4, id_doacao: '2', categoria: 'Alimentos', item: 'Feijão Carioca (1kg)', unidade: 'KG', qtde: 30, codigo_item: 'ALI-002', created_at: new Date().toISOString() },
      { id: 5, id_doacao: '3', categoria: 'Vestuário', item: 'Tênis Esportivo Tam 38', unidade: 'UN', qtde: 10, codigo_item: 'VES-002', created_at: new Date().toISOString() }
    ]));
  }

  if (!localStorage.getItem(MOCK_STORAGE_KEYS.MOTORISTAS)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.MOTORISTAS, JSON.stringify([
      { id: 'mot-1', nome: 'Reginaldo Ribeiro', rg: '12.345.678-9', cpf: '123.456.789-00', telefone: '(11) 97766-5544', ativo: true, created_at: new Date().toISOString() },
      { id: 'mot-2', nome: 'Cláudio Ferreira', rg: '98.765.432-1', cpf: '987.654.321-11', telefone: '(11) 98877-1122', ativo: true, created_at: new Date().toISOString() }
    ]));
  }

  if (!localStorage.getItem(MOCK_STORAGE_KEYS.VEICULOS)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.VEICULOS, JSON.stringify([
      { id: 'vei-1', descricao: 'Caminhão Iveco Daily', placa: 'ABC-1234', ativo: true, created_at: new Date().toISOString() },
      { id: 'vei-2', descricao: 'Furgão Fiat Ducato', placa: 'XYZ-9876', ativo: true, created_at: new Date().toISOString() }
    ]));
  }

  if (!localStorage.getItem(MOCK_STORAGE_KEYS.REGIOES)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.REGIOES, JSON.stringify([
      { id: 'reg-1', nome: 'Centro' },
      { id: 'reg-2', nome: 'Zona Sul' },
      { id: 'reg-3', nome: 'Zona Norte' },
      { id: 'reg-4', nome: 'Zona Leste' },
      { id: 'reg-5', nome: 'Zona Oeste' }
    ]));
  }

  if (!localStorage.getItem(MOCK_STORAGE_KEYS.TIPOS_DOADOR)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.TIPOS_DOADOR, JSON.stringify([
      { id: 'td-1', nome: 'Pessoa Física' },
      { id: 'td-2', nome: 'Pessoa Jurídica' },
      { id: 'td-3', nome: 'Especial' }
    ]));
  }

  if (!localStorage.getItem(MOCK_STORAGE_KEYS.USERS_AUTH)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.USERS_AUTH, JSON.stringify([
      { id: 'user-admin', email: 'virgo.aranha@gmail.com', password: '123', name: 'Administrador Master', role: 'Administrador', departamento: 'Tecnologia', status: 'Ativo' },
      { id: 'user-op', email: 'operador@abrigo.com', password: '123', name: 'Operador de Triagem', role: 'Operador', departamento: 'Logística', status: 'Ativo' }
    ]));
  }
};

// Auto seed on load
seedLocalStorage();

const PAGE_SIZE = 1000;

export async function fetchAllRecords<T = any>(
  table: string,
  options?: {
    select?: string;
    order?: { column: string; ascending?: boolean };
  }
): Promise<T[]> {
  if (!supabase) return [];

  const allData: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from(table)
      .select(options?.select || '*');

    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }

    const { data, error } = await query.range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allData.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return allData;
}

// Helper to interact with LocalStorage as a database client
export const dbMock = {
  get: <T>(key: keyof typeof MOCK_STORAGE_KEYS): T[] => {
    try {
      const data = localStorage.getItem(MOCK_STORAGE_KEYS[key]);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  
  save: <T>(key: keyof typeof MOCK_STORAGE_KEYS, data: T[]): void => {
    localStorage.setItem(MOCK_STORAGE_KEYS[key], JSON.stringify(data));
  },

  getCurrentUser: () => {
    const user = localStorage.getItem(MOCK_STORAGE_KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
  },

  setCurrentUser: (user: any) => {
    if (user) {
      localStorage.setItem(MOCK_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(MOCK_STORAGE_KEYS.CURRENT_USER);
    }
  },

  logSystem: (userEmail: string, acao: string, modulo: string, detalhes?: string) => {
    const logs = dbMock.get<any>('LOGS_SISTEMA');
    const newLog = {
      id: crypto.randomUUID(),
      usuario_email: userEmail || 'Anônimo',
      acao,
      modulo,
      detalhes,
      terminal: navigator.userAgent.substring(0, 80),
      created_at: new Date().toISOString()
    };
    dbMock.save('LOGS_SISTEMA', [newLog, ...logs]);
  }
};
