import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { 
  ErpField, 
  CatalogProduct, 
  DeParaMapping, 
  EmailOrderData, 
  ERPConnection, 
  EmailConnection, 
  SystemSettings,
  EmailStatus,
  OrderItemMapped,
  OrderItemExtracted,
  ErpCustomer,
  DeParaCliente,
  CurrentUser,
  Company,
  Invoice,
  AuditLog,
  ChatMessage
} from '../types';
import { toast } from 'sonner';

interface FlowState {
  emails: EmailOrderData[];
  catalog: CatalogProduct[];
  dePara: DeParaMapping[];
  deParaClientes: DeParaCliente[];
  erpCustomers: ErpCustomer[];
  erpFields: ErpField[];
  erpConnections: ERPConnection[];
  emailConnection: EmailConnection;
  settings: SystemSettings;
  activeErp: string;
  selectedEmailId: string | null;
  onboardingStep: number;
  isLoading: boolean;
  isOfflineMode: boolean;

  // Multi-Tenant State
  currentUser: CurrentUser | null;
  companies: Company[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  
  // Actions
  fetchInitialData: () => Promise<void>;
  setSelectedEmailId: (id: string | null) => void;
  // Active Emails Selector
  getActiveEmails: () => EmailOrderData[];
  
  // Auth Actions
  login: (email: string, role: 'Admin' | 'Operador' | 'Visualizador', companyId: string | null) => void;
  logout: () => void;
  
  // Admin Actions
  addCompany: (company: Omit<Company, 'id' | 'processedOrdersCount' | 'avgTokenUsage'>) => Promise<void>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  payInvoice: (id: string) => Promise<void>;
  setErpPreset: (presetName: string) => Promise<void>;
  addAuditLog: (action: string, category: 'Cliente' | 'Financeiro' | 'IA' | 'Sistema', details: string) => void;
  generateClientMonthlyInvoice: (companyId: string, period: string) => void;
  
  addErpField: (field: ErpField) => Promise<void>;
  updateErpField: (id: string, field: Partial<ErpField>) => Promise<void>;
  deleteErpField: (id: string) => Promise<void>;
  reorderErpFields: (fields: ErpField[]) => Promise<void>;
  
  addCatalogProduct: (product: CatalogProduct) => Promise<void>;
  updateCatalogProduct: (code: string, product: Partial<CatalogProduct>) => Promise<void>;
  deleteCatalogProduct: (code: string) => Promise<void>;
  importCatalog: (products: CatalogProduct[]) => Promise<void>;
  
  addDeParaMapping: (mapping: DeParaMapping) => Promise<void>;
  updateDeParaMapping: (id: string, mapping: Partial<DeParaMapping>) => Promise<void>;
  deleteDeParaMapping: (id: string) => Promise<void>;
  syncDeParaSuggestions: () => Promise<void>;

  addDeParaCliente: (mapping: DeParaCliente) => Promise<void>;
  deleteDeParaCliente: (id: string) => Promise<void>;
  linkCustomerToErp: (emailId: string, erpCustomerCode: string, type?: 'cnpj' | 'email') => Promise<void>;
  createCustomerInErp: (emailId: string, cnpj: string, razaoSocial: string, type?: 'cnpj' | 'email') => Promise<void>;
  sendEmailReply: (emailId: string, body: string) => Promise<void>;
  
  updateEmailStatus: (emailId: string, status: EmailStatus, error?: string) => Promise<void>;
  sendEmailToErp: (emailId: string) => Promise<boolean>;
  sendBulkToErp: (emailIds: string[]) => Promise<{ success: number; failed: number }>;
  receiveSimulatedEmail: (customEmail?: Partial<EmailOrderData>) => Promise<void>;
  triggerBatchSimulation: (count: number) => Promise<void>;
  
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  updateEmailConnection: (conn: Partial<EmailConnection>) => Promise<void>;
  updateErpConnection: (id: string, conn: Partial<ERPConnection>) => Promise<void>;
  erpGeneralInstruction: string;
  setErpGeneralInstruction: (instruction: string) => void;
  completeOnboardingStep: (step: number) => Promise<void>;
  resetAllData: () => Promise<void>;
  testPromptExtraction: (prompt: string, emailBody: string) => Promise<Record<string, string>>;
}

// Local Storage Sync Helpers
const saveLocalData = (key: string, value: any) => {
  try {
    localStorage.setItem(`softeum_flow_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('Error saving local storage data', e);
  }
};

const loadLocalData = (key: string, fallback: any) => {
  try {
    const item = localStorage.getItem(`softeum_flow_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

// Initial Databases
const defaultCatalog: CatalogProduct[] = [
  { code: 'PROD-001', name: 'Caneta Esferográfica Azul BIC Carga Grossa', description: 'Caneta azul clássica BIC 1.0mm', category: 'Escritório', price: 1.50, unit: 'UN' },
  { code: 'PROD-002', name: 'Caneta Esferográfica Preta BIC Carga Grossa', description: 'Caneta preta clássica BIC 1.0mm', category: 'Escritório', price: 1.50, unit: 'UN' },
  { code: 'PROD-003', name: 'Resma de Papel A4 Chamex 75g 500 Folhas', description: 'Papel sulfite A4 branco para impressão', category: 'Suprimentos', price: 28.90, unit: 'PCT' },
  { code: 'PROD-004', name: 'Caderno Espiral Universitário Tilibra 10 Matérias 200fls', description: 'Caderno universitário capa dura básico', category: 'Escritório', price: 19.90, unit: 'UN' },
  { code: 'PROD-005', name: 'Borracha Escolar Record 20 Mercur Branca', description: 'Borracha natural para lápis macia', category: 'Escritório', price: 0.90, unit: 'UN' },
  { code: 'PROD-006', name: 'Caixa de Lápis de Cor Faber-Castell EcoLápis 24 Cores', description: 'Lápis sextavado madeira reflorestada', category: 'Escritório', price: 32.50, unit: 'CX' },
  { code: 'PROD-007', name: 'Pasta Suspensa Plástica Plastific Verde', description: 'Pasta organizadora com visor e etiqueta', category: 'Organização', price: 4.80, unit: 'UN' },
  { code: 'PROD-008', name: 'Grampeador de Mesa Profissional 20fls Metal', description: 'Grampeador robusto escritório metálico', category: 'Escritório', price: 45.00, unit: 'UN' },
  { code: 'PROD-009', name: 'Caixa de Grampos 26/6 Galvanizado 5000 un', description: 'Grampos de aço galvanizado 26/6', category: 'Escritório', price: 6.20, unit: 'CX' },
  { code: 'PROD-010', name: 'Fita Adesiva Larga Transparente 45mm x 50m Adere', description: 'Fita adesiva para fechamento de caixas', category: 'Embalagem', price: 7.50, unit: 'UN' },
  { code: 'CAM-POLO-AZ-M', name: 'Camisa Polo Azul M', description: 'Camiseta Polo cor Azul tamanho M', category: 'Vestuário', price: 89.90, unit: 'UN' },
  { code: '5252', name: 'Lápis Preto de Escrever Faber', description: 'Lápis de escrever preto graduação HB', category: 'Escritório', price: 1.20, unit: 'UN' },
  { code: 'CAL-JEAN-FEM-38', name: 'Calça Jeans Feminina 38', description: 'Calça jeans slim feminina tamanho 38', category: 'Vestuário', price: 119.90, unit: 'UN' },
  { code: '58585A', name: 'Pasta Transparente Premium', description: 'Pasta plástica transparente com elástico', category: 'Organização', price: 12.50, unit: 'UN' },
  { code: 'MOC-ESC-30L-RO', name: 'Mochila Escolar Resist 30L', description: 'Mochila escolar reforçada com capacidade de 30 litros', category: 'Organização', price: 189.90, unit: 'UN' },
  { code: 'FON-101-IT-BK', name: 'Fone de Ouvido IT Black', description: 'Fone de ouvido preto com microfone', category: 'Eletrônicos', price: 79.90, unit: 'UN' },
  { code: 'TEN-NIKE-RUN-42', name: 'Tênis Nike Running 42', description: 'Tênis de corrida esportivo cor preta', category: 'Calçados', price: 299.90, unit: 'UN' },
  { code: '883883', name: 'Smartwatch Samsung GW6 Black', description: 'Relógio inteligente Samsung Galaxy Watch 6 preto', category: 'Eletrônicos', price: 1999.00, unit: 'UN' },
  { code: '88358', name: 'Panela de Pressão Elétrica 5L', description: 'Panela de pressão elétrica com capacidade de 5 litros', category: 'Eletrodomésticos', price: 389.90, unit: 'UN' },
  { code: '838383', name: 'Kit Skin Care Faber-Castell', description: 'Kit de cuidados com a pele Faber-Castell', category: 'Cosméticos', price: 49.90, unit: 'UN' }
];

const defaultDePara: DeParaMapping[] = [
  { id: '1', incomingTerm: 'CAM-POLO-AZ-M', catalogCode: 'CAM-POLO-AZ-M', confidence: 100, status: 'Confirmado', clientName: 'Maovile', clientCnpj: '55152134000110', description: '', mappingType: 'Manual', isActive: true },
  { id: '2', incomingTerm: '801081', catalogCode: '5252', confidence: 100, status: 'Confirmado', clientName: 'ATACADÃO S.A.', clientCnpj: '66271443000125', description: '', mappingType: 'Manual', isActive: true },
  { id: '3', incomingTerm: 'FEM-CAL38', catalogCode: 'CAL-JEAN-FEM-38', confidence: 100, status: 'Confirmado', clientName: 'TRAMONTINA SA CUTELARIA', clientCnpj: '92772355000117', description: '', mappingType: 'Manual', isActive: true },
  { id: '4', incomingTerm: '02PEP-VERD', catalogCode: '58585A', confidence: 100, status: 'Confirmado', clientName: 'ATACADÃO S.A.', clientCnpj: '66271443000125', description: '', mappingType: 'Manual', isActive: true },
  { id: '5', incomingTerm: 'MOC-ESC-30L-RO', catalogCode: 'MOC-ESC-30L-RO', confidence: 95, status: 'Sugerido pela IA', clientName: '', clientCnpj: '55152134000110', description: 'MOCHILA ESCOLAR RESIST 30L', mappingType: 'Automático', isActive: true },
  { id: '6', incomingTerm: 'FON-101-IT-BK', catalogCode: 'FON-101-IT-BK', confidence: 100, status: 'Confirmado', clientName: 'Maovile', clientCnpj: '55152134000110', description: '', mappingType: 'Manual', isActive: true },
  { id: '7', incomingTerm: 'CAL-JEAN-FEM-38', catalogCode: 'CAL-JEAN-FEM-38', confidence: 100, status: 'Confirmado', clientName: 'Maovile', clientCnpj: '55152134000110', description: '', mappingType: 'Manual', isActive: true },
  { id: '8', incomingTerm: 'TEN-NIKE-RUN-42', catalogCode: 'TEN-NIKE-RUN-42', confidence: 100, status: 'Confirmado', clientName: 'Maovile', clientCnpj: '55152134000110', description: '', mappingType: 'Manual', isActive: true },
  { id: '9', incomingTerm: 'SPN-SAM-GW6-BK', catalogCode: '883883', confidence: 100, status: 'Confirmado', clientName: 'TIGAO', clientCnpj: '08862530000150', description: '', mappingType: 'Manual', isActive: true },
  { id: '10', incomingTerm: 'PAN-PREL-5L-SL', catalogCode: '88358', confidence: 100, status: 'Confirmado', clientName: 'TIGAO', clientCnpj: '08862530000150', description: '', mappingType: 'Manual', isActive: true },
  { id: '11', incomingTerm: 'KIT-SKIN-FC-01', catalogCode: '838383', confidence: 100, status: 'Confirmado', clientName: 'TIGAO', clientCnpj: '08862530000150', description: '', mappingType: 'Manual', isActive: true }
];

const defaultErpCustomers: ErpCustomer[] = [
  { id: 'CLI-001', cnpj: '47960950000121', razaoSocial: 'Magazine Luiza S/A' },
  { id: 'CLI-002', cnpj: '45543915000181', Carrefour: 'Carrefour Brasil S/A' } as any, // fallback properties compatible
  { id: 'CLI-003', cnpj: '60409075000152', razaoSocial: 'Colégio Objetivo Metropolitano' },
  { id: 'CLI-004', cnpj: '01992831000199', razaoSocial: 'Lima & Rezende Advocacia' },
  { id: 'CLI-005', cnpj: '12345678000199', razaoSocial: 'Distribuidora Silva & Filhos Ltda' },
  { id: 'CLI-006', cnpj: '55152134000110', razaoSocial: 'Maovile' },
  { id: 'CLI-007', cnpj: '66271443000125', razaoSocial: 'ATACADÃO S.A.' },
  { id: 'CLI-008', cnpj: '92772355000117', razaoSocial: 'TRAMONTINA SA CUTELARIA' },
  { id: 'CLI-009', cnpj: '08862530000150', razaoSocial: 'TIGAO' }
];

// Seed manual mappings for customers
const defaultDeParaClientes: DeParaCliente[] = [
  { id: 'c-map-1', incomingCnpj: '47960950000121', incomingEmail: 'compras@magalu.com.br', incomingName: 'MAGALU', erpCustomerCode: 'CLI-001', status: 'Confirmado' },
  { id: 'c-map-2', incomingCnpj: '45543915000181', incomingEmail: 'suprimentos@carrefour.com', incomingName: 'Carrefour Brasil', erpCustomerCode: 'CLI-002', status: 'Confirmado' },
  { id: 'c-map-3', incomingCnpj: '60409075000152', incomingName: 'COLÉGIO OBJETIVO', erpCustomerCode: 'CLI-003', status: 'Confirmado' }
];

// Override Carrefour property name standard
if ((defaultErpCustomers[1] as any).Carrefour) {
  defaultErpCustomers[1].razaoSocial = 'Carrefour Brasil S/A';
}

const defaultCompanies: Company[] = [
  {
    id: 'comp-1',
    name: 'Colégio Objetivo Metropolitano',
    cnpj: '60409075000152',
    status: 'Ativo',
    planName: 'Pro AI',
    monthlyFee: 3000.00,
    setupFee: 8000.00,
    setupPaidInstallments: 6,
    setupTotalInstallments: 12,
    orderLimit: 1000,
    overagePrice: 0.10,
    avgTokenUsage: 65400,
    processedOrdersCount: 840,
    erpTarget: 'Bling',
    dueDay: 5,
    contractFileName: 'contrato_objetivo_2026.pdf',
    finContactName: 'Sandra Mara',
    finContactEmail: 'financeiro@objetivo.com.br',
    finContactPhone: '(11) 98765-4321',
    tiContactName: 'Alexandre Silva',
    tiContactEmail: 'ti@objetivo.com.br',
    tiContactPhone: '(11) 91234-5678',
    usersList: [
      { id: 'usr-1', name: 'Objetivo Admin', email: 'admin@objetivo.com.br', role: 'Admin' },
      { id: 'usr-2', name: 'Carlos Santos', email: 'carlos@objetivo.com.br', role: 'Operador' }
    ],
    costSavingFiltersEnabled: true,
    costSavingFilterAttachment: true,
    costSavingFilterKeywords: true,
    costSavingFilterWhitelist: false
  },
  {
    id: 'comp-2',
    name: 'Magazine Luiza S/A',
    cnpj: '47960950000121',
    status: 'Ativo',
    planName: 'Standard AI',
    monthlyFee: 1500.00,
    setupFee: 5000.00,
    setupPaidInstallments: 12,
    setupTotalInstallments: 12,
    orderLimit: 500,
    overagePrice: 0.15,
    avgTokenUsage: 48100,
    processedOrdersCount: 512,
    erpTarget: 'Bling',
    dueDay: 10,
    contractFileName: 'contrato_magalu_final.pdf',
    finContactName: 'Marcos Costa',
    finContactEmail: 'm.costa@magalu.com.br',
    finContactPhone: '(16) 3711-2000',
    tiContactName: 'Paula Souza',
    tiContactEmail: 'paula.souza@magalu.com.br',
    tiContactPhone: '(16) 99887-7665',
    usersList: [
      { id: 'usr-3', name: 'Magalu Operator', email: 'operator@magalu.com.br', role: 'Operador' }
    ],
    costSavingFiltersEnabled: true,
    costSavingFilterAttachment: true,
    costSavingFilterKeywords: true,
    costSavingFilterWhitelist: false
  },
  {
    id: 'comp-3',
    name: 'Carrefour Brasil S/A',
    cnpj: '45543915000181',
    status: 'Ativo',
    planName: 'Enterprise AI',
    monthlyFee: 6000.00,
    setupFee: 15000.00,
    setupPaidInstallments: 3,
    setupTotalInstallments: 12,
    orderLimit: 2500,
    overagePrice: 0.08,
    avgTokenUsage: 72900,
    processedOrdersCount: 1420,
    erpTarget: 'SAP',
    dueDay: 10,
    contractFileName: 'contrato_carrefour_sap_signed.pdf',
    finContactName: 'Juliana Faria',
    finContactEmail: 'faturamento@carrefour.com',
    finContactPhone: '(11) 3779-6000',
    tiContactName: 'Roberto Melo',
    tiContactEmail: 'roberto.melo@carrefour.com',
    tiContactPhone: '(11) 97766-5544',
    usersList: [
      { id: 'usr-4', name: 'Carrefour Viewer', email: 'viewer@carrefour.com.br', role: 'Visualizador' }
    ],
    costSavingFiltersEnabled: false,
    costSavingFilterAttachment: false,
    costSavingFilterKeywords: false,
    costSavingFilterWhitelist: false
  },
  {
    id: 'comp-4',
    name: 'Lima & Rezende Advocacia',
    cnpj: '01992831000199',
    status: 'Suspenso',
    planName: 'Standard AI',
    monthlyFee: 1500.00,
    setupFee: 5000.00,
    setupPaidInstallments: 5,
    setupTotalInstallments: 12,
    orderLimit: 500,
    overagePrice: 0.15,
    avgTokenUsage: 45000,
    processedOrdersCount: 220,
    erpTarget: 'TOTVS',
    dueDay: 20,
    contractFileName: 'contrato_lima_rezende_anexo.pdf',
    finContactName: 'Dr. André Lima',
    finContactEmail: 'andre@limarezende.com',
    finContactPhone: '(11) 5055-1212',
    tiContactName: 'Suporte Lima TI',
    tiContactEmail: 'ti@limarezende.com',
    tiContactPhone: '(11) 96543-2109',
    usersList: [
      { id: 'usr-5', name: 'Dr. André Lima', email: 'andre@limarezende.com', role: 'Admin' }
    ],
    costSavingFiltersEnabled: false,
    costSavingFilterAttachment: false,
    costSavingFilterKeywords: false,
    costSavingFilterWhitelist: false
  }
];

const defaultInvoices: Invoice[] = [
  {
    id: 'inv-1',
    companyId: 'comp-2',
    companyName: 'Magazine Luiza S/A',
    period: 'Maio 2026',
    subscriptionAmount: 1500.00,
    overageAmount: 1.80,
    setupAmount: 416.67,
    totalAmount: 1918.47,
    status: 'Pago',
    dueDate: '10/05/2026'
  },
  {
    id: 'inv-2',
    companyId: 'comp-1',
    companyName: 'Colégio Objetivo Metropolitano',
    period: 'Maio 2026',
    subscriptionAmount: 3000.00,
    overageAmount: 0.00,
    setupAmount: 666.67,
    totalAmount: 3666.67,
    status: 'Pendente',
    dueDate: '05/06/2026'
  },
  {
    id: 'inv-3',
    companyId: 'comp-3',
    companyName: 'Carrefour Brasil S/A',
    period: 'Maio 2026',
    subscriptionAmount: 6000.00,
    overageAmount: 0.00,
    setupAmount: 1250.00,
    totalAmount: 7250.00,
    status: 'Pago',
    dueDate: '10/05/2026'
  },
  {
    id: 'inv-4',
    companyId: 'comp-4',
    companyName: 'Lima & Rezende Advocacia',
    period: 'Maio 2026',
    subscriptionAmount: 1500.00,
    overageAmount: 0.00,
    setupAmount: 416.67,
    totalAmount: 1916.67,
    status: 'Vencido',
    dueDate: '20/05/2026'
  }
];

const defaultAuditLogs: AuditLog[] = [
  { id: 'log-1', timestamp: '30/05/2026 14:20:00', userId: 'u-1', userName: 'Diego Ferreira', action: 'Login', category: 'Sistema', details: 'Diego Ferreira realizou login com sucesso no perfil Admin.' },
  { id: 'log-2', timestamp: '29/05/2026 11:30:15', userId: 'u-1', userName: 'Diego Ferreira', action: 'Configuração Alterada', category: 'Cliente', details: 'Alteração de plano e limites da empresa Colégio Objetivo.' },
  { id: 'log-3', timestamp: '28/05/2026 09:15:30', userId: 'system', userName: 'Sistema Flow AI', action: 'Limite Excedido', category: 'IA', details: 'Empresa Magazine Luiza S/A ultrapassou a franquia mensal de 500 pedidos.' }
];

const erpPresets: Record<string, ErpField[]> = {
  Bling: [
    { id: '1', name: 'codigo_pedido', label: 'Código do Pedido', type: 'Text', required: true, aiInstruction: 'Extraia o código do pedido de compra do cliente (às vezes listado como PO, Pedido, Compra # ou Ref). Não invente valores se não houver.' },
    { id: '2', name: 'cliente_cnpj', label: 'CNPJ do Cliente', type: 'Text', required: true, aiInstruction: 'Extraia o CNPJ da empresa compradora. Remova formatação deixando apenas números. Se o CNPJ não estiver explícito, procure o nome da empresa e deixe o CNPJ em branco.' },
    { id: '3', name: 'cliente_razao', label: 'Razão Social', type: 'Text', required: true, aiInstruction: 'Nome ou Razão Social da empresa que está fazendo o pedido.' },
    { id: '4', name: 'data_emissao', label: 'Data de Emissão', type: 'Date', required: true, aiInstruction: 'A data em que o pedido foi emitido. Se não encontrar, utilize a data de recebimento do e-mail.' },
    { id: '5', name: 'condicao_pagamento', label: 'Condição de Pagamento', type: 'Text', required: false, aiInstruction: 'Extraia os termos de pagamento. Exemplos: "30 dias", "PIX", "Boleto 14/28 dias". Se não especificado, deixe vazio.' },
    { id: '6', name: 'valor_total', label: 'Valor Total', type: 'Number', required: true, aiInstruction: 'Extraia o valor total da compra somando todos os produtos e fretes declarados.' }
  ],
  TOTVS: [
    { id: '1', name: 'C7_NUM', label: 'Nº do Pedido (C7_NUM)', type: 'Text', required: true, aiInstruction: 'Número do pedido de compra gerado pelo comprador.' },
    { id: '2', name: 'C7_CONDPAG', label: 'Cód. Condição Pagto', type: 'Text', required: true, aiInstruction: 'Código ou descrição da condição de pagamento (ex: 01, 30 D, etc.)' },
    { id: '3', name: 'C7_CLIENTE', label: 'CNPJ do Cliente', type: 'Text', required: true, aiInstruction: 'CNPJ da empresa compradora para busca no Protheus.' },
    { id: '4', name: 'C7_EMISSAO', label: 'Data Emissão (C7_EMISSAO)', type: 'Date', required: true, aiInstruction: 'Data do pedido.' },
    { id: '5', name: 'C7_TRANSPORTADORA', label: 'Transportadora', type: 'Text', required: false, aiInstruction: 'Transportadora indicada para coleta.' }
  ],
  Omie: [
    { id: '1', name: 'codigo_pedido_cliente', label: 'Pedido do Cliente', type: 'Text', required: true, aiInstruction: 'Código/número do pedido de compra do cliente.' },
    { id: '2', name: 'cnpj_cliente', label: 'CNPJ Faturamento', type: 'Text', required: true, aiInstruction: 'CNPJ do cliente' },
    { id: '3', name: 'data_previsao', label: 'Data Prevista Entrega', type: 'Date', required: false, aiInstruction: 'Data prevista para entrega dos produtos solicitados.' },
    { id: '4', name: 'obs_pedido', label: 'Observações do Pedido', type: 'Text', required: false, aiInstruction: 'Instruções especiais ou observações enviadas no corpo do e-mail.' }
  ],
  SAP: [
    { id: '1', name: 'SAP_PurchaseOrder', label: 'Purchase Order (PO)', type: 'Text', required: true, aiInstruction: 'SAP PO number. Usually starts with 45 or 50.' },
    { id: '2', name: 'SAP_TaxID', label: 'CNPJ/CPF', type: 'Text', required: true, aiInstruction: 'Customer Tax Identifier (CNPJ) with 14 digits.' },
    { id: '3', name: 'SAP_PaymentTerms', label: 'Payment Terms Code', type: 'Text', required: true, aiInstruction: 'Terms of payment (e.g. NT30, NT60, PT00).' },
    { id: '4', name: 'SAP_Incoterms', label: 'Incoterms', type: 'Select', required: false, aiInstruction: 'Incoterm specified (FOB, CIF, EXW, DDP). Leave empty if not present.' }
  ],
  Senior: [
    { id: '1', name: 'numPedCli', label: 'Pedido do Cliente', type: 'Text', required: true, aiInstruction: 'Número do pedido de compra recebido.' },
    { id: '2', name: 'cgcCli', label: 'CNPJ do Cliente', type: 'Text', required: true, aiInstruction: 'CNPJ de faturamento.' },
    { id: '3', name: 'datEmi', label: 'Data Emissão', type: 'Date', required: true, aiInstruction: 'Data do pedido.' },
    { id: '4', name: 'obsPed', label: 'Observação Interna', type: 'Text', required: false, aiInstruction: 'Observações para impressão na nota.' }
  ]
};

const defaultErpConnections: ERPConnection[] = [
  { id: 'bling', name: 'Bling ERP', logo: 'B', connected: true, apiKey: 'apikey_bling_prod_88f918072120bc9e', baseUrl: 'https://api.bling.com.br/v3', lastSyncTime: '27/05/2026 17:30' },
  { id: 'totvs', name: 'TOTVS Protheus', logo: 'T', connected: false, apiKey: '', baseUrl: 'https://totvs-rest.empresa.com.br/api', lastSyncTime: undefined },
  { id: 'omie', name: 'Omie ERP', logo: 'O', connected: false, apiKey: '', baseUrl: 'https://developer.omie.com.br/api/v1', lastSyncTime: undefined },
  { id: 'sap', name: 'SAP S/4HANA', logo: 'S', connected: false, apiKey: '', baseUrl: 'https://sandbox.sap.com/odata', lastSyncTime: undefined },
  { id: 'senior', name: 'Senior ERP', logo: 'R', connected: false, apiKey: '', baseUrl: 'https://api.senior.com.br/sapiens', lastSyncTime: undefined },
  { id: 'custom', name: 'Outro / Genérico (API REST)', logo: 'G', connected: false, apiKey: '', baseUrl: 'https://erp.empresa.com/api/v1/pedidos', lastSyncTime: undefined }
];

const companyNames = [
  'Magalu Comércio Varejista S.A.', 'Grupo Carrefour Brasil Ltda', 'Supermercados Pão de Açúcar S/A',
  'Lojas Americanas S.A.', 'Papelaria Central de Pinheiros', 'Colégio Objetivo Metropolitano',
  'Escritório Associado de Advocacia Lima & Rezende', 'Distribuidora de Alimentos Silva & Filhos',
  'Construtora Tenda S.A.', 'Hospital Santa Catarina', 'Indústria Química Bandeirantes', 'Hotel Fasano São Paulo'
];

const senderEmails = [
  'compras@magalu.com.br', 'suprimentos@carrefour.com', 'pedidos@paodeacucar.com.br',
  'compras@americanas.com', 'contato@papelariacentral.com.br', 'financeiro@objetivo.edu.br',
  'administrativo@limarezende.adv.br', 'comercial@distribuidorasilva.com', 'suprimentos@tenda.com.br',
  'compras@hospitalsantacatarina.org.br', 'pedidos@quimicabandeirantes.com.br', 'compras@fasano.com.br'
];

const buyerNames = [
  'Marcos Souza', 'Sandra Pires', 'Roberto Alves', 'Aline Vieira', 'Juliana Lima', 'Cláudio Ferreira',
  'Dr. Lucas Rezende', 'Carlos Silva', 'Eng. Pedro Costa', 'Dra. Ana Paula', 'Gisele Schmidt', 'Fernando Melo'
];

// Helper to format CNPJ with dots and slash
const formatCNPJ = (val: string) => {
  const digits = val.replace(/\D/g, '');
  if (digits.length !== 14) return val;
  return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
};

const rawItemsPool: OrderItemExtracted[][] = [
  [
    { rawDescription: 'Resma de Papel A4 Chamex 75g 500 Folhas', quantity: 15, unitPrice: 28.90 },
    { rawDescription: 'Caneta BIC azul', quantity: 30, unitPrice: 1.50 },
    { rawDescription: 'Caneta BIC preta', quantity: 15, unitPrice: 1.50 }
  ],
  [
    { rawDescription: 'Caderno Tilibra 10mat', quantity: 45, unitPrice: 19.90 },
    { rawDescription: 'Borracha Mercur', quantity: 10, unitPrice: 0.90 }
  ],
  [
    { rawDescription: 'Grampeador de Mesa Profissional 20fls Metal', quantity: 3, unitPrice: 45.00 },
    { rawDescription: 'Grampos 26/6', quantity: 12, unitPrice: 6.20 },
    { rawDescription: 'Fita Adesiva Larga', quantity: 8, unitPrice: 7.50 }
  ],
  [
    { rawDescription: 'Resma de papel A4', quantity: 100, unitPrice: 27.50 },
    { rawDescription: 'Pasta Suspensa Plástica Plastific Verde', quantity: 50, unitPrice: 4.80 }
  ],
  [
    { rawDescription: 'Lápis Faber Castell 24', quantity: 25, unitPrice: 32.50 },
    { rawDescription: 'Caderno Tilibra 10mat', quantity: 20, unitPrice: 19.90 }
  ]
];

function generateExtractedFields(erp: string, company: string, _email: string, valTotal: number, forceCnpj?: string): Record<string, string> {
  const cnpj = forceCnpj || Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
  const rawId = Math.floor(10000 + Math.random() * 90000).toString();
  const today = new Date().toLocaleDateString('pt-BR');
  
  if (erp === 'Bling') {
    return {
      codigo_pedido: `PED-${rawId}`,
      cliente_cnpj: cnpj,
      cliente_razao: company,
      data_emissao: today,
      condicao_pagamento: 'Boleto 30 dias',
      valor_total: valTotal.toFixed(2)
    };
  } else if (erp === 'TOTVS') {
    return {
      C7_NUM: `PO-${rawId}`,
      C7_CONDPAG: '030',
      C7_CLIENTE: cnpj,
      C7_EMISSAO: today,
      C7_TRANSPORTADORA: 'Braspress Ltda'
    };
  } else if (erp === 'Omie') {
    return {
      codigo_pedido_cliente: `OM-${rawId}`,
      cnpj_cliente: cnpj,
      data_previsao: today,
      obs_pedido: 'Entregar no horário comercial.'
    };
  } else if (erp === 'SAP') {
    return {
      SAP_PurchaseOrder: `45000${rawId}`,
      SAP_TaxID: cnpj,
      SAP_PaymentTerms: 'NT30',
      SAP_Incoterms: 'CIF'
    };
  } else {
    return {
      numPedCli: `SEN-${rawId}`,
      cgcCli: cnpj,
      datEmi: today,
      obsPed: 'Solicitação via e-mail.'
    };
  }
}

const defaultEmails: EmailOrderData[] = [
  {
    id: 'email-1',
    senderName: 'Marcos Souza',
    senderEmail: 'compras@magalu.com.br',
    subject: 'PEDIDO DE COMPRA #4412 - MAGALU',
    receivedAt: '27/05/2026 14:15',
    status: 'Enviado ao ERP',
    rawBody: `Prezados,\n\nSegue a nossa solicitação de compra para materiais de escritório da filial central.\n\nItens:\n15x Papel A4 Chamex\n30x Caneta BIC azul\n15x Caneta BIC preta\n\nCNPJ: 47.960.950/0001-21\nRazão Social: Magazine Luiza S/A\nFaturamento para: 30 dias no boleto.\n\nAtenciosamente,\nMarcos Souza\nSetor de Suprimentos`,
    extractedFields: {
      codigo_pedido: 'PED-4412',
      cliente_cnpj: '47960950000121',
      cliente_razao: 'Magazine Luiza S/A',
      data_emissao: '27/05/2026',
      condicao_pagamento: 'Boleto 30 dias',
      valor_total: '501.00'
    },
    mappedFields: {
      codigo_pedido: 'PED-4412',
      cliente_cnpj: '47960950000121',
      cliente_razao: 'Magazine Luiza S/A',
      data_emissao: '27/05/2026',
      condicao_pagamento: 'Boleto 30 dias',
      valor_total: '501.00'
    },
    rawItems: [
      { rawDescription: 'Papel A4 Chamex', quantity: 15, unitPrice: 28.90 },
      { rawDescription: 'Caneta BIC azul', quantity: 30, unitPrice: 1.50 },
      { rawDescription: 'Caneta BIC preta', quantity: 15, unitPrice: 1.50 }
    ],
    items: [
      { catalogCode: 'PROD-003', catalogName: 'Resma de Papel A4 Chamex 75g 500 Folhas', quantity: 15, unitPrice: 28.90, totalPrice: 433.50, unit: 'PCT' },
      { catalogCode: 'PROD-001', catalogName: 'Caneta Esferográfica Azul BIC Carga Grossa', quantity: 30, unitPrice: 1.50, totalPrice: 45.00, unit: 'UN' },
      { catalogCode: 'PROD-002', catalogName: 'Caneta Esferográfica Preta BIC Carga Grossa', quantity: 15, unitPrice: 1.50, totalPrice: 22.50, unit: 'UN' }
    ],
    erpTarget: 'Bling',
    confidenceScore: 97,
    attachmentName: 'ped_compra_4412.pdf',
    erpPayloadSent: `{\n  "numero": "PED-4412",\n  "data": "27/05/2026",\n  "cliente": {\n    "cnpj": "47960950000121",\n    "nome": "Magazine Luiza S/A"\n  },\n  "itens": [\n    { "codigo": "PROD-003", "qtde": 15, "vlr_unit": 28.90 },\n    { "codigo": "PROD-001", "qtde": 30, "vlr_unit": 1.50 },\n    { "codigo": "PROD-002", "qtde": 15, "vlr_unit": 1.50 }\n  ],\n  "total": 501.00\n}`,
    erpResponseLog: `{\n  "status": 201,\n  "message": "Criado com sucesso no Bling ERP",\n  "id_erp": "99120938",\n  "data_sincronizacao": "2026-05-27T14:16:02Z"\n}`,
    chatMessages: [
      { id: 'm1-1', sender: 'buyer', text: 'Prezados, Segue a nossa solicitação de compra para materiais de escritório da filial central.\n\nItens:\n15x Papel A4 Chamex\n30x Caneta BIC azul\n15x Caneta BIC preta\n\nCNPJ: 47.960.950/0001-21\nRazão Social: Magazine Luiza S/A\nFaturamento para: 30 dias no boleto.', timestamp: '27/05/2026 14:10' },
      { id: 'm1-2', sender: 'agent', text: 'Olá! Sou o assistente de IA da Softeum. Localizei o cadastro de Magazine Luiza S/A e identifiquei os seguintes produtos no nosso catálogo:\n\n- 15x Resma de Papel A4 Chamex 75g (PROD-003)\n- 30x Caneta Esferográfica Azul BIC (PROD-001)\n- 15x Caneta Esferográfica Preta BIC (PROD-002)\n\nValor total: R$ 501,00 faturados para 30 dias.\n\nPosso confirmar o envio para o ERP?', timestamp: '27/05/2026 14:12' },
      { id: 'm1-3', sender: 'buyer', text: 'Sim, confirmado. Pode faturar.', timestamp: '27/05/2026 14:14' },
      { id: 'm1-4', sender: 'agent', text: 'Perfeito! Pedido integrado com sucesso no Bling ERP (ID: ERP-ORD-99120938). Nota fiscal e boleto serão disparados em breve.', timestamp: '27/05/2026 14:15' }
    ]
  },
  {
    id: 'email-2',
    senderName: 'Sandra Pires',
    senderEmail: 'suprimentos@carrefour.com',
    subject: 'Ordem de Compra OC-9988 - Carrefour Brasil',
    receivedAt: '27/05/2026 15:30',
    status: 'Aguardando',
    rawBody: `Bom dia,\n\nPrecisamos dos seguintes produtos para reposição imediata:\n\n- 45 unidades de Caderno Tilibra 10mat\n- 10 unidades de Borracha Mercur\n\nCNPJ: 45.543.915/0001-81\nNúmero da Ordem: OC-9988\n\nFavor faturar em nosso CNPJ e enviar boleto.\n\nSandra Pires\nCarrefour Brasil`,
    extractedFields: {
      codigo_pedido: 'OC-9988',
      cliente_cnpj: '45543915000181',
      cliente_razao: 'Carrefour Brasil S/A',
      data_emissao: '27/05/2026',
      condicao_pagamento: 'Boleto',
      valor_total: '904.50'
    },
    mappedFields: {
      codigo_pedido: 'OC-9988',
      cliente_cnpj: '45543915000181',
      cliente_razao: 'Carrefour Brasil S/A',
      data_emissao: '27/05/2026',
      condicao_pagamento: 'Boleto',
      valor_total: '904.50'
    },
    rawItems: [
      { rawDescription: 'Caderno Tilibra 10mat', quantity: 45, unitPrice: 19.90 },
      { rawDescription: 'Borracha Mercur', quantity: 10, unitPrice: 0.90 }
    ],
    items: [
      { catalogCode: 'PROD-004', catalogName: 'Caderno Espiral Universitário Tilibra 10 Matérias 200fls', quantity: 45, unitPrice: 19.90, totalPrice: 895.50, unit: 'UN' },
      { catalogCode: 'PROD-005', catalogName: 'Borracha Escolar Record 20 Mercur Branca', quantity: 10, unitPrice: 0.90, totalPrice: 9.00, unit: 'UN' }
    ],
    erpTarget: 'Bling',
    confidenceScore: 89,
    attachmentName: 'ordem_compra_9988.pdf',
    isOpened: false,
    chatMessages: [
      { id: 'm2-1', sender: 'buyer', text: 'Bom dia, Precisamos dos seguintes produtos para reposição imediata:\n\n- 45 unidades de Caderno Tilibra 10mat\n- 10 unidades de Borracha Mercur\n\nCNPJ: 45.543.915/0001-81\nNúmero da Ordem: OC-9988\n\nFavor faturar em nosso CNPJ e enviar boleto.', timestamp: '27/05/2026 15:25' },
      { id: 'm2-2', sender: 'agent', text: 'Olá! Analisando os dados da compra para Carrefour Brasil S/A...\n\nProdutos identificados:\n- 45x Caderno Espiral Universitário Tilibra 10 Matérias (PROD-004) - R$ 895,50\n- 10x Borracha Escolar Record 20 Mercur (PROD-005) - R$ 9,00\n\nTotal do pedido: R$ 904,50.\nSeus dados estão consistentes e o faturamento está pronto para processamento. Aguardando liberação do faturamento.', timestamp: '27/05/2026 15:30' }
    ]
  },
  {
    id: 'email-3',
    senderName: 'Aline Vieira',
    senderEmail: 'contato@papelariacentral.com.br',
    subject: 'Solicitação de materiais - Papelaria Central de Pinheiros',
    receivedAt: '27/05/2026 16:05',
    status: 'Revisão Manual',
    rawBody: `Olá,\n\nPreciso de:\n3 un de Grampeador de Mesa Profissional 20fls Metal\n12 un de Grampos 26/6\n8 un de Fita Adesiva Larga\n\nNão tenho o número do CNPJ aqui de cabeça, mas faturem na nossa conta de costume por favor. Enviar com a transportadora Braspress.\n\nAtt,\nAline`,
    extractedFields: {
      codigo_pedido: '',
      cliente_cnpj: '',
      cliente_razao: 'Papelaria Central de Pinheiros',
      data_emissao: '27/05/2026',
      condicao_pagamento: '',
      valor_total: '269.40'
    },
    mappedFields: {
      codigo_pedido: '',
      cliente_cnpj: '',
      cliente_razao: 'Papelaria Central de Pinheiros',
      data_emissao: '27/05/2026',
      condicao_pagamento: '',
      valor_total: '269.40'
    },
    rawItems: [
      { rawDescription: 'Grampeador de Mesa Profissional 20fls Metal', quantity: 3, unitPrice: 45.00 },
      { rawDescription: 'Grampos 26/6', quantity: 12, unitPrice: 6.20 },
      { rawDescription: 'Fita Adesiva Larga', quantity: 8, unitPrice: 7.50 }
    ],
    items: [
      { catalogCode: 'PROD-008', catalogName: 'Grampeador de Mesa Profissional 20fls Metal', quantity: 3, unitPrice: 45.00, totalPrice: 135.00, unit: 'UN' },
      { catalogCode: 'PROD-009', catalogName: 'Caixa de Grampos 26/6 Galvanizado 5000 un', quantity: 12, unitPrice: 6.20, totalPrice: 74.40, unit: 'CX' },
      { catalogCode: 'PROD-010', catalogName: 'Fita Adesiva Larga Transparente 45mm x 50m Adere', quantity: 8, unitPrice: 7.50, totalPrice: 60.00, unit: 'UN' }
    ],
    erpTarget: 'Bling',
    confidenceScore: 65,
    errorMessage: 'CNPJ obrigatório não encontrado no pedido. Código de pedido não encontrado.',
    attachmentName: 'cotacao_central_pinheiros.pdf',
    isOpened: false,
    chatMessages: [
      { id: 'm3-1', sender: 'buyer', text: 'Olá, Preciso de:\n3 un de Grampeador de Mesa Profissional 20fls Metal\n12 un de Grampos 26/6\n8 un de Fita Adesiva Larga\n\nNão tenho o número do CNPJ aqui de cabeça, mas faturem na nossa conta de costume por favor. Enviar com a transportadora Braspress.', timestamp: '27/05/2026 16:00' },
      { id: 'm3-2', sender: 'agent', text: 'Olá! Entendi os produtos desejados:\n- 3x Grampeador de Mesa Profissional 20fls (PROD-008)\n- 12x Caixa de Grampos 26/6 (PROD-009)\n- 8x Fita Adesiva Larga Transparente (PROD-010)\n\nNo entanto, não localizei o CNPJ associado para faturamento. Como o CNPJ é obrigatório para integração no ERP, direcionei seu atendimento para que um atendente manual nos auxilie.', timestamp: '27/05/2026 16:05' }
    ]
  },
  {
    id: 'email-4',
    senderName: 'Carlos Santos',
    senderEmail: 'carlos.santos@gmail.com',
    subject: 'Dúvida sobre prazo de entrega',
    receivedAt: '27/05/2026 16:30',
    status: 'E-mail Geral',
    rawBody: `Olá pessoal,\n\nSabem me dizer qual é o prazo médio de entrega para a região de Pinheiros?\nTenho interesse em comprar em grande quantidade.\n\nObrigado,\nCarlos`,
    extractedFields: {},
    mappedFields: {},
    rawItems: [],
    items: [],
    erpTarget: 'Bling',
    confidenceScore: 0,
    isOpened: false,
    chatMessages: [
      { id: 'm4-1', sender: 'buyer', text: 'Olá pessoal, Sabem me dizer qual é o prazo médio de entrega para a região de Pinheiros? Tenho interesse em comprar em grande quantidade. Obrigado, Carlos', timestamp: '27/05/2026 16:30' },
      { id: 'm4-2', sender: 'agent', text: 'Olá, Carlos! O prazo de entrega padrão para Pinheiros é de até 2 dias úteis para mercadorias em estoque. Para volumes corporativos maiores, podemos agendar frete dedicado. Gostaria de cotar algum item específico?', timestamp: '27/05/2026 16:32' }
    ]
  }
];

export const useFlowStore = create<FlowState>((set, get) => ({
  emails: loadLocalData('emails', defaultEmails) || defaultEmails,
  catalog: loadLocalData('catalog', defaultCatalog) || defaultCatalog,
  dePara: loadLocalData('depara', defaultDePara) || defaultDePara,
  deParaClientes: loadLocalData('depara_clientes', defaultDeParaClientes) || defaultDeParaClientes,
  erpCustomers: loadLocalData('erp_customers', defaultErpCustomers) || defaultErpCustomers,
  erpFields: loadLocalData('erp_fields', erpPresets.Bling) || erpPresets.Bling,
  erpConnections: loadLocalData('erp_connections', defaultErpConnections) || defaultErpConnections,
  emailConnection: loadLocalData('email_connection', { provider: 'IMAP', connected: true, lastSyncTime: '27/05/2026 17:50' }),
  settings: (() => {
    const defaults = {
      companyName: 'Softeum Logística Integrada Ltda',
      aiEnabled: true,
      confidenceThreshold: 80,
      autoSendToErp: false,
      notifyErrors: true,
      notifyDailySummary: true,
      usageCount: 1420,
      usageLimit: 5000,
      teamMembers: [
        { id: '1', email: 'diego@softeum.com.br', role: 'Admin' },
        { id: '2', email: 'lucas.silva@softeum.com.br', role: 'Operador' },
        { id: '3', email: 'diretoria@softeum.com.br', role: 'Visualizador' }
      ],
      replyTemplateConfirm: 'Olá {cliente},\n\nRecebemos o seu pedido com sucesso! O processamento foi iniciado e as informações já foram transmitidas para o nosso ERP.\n\nAtenciosamente,\nEquipe de Suprimentos',
      replyTemplateInconsistency: 'Olá {cliente},\n\nIdentificamos que alguns produtos do seu pedido de compra não coincidem com o nosso catálogo oficial. Por favor, confirme as descrições ou códigos dos itens para que possamos prosseguir com o faturamento.\n\nAtenciosamente,\nEquipe de Suprimentos',
      replyTemplateNoRegistration: 'Olá {cliente},\n\nNão conseguimos localizar o cadastro corporativo da sua empresa no nosso sistema através das informações do e-mail. Poderia nos enviar o CNPJ e a Razão Social da empresa para faturamento?\n\nAtenciosamente,\nEquipe de Suprimentos',
      costSavingFiltersEnabled: true,
      costSavingFilterAttachment: true,
      costSavingFilterKeywords: true,
      costSavingFilterWhitelist: false,
      savedAiCost: 112.50,
      filteredEmailsCount: 2250
    };
    const loaded = loadLocalData('settings', {});
    return { ...defaults, ...loaded };
  })(),
  activeErp: loadLocalData('active_erp', 'Bling'),
  selectedEmailId: null,
  onboardingStep: loadLocalData('onboarding_step', 3),
  isLoading: false,
  isOfflineMode: !isSupabaseConfigured,
  currentUser: loadLocalData('current_user', null),
  companies: loadLocalData('companies', defaultCompanies) || defaultCompanies,
  invoices: loadLocalData('invoices', defaultInvoices) || defaultInvoices,
  auditLogs: loadLocalData('audit_logs', defaultAuditLogs) || defaultAuditLogs,
  erpGeneralInstruction: loadLocalData('erp_general_instruction', null) || 'Você é um assistente especialista em extração de dados B2B. Leia o e-mail de pedido de compra fornecido e extraia os valores correspondentes para cada campo listado abaixo.',

  // Fetch Database Initializer
  fetchInitialData: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ isOfflineMode: true });
      return;
    }

    set({ isLoading: true, isOfflineMode: false });
    try {
      const [
        { data: cat },
        { data: dp },
        { data: dpc },
        { data: cust },
        { data: fields },
        { data: ems },
        { data: conns },
        { data: sets }
      ] = await Promise.all([
        supabase.from('catalog_products').select('*'),
        supabase.from('depara_mappings').select('*'),
        supabase.from('depara_clientes').select('*'),
        supabase.from('erp_customers').select('*'),
        supabase.from('erp_layout_fields').select('*'),
        supabase.from('emails_orders').select('*'),
        supabase.from('connections').select('*'),
        supabase.from('settings').select('*')
      ]);

      if (cat) {
        set({ catalog: cat.map(p => ({ code: p.code, name: p.name, description: p.description || '', category: p.category, price: parseFloat(p.price), unit: p.unit })) });
      }
      if (dp) {
        set({ dePara: dp.map(d => ({ id: d.id, incomingTerm: d.incoming_term, catalogCode: d.catalog_code, confidence: d.confidence, status: d.status })) });
      }
      if (dpc) {
        set({ deParaClientes: dpc.map(d => ({ id: d.id, incomingCnpj: d.incoming_cnpj || undefined, incomingEmail: d.incoming_email || undefined, incomingName: d.incoming_name, erpCustomerCode: d.erp_customer_code, status: d.status })) });
      }
      if (cust) {
        set({ erpCustomers: cust.map(c => ({ id: c.id, cnpj: c.cnpj, razaoSocial: c.razao_social })) });
      }
      if (fields && fields.length > 0) {
        set({ erpFields: fields.map(f => ({ id: f.id, name: f.name, label: f.label, type: f.type as any, required: f.required, aiInstruction: f.ai_instruction, defaultValue: f.default_value || undefined, validationRule: f.validation_rule || undefined })) });
      }
      if (ems) {
        set({ emails: ems.map(e => ({ id: e.id, senderName: e.sender_name, senderEmail: e.sender_email, subject: e.subject, receivedAt: e.received_at, status: e.status as any, rawBody: e.raw_body, extractedFields: e.extracted_fields, mappedFields: e.mapped_fields, items: e.items, rawItems: e.raw_items, erpTarget: e.erp_target, errorMessage: e.error_message || undefined, confidenceScore: e.confidence_score, replies: e.replies || [] })) });
      }
      if (conns && conns.length > 0) {
        set({ erpConnections: conns.filter(c => c.id !== 'email').map(c => ({ id: c.id, name: c.name, logo: c.logo || '', connected: c.connected, apiKey: c.api_key || '', baseUrl: c.base_url || '', lastSyncTime: c.last_sync_time || undefined })) });
        const emailC = conns.find(c => c.id === 'email');
        if (emailC) {
          set({ emailConnection: { provider: emailC.extra_config.provider || 'IMAP', connected: emailC.connected, lastSyncTime: emailC.last_sync_time || undefined, imapHost: emailC.extra_config.imapHost, imapPort: emailC.extra_config.imapPort, imapUser: emailC.extra_config.imapUser } });
        }
      }
      if (sets && sets.length > 0) {
        const s = sets[0];
        set({
          settings: {
            companyName: s.company_name,
            aiEnabled: s.ai_enabled,
            confidenceThreshold: s.confidence_threshold,
            autoSendToErp: s.auto_send_to_erp || false,
            notifyErrors: s.notify_errors,
            notifyDailySummary: s.notify_daily_summary,
            usageCount: s.usage_count,
            usageLimit: s.usage_limit,
            teamMembers: get().settings.teamMembers, // Maintain team locally
            replyTemplateConfirm: s.reply_template_confirm || get().settings.replyTemplateConfirm,
            replyTemplateInconsistency: s.reply_template_inconsistency || get().settings.replyTemplateInconsistency,
            replyTemplateNoRegistration: s.reply_template_no_registration || get().settings.replyTemplateNoRegistration,
            costSavingFiltersEnabled: s.cost_saving_filters_enabled !== undefined ? s.cost_saving_filters_enabled : get().settings.costSavingFiltersEnabled,
            costSavingFilterAttachment: s.cost_saving_filter_attachment !== undefined ? s.cost_saving_filter_attachment : get().settings.costSavingFilterAttachment,
            costSavingFilterKeywords: s.cost_saving_filter_keywords !== undefined ? s.cost_saving_filter_keywords : get().settings.costSavingFilterKeywords,
            costSavingFilterWhitelist: s.cost_saving_filter_whitelist !== undefined ? s.cost_saving_filter_whitelist : get().settings.costSavingFilterWhitelist,
            savedAiCost: s.saved_ai_cost !== undefined ? s.saved_ai_cost : get().settings.savedAiCost,
            filteredEmailsCount: s.filtered_emails_count !== undefined ? s.filtered_emails_count : get().settings.filteredEmailsCount
          }
        });
      }
    } catch (error) {
      console.error('Supabase initial fetch failed, fallback to offline', error);
      set({ isOfflineMode: true });
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedEmailId: (id) => set({ selectedEmailId: id }),

  getActiveEmails: () => {
    const { currentUser, companies, emails } = get();
    if (!currentUser) return [];
    
    let targetCompanyCnpj = '';
    let targetCompanyName = '';
    
    const comp = companies.find(c => c.id === currentUser.companyId);
    if (comp) {
      targetCompanyCnpj = comp.cnpj.replace(/\D/g, '');
      targetCompanyName = comp.name.toLowerCase();
    }
    
    if (!targetCompanyCnpj) return emails;
    
    return emails.filter(email => {
      // 1. Check if CNPJ matches in extracted fields
      const hasCnpjMatch = Object.values(email.extractedFields).some(val => {
        if (typeof val === 'string') {
          return val.replace(/\D/g, '') === targetCompanyCnpj;
        }
        return false;
      });
      if (hasCnpjMatch) return true;
      
      // 2. Check if CNPJ matches in mapped fields
      const hasMappedCnpjMatch = Object.values(email.mappedFields).some(val => {
        if (typeof val === 'string') {
          return val.replace(/\D/g, '') === targetCompanyCnpj;
        }
        return false;
      });
      if (hasMappedCnpjMatch) return true;

      // 3. Fallback: match by company name parts
      const companyNameClean = targetCompanyName.replace(/(s\/a|ltda|mep|eireli|s\.a\.)/gi, '').trim();
      if (companyNameClean.length > 3) {
        const nameRegex = new RegExp(companyNameClean.split(' ')[0], 'i');
        if (nameRegex.test(email.senderName) || nameRegex.test(email.subject) || nameRegex.test(email.rawBody)) {
          return true;
        }
      }
      
      // 4. Match via deParaClientes mapping
      const mapping = get().deParaClientes.find(d => 
        (d.incomingEmail === email.senderEmail) || 
        (d.incomingCnpj && d.incomingCnpj.replace(/\D/g, '') === targetCompanyCnpj)
      );
      if (mapping) {
        const cust = get().erpCustomers.find(c => c.id === mapping.erpCustomerCode);
        if (cust && cust.cnpj.replace(/\D/g, '') === targetCompanyCnpj) {
          return true;
        }
      }
      
      return false;
    });
  },

  login: (email, role, companyId) => {
    const name = email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());
    const user: CurrentUser = {
      id: `u-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      email,
      role,
      companyId
    };
    set({ currentUser: user });
    saveLocalData('current_user', user);

    setTimeout(() => {
      get().addAuditLog('Login', 'Sistema', `${name} realizou login com sucesso no perfil ${role}.`);
    }, 100);
  },

  logout: () => {
    const user = get().currentUser;
    if (user) {
      get().addAuditLog('Logout', 'Sistema', `${user.name} realizou logout da conta.`);
    }
    set({ currentUser: null });
    saveLocalData('current_user', null);
  },

  addCompany: async (company) => {
    const newCompany: Company = {
      ...company,
      id: `comp-${Math.floor(100 + Math.random() * 900)}`,
      processedOrdersCount: 0,
      avgTokenUsage: Math.floor(40000 + Math.random() * 30000)
    };

    set((state) => {
      const next = [...state.companies, newCompany];
      saveLocalData('companies', next);
      return { companies: next };
    });

    if (newCompany.setupFee > 0) {
      const newInvoice: Invoice = {
        id: `inv-${Math.floor(100 + Math.random() * 900)}`,
        companyId: newCompany.id,
        companyName: newCompany.name,
        period: 'Taxa Setup Inicial',
        subscriptionAmount: 0.00,
        overageAmount: 0.00,
        setupAmount: newCompany.setupFee,
        totalAmount: newCompany.setupFee,
        status: 'Pendente',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
      };
      set((state) => {
        const nextInvoices = [...state.invoices, newInvoice];
        saveLocalData('invoices', nextInvoices);
        return { invoices: nextInvoices };
      });
    }

    setTimeout(() => {
      get().addAuditLog(
        'Cliente Criado',
        'Cliente',
        `Cliente ${newCompany.name} (CNPJ: ${newCompany.cnpj}) cadastrado com sucesso no plano ${newCompany.planName}.`
      );
    }, 100);
  },

  updateCompany: async (id, updates) => {
    const oldComp = get().companies.find(c => c.id === id);
    set((state) => {
      const next = state.companies.map((c) => c.id === id ? { ...c, ...updates } : c);
      saveLocalData('companies', next);
      return { companies: next };
    });

    if (oldComp) {
      const changedFields = Object.keys(updates).join(', ');
      setTimeout(() => {
        get().addAuditLog(
          'Cliente Atualizado',
          'Cliente',
          `Configurações da empresa ${oldComp.name} atualizadas. Campos modificados: ${changedFields}.`
        );
      }, 100);
    }
  },

  payInvoice: async (id) => {
    let companyName = '';
    let totalAmount = 0;
    set((state) => {
      const next = state.invoices.map((inv) => {
        if (inv.id === id) {
          companyName = inv.companyName;
          totalAmount = inv.totalAmount;
          const company = state.companies.find(c => c.id === inv.companyId);
          if (company && company.setupPaidInstallments < company.setupTotalInstallments) {
            setTimeout(() => {
              get().updateCompany(company.id, {
                setupPaidInstallments: company.setupPaidInstallments + 1
              });
            }, 100);
          }
          return { ...inv, status: 'Pago' as const };
        }
        return inv;
      });
      saveLocalData('invoices', next);
      return { invoices: next };
    });

    if (companyName) {
      setTimeout(() => {
        get().addAuditLog(
          'Pagamento Recebido',
          'Financeiro',
          `Fatura ID ${id} da empresa ${companyName} marcada como paga. Valor total: R$ ${totalAmount.toFixed(2)}.`
        );
      }, 100);
    }
  },



  addAuditLog: (action, category, details) => {
    const user = get().currentUser;
    const newLog: AuditLog = {
      id: `log-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      userId: user?.id || 'system',
      userName: user?.name || 'Sistema Flow AI',
      action,
      category,
      details
    };
    set((state) => {
      const next = [newLog, ...state.auditLogs];
      saveLocalData('audit_logs', next);
      return { auditLogs: next };
    });
  },

  generateClientMonthlyInvoice: (companyId, period) => {
    const comp = get().companies.find(c => c.id === companyId);
    if (!comp) return;

    // Parse year/month from period input (format: "YYYY-MM")
    let startYear = new Date().getFullYear();
    let startMonth = new Date().getMonth();
    if (period.includes('-')) {
      const [y, m] = period.split('-');
      startYear = parseInt(y, 10);
      startMonth = parseInt(m, 10) - 1;
    }

    const startDate = new Date(startYear, startMonth, 1, 0, 0, 0);
    const endDate = new Date(startYear, startMonth + 1, 0, 23, 59, 59);

    // Find emails within this range matching this client
    const targetCnpj = comp.cnpj.replace(/\D/g, '');
    const targetNameClean = comp.name.toLowerCase().replace(/(s\/a|ltda|mep|eireli|s\.a\.)/gi, '').trim();
    
    const compEmails = get().emails.filter(email => {
      if (email.status !== 'Enviado ao ERP') return false;
      
      const parts = email.receivedAt.split(' ');
      const dateParts = parts[0].split('/');
      if (dateParts.length !== 3) return false;
      const d = new Date(parseInt(dateParts[2], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[0], 10));
      if (d < startDate || d > endDate) return false;

      // CNPJ match
      const hasCnpjMatch = Object.values(email.extractedFields).some(val => 
        typeof val === 'string' && val.replace(/\D/g, '') === targetCnpj
      ) || Object.values(email.mappedFields).some(val => 
        typeof val === 'string' && val.replace(/\D/g, '') === targetCnpj
      );
      if (hasCnpjMatch) return true;

      // Name match
      if (targetNameClean.length > 3) {
        const nameRegex = new RegExp(targetNameClean.split(' ')[0], 'i');
        if (nameRegex.test(email.senderName) || nameRegex.test(email.subject) || nameRegex.test(email.rawBody)) {
          return true;
        }
      }

      // mapping match
      const mapping = get().deParaClientes.find(d => 
        (d.incomingEmail === email.senderEmail) || 
        (d.incomingCnpj && d.incomingCnpj.replace(/\D/g, '') === targetCnpj)
      );
      if (mapping) {
        const cust = get().erpCustomers.find(c => c.id === mapping.erpCustomerCode);
        if (cust && cust.cnpj.replace(/\D/g, '') === targetCnpj) {
          return true;
        }
      }
      
      return false;
    });

    const periodProcessedOrdersCount = compEmails.length;
    const exceeded = periodProcessedOrdersCount - comp.orderLimit;
    const overageAmount = exceeded > 0 ? exceeded * comp.overagePrice : 0;
    
    const setupRemaining = comp.setupTotalInstallments - comp.setupPaidInstallments;
    const setupInstallmentAmount = setupRemaining > 0 ? (comp.setupFee / comp.setupTotalInstallments) : 0;
    
    const totalAmount = comp.monthlyFee + overageAmount + setupInstallmentAmount;
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const friendlyPeriod = `${monthNames[startMonth]} ${startYear}`;

    let dueMonth = startMonth + 2;
    let dueYear = startYear;
    if (dueMonth > 12) {
      dueMonth -= 12;
      dueYear += 1;
    }

    const dueDayVal = comp.dueDay || 10;
    const newInvoice: Invoice = {
      id: `inv-${Math.floor(100 + Math.random() * 900)}`,
      companyId: comp.id,
      companyName: comp.name,
      period: friendlyPeriod,
      subscriptionAmount: comp.monthlyFee,
      overageAmount,
      setupAmount: setupInstallmentAmount,
      totalAmount,
      status: 'Pendente',
      dueDate: `${String(dueDayVal).padStart(2, '0')}/${String(dueMonth).padStart(2, '0')}/${dueYear}`
    };

    set((state) => {
      const nextInvoices = [...state.invoices, newInvoice];
      saveLocalData('invoices', nextInvoices);
      return { invoices: nextInvoices };
    });

    get().addAuditLog(
      'Fatura Gerada',
      'Financeiro',
      `Fatura do período ${friendlyPeriod} gerada para ${comp.name}. Processados: ${periodProcessedOrdersCount} pedidos. Valor total: R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
    );
    
    toast.success(`Fatura gerada com sucesso para ${comp.name} (${friendlyPeriod})!`);
  },

  setErpPreset: async (presetName) => {
    const fields = erpPresets[presetName] || [];
    set({ activeErp: presetName, erpFields: fields });
    saveLocalData('active_erp', presetName);
    saveLocalData('erp_fields', fields);

    if (isSupabaseConfigured && supabase) {
      try {
        // Clear all fields and push new presets
        await supabase.from('erp_layout_fields').delete().neq('id', '0');
        await supabase.from('erp_layout_fields').insert(
          fields.map(f => ({
            id: f.id,
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            ai_instruction: f.aiInstruction,
            default_value: f.defaultValue || null,
            validation_rule: f.validationRule || null
          }))
        );
      } catch (e) {
        console.error(e);
      }
    }
  },

  addErpField: async (field) => {
    set((state) => {
      const next = [...state.erpFields, field];
      saveLocalData('erp_fields', next);
      return { erpFields: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('erp_layout_fields').insert({
        id: field.id,
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        ai_instruction: field.aiInstruction,
        default_value: field.defaultValue || null,
        validation_rule: field.validationRule || null
      });
    }
  },

  updateErpField: async (id, updatedField) => {
    set((state) => {
      const next = state.erpFields.map((f) => f.id === id ? { ...f, ...updatedField } : f);
      saveLocalData('erp_fields', next);
      return { erpFields: next };
    });

    if (isSupabaseConfigured && supabase) {
      const dbField: any = {};
      if (updatedField.label !== undefined) dbField.label = updatedField.label;
      if (updatedField.name !== undefined) dbField.name = updatedField.name;
      if (updatedField.type !== undefined) dbField.type = updatedField.type;
      if (updatedField.required !== undefined) dbField.required = updatedField.required;
      if (updatedField.aiInstruction !== undefined) dbField.ai_instruction = updatedField.aiInstruction;
      if (updatedField.defaultValue !== undefined) dbField.default_value = updatedField.defaultValue || null;
      if (updatedField.validationRule !== undefined) dbField.validation_rule = updatedField.validationRule || null;

      await supabase.from('erp_layout_fields').update(dbField).eq('id', id);
    }
  },

  deleteErpField: async (id) => {
    set((state) => {
      const next = state.erpFields.filter((f) => f.id !== id);
      saveLocalData('erp_fields', next);
      return { erpFields: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('erp_layout_fields').delete().eq('id', id);
    }
  },

  reorderErpFields: async (fields) => {
    set({ erpFields: fields });
    saveLocalData('erp_fields', fields);
    
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('erp_layout_fields').delete().neq('id', '0');
        await supabase.from('erp_layout_fields').insert(
          fields.map(f => ({
            id: f.id,
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            ai_instruction: f.aiInstruction,
            default_value: f.defaultValue || null,
            validation_rule: f.validationRule || null
          }))
        );
      } catch (e) {
        console.error(e);
      }
    }
  },

  addCatalogProduct: async (product) => {
    set((state) => {
      const next = [...state.catalog, product];
      saveLocalData('catalog', next);
      return { catalog: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('catalog_products').insert({
        code: product.code,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        unit: product.unit
      });
    }
  },

  updateCatalogProduct: async (code, updatedProduct) => {
    set((state) => {
      const next = state.catalog.map((p) => p.code === code ? { ...p, ...updatedProduct } : p);
      saveLocalData('catalog', next);
      return { catalog: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('catalog_products').update({
        name: updatedProduct.name,
        description: updatedProduct.description,
        category: updatedProduct.category,
        price: updatedProduct.price,
        unit: updatedProduct.unit
      }).eq('code', code);
    }
  },

  deleteCatalogProduct: async (code) => {
    set((state) => {
      const next = state.catalog.filter((p) => p.code !== code);
      saveLocalData('catalog', next);
      return { catalog: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('catalog_products').delete().eq('code', code);
    }
  },

  importCatalog: async (products) => {
    set((state) => {
      const existingCodes = new Set(state.catalog.map((p) => p.code));
      const newProducts = products.filter((p) => !existingCodes.has(p.code));
      const next = [...state.catalog, ...newProducts];
      saveLocalData('catalog', next);
      return { catalog: next };
    });

    if (isSupabaseConfigured && supabase) {
      const existingCodes = new Set(get().catalog.map((p) => p.code));
      const dbInserts = products.filter(p => !existingCodes.has(p.code)).map(p => ({
        code: p.code,
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        unit: p.unit
      }));
      if (dbInserts.length > 0) {
        await supabase.from('catalog_products').insert(dbInserts);
      }
    }
  },

  addDeParaMapping: async (mapping) => {
    set((state) => {
      const next = [...state.dePara, mapping];
      saveLocalData('depara', next);
      return { dePara: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('depara_mappings').insert({
        id: mapping.id,
        incoming_term: mapping.incomingTerm,
        catalog_code: mapping.catalogCode,
        confidence: mapping.confidence,
        status: mapping.status
      });
    }
  },

  updateDeParaMapping: async (id, updatedMapping) => {
    set((state) => {
      const next = state.dePara.map((m) => m.id === id ? { ...m, ...updatedMapping } : m);
      saveLocalData('depara', next);
      return { dePara: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('depara_mappings').update({
        incoming_term: updatedMapping.incomingTerm,
        catalog_code: updatedMapping.catalogCode,
        confidence: updatedMapping.confidence,
        status: updatedMapping.status
      }).eq('id', id);
    }
  },

  deleteDeParaMapping: async (id) => {
    set((state) => {
      const next = state.dePara.filter((m) => m.id !== id);
      saveLocalData('depara', next);
      return { dePara: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('depara_mappings').delete().eq('id', id);
    }
  },

  addDeParaCliente: async (mapping) => {
    set((state) => {
      const next = [...state.deParaClientes, mapping];
      saveLocalData('depara_clientes', next);
      return { deParaClientes: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('depara_clientes').insert({
        id: mapping.id,
        incoming_cnpj: mapping.incomingCnpj || null,
        incoming_email: mapping.incomingEmail || null,
        incoming_name: mapping.incomingName,
        erp_customer_code: mapping.erpCustomerCode,
        status: mapping.status
      });
    }
  },

  deleteDeParaCliente: async (id) => {
    set((state) => {
      const next = state.deParaClientes.filter(d => d.id !== id);
      saveLocalData('depara_clientes', next);
      return { deParaClientes: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('depara_clientes').delete().eq('id', id);
    }
  },

  linkCustomerToErp: async (emailId, erpCustomerCode, type = 'cnpj') => {
    const email = get().emails.find(e => e.id === emailId);
    if (!email) return;

    const erpCust = get().erpCustomers.find(c => c.id === erpCustomerCode);
    if (!erpCust) return;

    const cleanCnpj = email.extractedFields.cliente_cnpj || Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
    const newMapping: DeParaCliente = {
      id: `c-map-${Math.floor(1000 + Math.random() * 9000)}`,
      incomingName: email.senderName.toUpperCase(),
      erpCustomerCode: erpCustomerCode,
      status: 'Confirmado'
    };

    if (type === 'email') {
      newMapping.incomingEmail = email.senderEmail;
      newMapping.incomingCnpj = erpCust.cnpj; // Optional CNPJ bind
    } else {
      newMapping.incomingCnpj = cleanCnpj;
      newMapping.incomingEmail = email.senderEmail;
    }

    // Save mapping in store
    await get().addDeParaCliente(newMapping);

    // Update email status and remove CNPJ missing error
    set((state) => {
      const next = state.emails.map(e => {
        if (e.id === emailId) {
          const nextExt = { ...e.extractedFields, cliente_cnpj: erpCust.cnpj, cliente_razao: erpCust.razaoSocial };
          return {
            ...e,
            status: 'Aguardando' as const,
            errorMessage: undefined,
            extractedFields: nextExt,
            mappedFields: nextExt
          };
        }
        return e;
      });
      saveLocalData('emails', next);
      return { emails: next };
    });

    if (isSupabaseConfigured && supabase) {
      const updatedEmail = get().emails.find(e => e.id === emailId);
      if (updatedEmail) {
        await supabase.from('emails_orders').update({
          status: 'Aguardando',
          error_message: null,
          extracted_fields: updatedEmail.extractedFields,
          mapped_fields: updatedEmail.mappedFields
        }).eq('id', emailId);
      }
    }
    toast.success('Cliente vinculado e pedido destravado!');
  },

  createCustomerInErp: async (emailId, cnpj, razaoSocial, type = 'cnpj') => {
    const email = get().emails.find(e => e.id === emailId);
    if (!email) return;

    const newCustId = `CLI-00${get().erpCustomers.length + 1}`;
    const cleanCnpj = cnpj.replace(/\D/g, '') || Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
    const cleanRazao = razaoSocial || email.extractedFields.cliente_razao || email.senderName;

    // Create client in ERP list
    const newCustomer: ErpCustomer = {
      id: newCustId,
      cnpj: cleanCnpj,
      razaoSocial: cleanRazao
    };

    // Save Customer
    set((state) => {
      const next = [...state.erpCustomers, newCustomer];
      saveLocalData('erp_customers', next);
      return { erpCustomers: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('erp_customers').insert({
        id: newCustomer.id,
        cnpj: newCustomer.cnpj,
        razao_social: newCustomer.razaoSocial
      });
    }

    // Link customer
    await get().linkCustomerToErp(emailId, newCustId, type);
    toast.success(`Cliente "${cleanRazao}" pré-cadastrado no ERP!`);
  },

  sendEmailReply: async (emailId, body) => {
    const email = get().emails.find(e => e.id === emailId);
    if (!email) return;

    const replyId = `rep-${Math.floor(1000 + Math.random() * 9000)}`;
    const todayStr = new Date().toLocaleString('pt-BR');

    const newReply = {
      id: replyId,
      body,
      sentAt: todayStr
    };

    const newChatMessage = {
      id: `msg-rep-${Math.floor(1000 + Math.random() * 9000)}`,
      sender: 'operator' as const,
      text: body,
      timestamp: todayStr
    };

    set((state) => {
      const next = state.emails.map(e => {
        if (e.id === emailId) {
          const replies = e.replies ? [...e.replies, newReply] : [newReply];
          const chatMessages = e.chatMessages ? [...e.chatMessages, newChatMessage] : [newChatMessage];
          return { ...e, replies, chatMessages };
        }
        return e;
      });
      saveLocalData('emails', next);
      return { emails: next };
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const updatedEmail = get().emails.find(e => e.id === emailId);
        if (updatedEmail) {
          await supabase.from('emails_orders').update({
            replies: updatedEmail.replies
          }).eq('id', emailId);
        }
      } catch (err) {
        console.error('Error saving reply to Supabase', err);
      }
    }
    toast.success('Mensagem enviada com sucesso!');
  },

  syncDeParaSuggestions: async () => {
    // Run an alignment algorithm over all emails.
    const updatedEmails = get().emails.map((email) => {
      let isChanged = false;
      const newItems: OrderItemMapped[] = [];
      let totalScore = 0;
      let matchedItemsCount = 0;

      const newRawItems = email.rawItems.map((raw) => {
        const emailCnpj = email.extractedFields.cliente_cnpj || email.extractedFields.C7_CLIENTE || email.extractedFields.cnpj_cliente || '';
        const targetCnpj = emailCnpj.replace(/\D/g, '');
        const clientMappings = get().dePara.filter(
          (m) => m.incomingTerm.toLowerCase() === raw.rawDescription.toLowerCase() && m.isActive !== false
        );
        const mapping = clientMappings.find(m => m.clientCnpj && m.clientCnpj.replace(/\D/g, '') === targetCnpj) || clientMappings.find(m => !m.clientCnpj);
        
        let product: CatalogProduct | undefined;
        let score = 0;

        if (mapping) {
          product = get().catalog.find((p) => p.code === mapping.catalogCode);
          score = mapping.confidence;
        } else {
          product = get().catalog.find(
            (p) => 
              p.name.toLowerCase().includes(raw.rawDescription.toLowerCase()) ||
              raw.rawDescription.toLowerCase().includes(p.name.toLowerCase())
          );
          score = product ? 75 : 0;
        }

        if (product) {
          matchedItemsCount++;
          totalScore += score;
          newItems.push({
            catalogCode: product.code,
            catalogName: product.name,
            quantity: raw.quantity,
            unitPrice: product.price,
            totalPrice: product.price * raw.quantity,
            unit: product.unit
          });
          isChanged = true;
          return { ...raw, rawCode: product.code };
        }

        newItems.push({
          catalogCode: 'PENDENTE',
          catalogName: `Aguardando mapeamento: "${raw.rawDescription}"`,
          quantity: raw.quantity,
          unitPrice: raw.unitPrice,
          totalPrice: raw.unitPrice * raw.quantity,
          unit: 'UN'
        });
        return raw;
      });

      if (isChanged && newItems.length > 0) {
        const finalConfidence = Math.round(matchedItemsCount > 0 ? totalScore / matchedItemsCount : 50);
        let newStatus = email.status;
        let errMsg = email.errorMessage;

        // Check customer mapping resolution too
        const cnpjVal = email.extractedFields.cliente_cnpj;
        const custMapping = get().deParaClientes.find(c => 
          (c.incomingCnpj && c.incomingCnpj === cnpjVal) || 
          (c.incomingEmail && c.incomingEmail === email.senderEmail)
        );

        let finalExtractedFields = { ...email.extractedFields };
        if (custMapping) {
          const erpCust = get().erpCustomers.find(c => c.id === custMapping.erpCustomerCode);
          if (erpCust) {
            if (!finalExtractedFields.cliente_cnpj || finalExtractedFields.cliente_cnpj === '') {
              finalExtractedFields.cliente_cnpj = erpCust.cnpj;
            }
            if (!finalExtractedFields.cliente_razao || finalExtractedFields.cliente_razao === '') {
              finalExtractedFields.cliente_razao = erpCust.razaoSocial;
            }
          }
        }

        if (email.status === 'Revisão Manual' && matchedItemsCount === email.rawItems.length && custMapping) {
          newStatus = 'Aguardando';
          errMsg = undefined;
        }

        const calculatedValTotal = newItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

        return {
          ...email,
          rawItems: newRawItems,
          items: newItems,
          status: newStatus,
          errorMessage: errMsg,
          confidenceScore: finalConfidence,
          extractedFields: {
            ...finalExtractedFields,
            valor_total: calculatedValTotal.toFixed(2)
          },
          mappedFields: {
            ...finalExtractedFields,
            valor_total: calculatedValTotal.toFixed(2)
          }
        };
      }

      return email;
    });

    set({ emails: updatedEmails });
    saveLocalData('emails', updatedEmails);

    if (isSupabaseConfigured && supabase) {
      try {
        for (const e of updatedEmails) {
          await supabase.from('emails_orders').update({
            status: e.status,
            error_message: e.errorMessage || null,
            items: e.items,
            raw_items: e.rawItems,
            extracted_fields: e.extractedFields,
            mapped_fields: e.mappedFields,
            confidence_score: e.confidenceScore
          }).eq('id', e.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
  },

  updateEmailStatus: async (emailId, status, error) => {
    set((state) => {
      const next = state.emails.map((e) => e.id === emailId ? { ...e, status, errorMessage: error } : e);
      saveLocalData('emails', next);
      return { emails: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('emails_orders').update({
        status,
        error_message: error || null
      }).eq('id', emailId);
    }
  },

  sendEmailToErp: async (emailId) => {
    const email = get().emails.find((e) => e.id === emailId);
    if (!email) return false;

    const activeConnection = get().erpConnections.find(
      (c) => c.id.toLowerCase() === get().activeErp.toLowerCase()
    );
    
    const requiredFields = get().erpFields.filter((f) => f.required);
    const missingFields = requiredFields.filter((f) => !email.extractedFields[f.name]);
    
    // API connection simulation latency
    await get().updateEmailStatus(emailId, 'Processando');
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (missingFields.length > 0) {
      const errList = missingFields.map((f) => `"${f.label}"`).join(', ');
      const errMsg = `Erro de Validação: Os campos obrigatórios ${errList} estão ausentes. Preencha-os na revisão manual.`;
      await get().updateEmailStatus(emailId, 'Erro', errMsg);
      return false;
    }

    // Check for pending De-Para items
    const hasPendingItems = email.items.some((it) => it.catalogCode === 'PENDENTE');
    if (hasPendingItems) {
      const errMsg = `Erro de De-Para: O pedido contém itens com código de catálogo pendente de mapeamento. Vincule todos os produtos ao catálogo na aba "Produtos" antes de enviar para o ERP.`;
      await get().updateEmailStatus(emailId, 'Revisão Manual', errMsg);
      return false;
    }

    // Double check: CNPJ Customer pre-registration lookup
    const extractedCnpj = email.extractedFields.cliente_cnpj || '';
    const hasClientMapping = get().deParaClientes.some(c => 
      (c.incomingCnpj && c.incomingCnpj === extractedCnpj) ||
      (c.incomingEmail && c.incomingEmail === email.senderEmail)
    );
    const isCustomerRegistered = get().erpCustomers.some(c => c.cnpj === extractedCnpj);

    if (!hasClientMapping && !isCustomerRegistered) {
      const cnpjFormatado = formatCNPJ(extractedCnpj) || 'vazio';
      const errMsg = `Erro de Pré-cadastro: O CNPJ do cliente (${cnpjFormatado}) ou e-mail de origem não está pré-cadastrado no ERP. Vincule ou crie o pré-cadastro nas opções da aba lateral antes de enviar.`;
      await get().updateEmailStatus(emailId, 'Revisão Manual', errMsg);
      return false;
    }

    if (!activeConnection || !activeConnection.connected) {
      const errMsg = `Conexão falhou: O ERP ${get().activeErp} não está devidamente autenticado nas configurações de conexões.`;
      await get().updateEmailStatus(emailId, 'Erro', errMsg);
      return false;
    }

    // Success
    const mockPayload: Record<string, any> = {
      erp_target: get().activeErp,
      header: {
        timestamp: new Date().toISOString(),
        auth_token: activeConnection.apiKey ? "Bearer ***" : "None"
      },
      order_details: {
        code: email.extractedFields.codigo_pedido || `SIM-${Math.floor(1000 + Math.random() * 9000)}`,
        cnpj: email.extractedFields.cliente_cnpj || '',
        razao_social: email.extractedFields.cliente_razao || '',
        condicao_pagamento: email.extractedFields.condicao_pagamento || 'Boleto',
        valor_total: parseFloat(email.extractedFields.valor_total || '0')
      },
      items: email.items.map(it => ({
        sku: it.catalogCode,
        name: it.catalogName,
        qty: it.quantity,
        price: it.unitPrice,
        total: it.totalPrice
      }))
    };

    const mockResponse: Record<string, any> = {
      status: 201,
      status_text: "Created",
      erp_internal_id: `ERP-ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      success: true,
      message: `Pedido sincronizado com sucesso no ${get().activeErp}`
    };

    const payloadStr = JSON.stringify(mockPayload, null, 2);
    const responseStr = JSON.stringify(mockResponse, null, 2);

    set((state) => {
      const next = state.emails.map((e) => e.id === emailId ? { 
        ...e, 
        status: 'Enviado ao ERP' as const, 
        errorMessage: undefined,
        erpPayloadSent: payloadStr,
        erpResponseLog: responseStr
      } : e);
      saveLocalData('emails', next);
      return { emails: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('emails_orders').update({
        status: 'Enviado ao ERP',
        error_message: null,
        erp_payload_sent: payloadStr,
        erp_response_log: responseStr
      }).eq('id', emailId);
    }

    // Update usage counters
    const nextSettings = { ...get().settings, usageCount: get().settings.usageCount + 1 };
    set({ settings: nextSettings });
    saveLocalData('settings', nextSettings);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('settings').update({ usage_count: nextSettings.usageCount }).eq('id', 'global_settings');
    }
    return true;
  },

  sendBulkToErp: async (emailIds) => {
    let success = 0;
    let failed = 0;
    
    for (const id of emailIds) {
      const res = await get().sendEmailToErp(id);
      if (res) success++;
      else failed++;
    }

    return { success, failed };
  },

  receiveSimulatedEmail: async (customEmail) => {
    const idx = Math.floor(Math.random() * companyNames.length);
    const company = companyNames[idx];
    const email = senderEmails[idx];
    const buyer = buyerNames[idx];
    
    const itemsIdx = Math.floor(Math.random() * rawItemsPool.length);
    const rawItems = rawItemsPool[itemsIdx];
    
    const calculatedValTotal = rawItems.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);
    const emailId = `email-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomHour = Math.floor(8 + Math.random() * 10);
    const randomMin = Math.floor(10 + Math.random() * 49);
    
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${randomHour}:${randomMin}`;

    // Select a CNPJ: 70% chance to pick an already-mapped CNPJ (Success path), 30% chance for a completely unknown CNPJ (Manual Review path)
    let selectedCnpj = '';
    const shouldBeRegistered = Math.random() > 0.3;
    if (shouldBeRegistered && get().erpCustomers.length > 0) {
      const randomCust = get().erpCustomers[Math.floor(Math.random() * get().erpCustomers.length)];
      selectedCnpj = randomCust.cnpj;
    } else {
      selectedCnpj = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
    }

    // Decide if this email is a non-order (25% chance or forced)
    const isNonOrder = customEmail?.status === 'E-mail Geral' || Math.random() < 0.25;
    
    let senderName = buyer;
    let senderEmail = email;
    let subject = `NOVO PEDIDO DE COMPRA - ${company.toUpperCase()}`;
    let rawBody = `Prezada Softeum,\n\nSolicitamos o faturamento dos seguintes itens conforme nossa cotação comercial:\n\n${rawItems.map((it) => `- ${it.quantity} un de ${it.rawDescription}`).join('\n')}\n\nEntregar no endereço cadastrado.\nFaturamento por boleto faturado.\n\nAbraços,\n${buyer}\nSuprimentos - ${company}`;
    let attachmentName: string | undefined = `pedido_compra_${emailId.replace('email-', '')}.pdf`;
    
    if (isNonOrder) {
      const nonOrderIdx = Math.floor(Math.random() * 4);
      const nonOrderSenders = [
        { name: 'Marketing Digital', email: 'contato@marketingdigital.com', subject: 'Novidade incrível para sua empresa!', body: 'Olá, gostaria de apresentar nossa solução de marketing digital para aumentar suas vendas. Temos planos a partir de R$ 99/mês. Responda este e-mail para agendarmos uma demonstração!' },
        { name: 'Cobranças Provedor', email: 'financeiro@cobrancaprovedor.com.br', subject: 'Boleto mensal vencido - Softeum', body: 'Prezado cliente, identificamos que o boleto de serviços referente ao mês passado encontra-se em aberto. Favor efetuar o pagamento através da linha digitável em anexo.' },
        { name: 'Carlos Santos', email: 'carlos.santos@gmail.com', subject: 'Dúvida sobre prazo de entrega', body: 'Olá pessoal, sabem me dizer qual é o prazo médio de entrega para a região de Pinheiros? Obrigado.' },
        { name: 'Parcerias B2B', email: 'comercial@parceriasb2b.com.br', subject: 'Proposta de parceria Softeum Flow', body: 'Prezado diretor, gostaríamos de agendar uma reunião de 15 minutos para apresentar nossa proposta de integração logística internacional.' }
      ];
      const selectedNonOrder = nonOrderSenders[nonOrderIdx];
      senderName = selectedNonOrder.name;
      senderEmail = selectedNonOrder.email;
      subject = selectedNonOrder.subject;
      rawBody = selectedNonOrder.body;
      attachmentName = undefined; // No PDF attachment for spam/queries
    }

    const currentSettings = get().settings;
    const targetCnpjClean = selectedCnpj.replace(/\D/g, '');
    const matchedCompany = get().companies.find(c => c.cnpj.replace(/\D/g, '') === targetCnpjClean);
    
    const isFiltered = false;
    const filterReason = '';

    if (isFiltered || isNonOrder) {
      const generatedChat = [
        { id: `msg-${Date.now()}-1`, sender: 'buyer' as const, text: rawBody, timestamp: formattedDate },
        { id: `msg-${Date.now()}-2`, sender: 'agent' as const, text: isFiltered ? `[Mensagem filtrada automaticamente pelo sistema: ${filterReason}]` : 'Olá! Como posso ajudar você hoje?', timestamp: formattedDate }
      ];
      // Create a general email entry (no AI process runs)
      const generalEmail: EmailOrderData = {
        id: emailId,
        senderName,
        senderEmail,
        subject,
        receivedAt: formattedDate,
        status: 'E-mail Geral',
        rawBody,
        extractedFields: {},
        mappedFields: {},
        rawItems: [],
        items: [],
        erpTarget: get().activeErp,
        confidenceScore: 0, // 0 confidence since IA didn't run
        errorMessage: isFiltered ? `Isento de IA: ${filterReason}` : undefined,
        attachmentName,
        isOpened: false,
        chatMessages: generatedChat
      };

      const nextFilteredCount = (currentSettings.filteredEmailsCount || 0) + (isFiltered ? 1 : 0);
      const nextSavedCost = parseFloat(((currentSettings.savedAiCost || 0) + (isFiltered ? 0.05 : 0)).toFixed(2));
      
      const updatedSettings = {
        ...currentSettings,
        filteredEmailsCount: nextFilteredCount,
        savedAiCost: nextSavedCost
      };

      set((state) => {
        const next = [generalEmail, ...state.emails];
        saveLocalData('emails', next);
        saveLocalData('settings', updatedSettings);
        return { emails: next, settings: updatedSettings };
      });

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('emails_orders').insert({
            id: generalEmail.id,
            sender_name: generalEmail.senderName,
            sender_email: generalEmail.senderEmail,
            subject: generalEmail.subject,
            received_at: generalEmail.receivedAt,
            status: generalEmail.status,
            raw_body: generalEmail.rawBody,
            extracted_fields: generalEmail.extractedFields,
            mapped_fields: generalEmail.mappedFields,
            items: generalEmail.items,
            raw_items: generalEmail.rawItems,
            erp_target: generalEmail.erpTarget,
            error_message: generalEmail.errorMessage || null,
            confidence_score: generalEmail.confidenceScore,
            attachment_name: generalEmail.attachmentName
          });
          if (isFiltered) {
            await supabase.from('settings').update({
              filtered_emails_count: nextFilteredCount,
              saved_ai_cost: nextSavedCost
            }).eq('id', 'global_settings');
          }
        } catch (e) {
          console.error(e);
        }
      }

      toast.info(`Inbox Recebeu: Nova mensagem de "${senderName}".`, {
        description: isFiltered ? filterReason : 'Mensagem geral recebida e classificada.',
        duration: 4000
      });
      return;
    }

    const ext = generateExtractedFields(get().activeErp, company, senderEmail, calculatedValTotal, selectedCnpj);

    const resolvedItems: OrderItemMapped[] = rawItems.map((raw) => {
      const clientCnpjClean = selectedCnpj.replace(/\D/g, '');
      const clientMappings = get().dePara.filter(
        (m) => m.incomingTerm.toLowerCase() === raw.rawDescription.toLowerCase() && m.isActive !== false
      );
      const mapping = clientMappings.find(m => m.clientCnpj && m.clientCnpj.replace(/\D/g, '') === clientCnpjClean) || clientMappings.find(m => !m.clientCnpj);
      const product = mapping 
        ? get().catalog.find((p) => p.code === mapping.catalogCode) 
        : get().catalog.find((p) => p.name.toLowerCase().includes(raw.rawDescription.toLowerCase()));
      
      if (product) {
        return {
          catalogCode: product.code,
          catalogName: product.name,
          quantity: raw.quantity,
          unitPrice: product.price,
          totalPrice: product.price * raw.quantity,
          unit: product.unit
        };
      }
      return {
        catalogCode: 'PENDENTE',
        catalogName: `Aguardando mapeamento: "${raw.rawDescription}"`,
        quantity: raw.quantity,
        unitPrice: raw.unitPrice,
        totalPrice: raw.unitPrice * raw.quantity,
        unit: 'UN'
      };
    });

    const isMissingRequired = get().erpFields
      .filter((f) => f.required)
      .some((f) => !ext[f.name]);
    
    const hasPendingItems = resolvedItems.some((it) => it.catalogCode === 'PENDENTE');

    // Customer Mapping verification
    const hasClientMapping = get().deParaClientes.some(c => 
      (c.incomingCnpj && c.incomingCnpj === selectedCnpj) ||
      (c.incomingEmail && c.incomingEmail === senderEmail)
    );
    const isCustomerRegistered = get().erpCustomers.some(c => c.cnpj === selectedCnpj);
    const isClientMissing = !hasClientMapping && !isCustomerRegistered;

    // Auto-fill CNPJ/Name from mapped client if matched by email
    const matchedMapping = get().deParaClientes.find(c => c.incomingEmail === senderEmail);
    if (matchedMapping) {
      const erpCust = get().erpCustomers.find(c => c.id === matchedMapping.erpCustomerCode);
      if (erpCust) {
        if (ext.cliente_cnpj !== undefined) ext.cliente_cnpj = erpCust.cnpj;
        if (ext.cliente_razao !== undefined) ext.cliente_razao = erpCust.razaoSocial;
        if (ext.cgcCli !== undefined) ext.cgcCli = erpCust.cnpj;
        if (ext.C7_CLIENTE !== undefined) ext.C7_CLIENTE = erpCust.cnpj;
        if (ext.cnpj_cliente !== undefined) ext.cnpj_cliente = erpCust.cnpj;
        if (ext.SAP_TaxID !== undefined) ext.SAP_TaxID = erpCust.cnpj;
      }
    }

    const confidenceScore = isClientMissing || isMissingRequired ? 58 : Math.floor(82 + Math.random() * 16);

    let status: EmailStatus = 'Aguardando';
    let errorMessage: string | undefined;

    const threshold = get().settings.confidenceThreshold;

    if (isClientMissing) {
      status = 'Revisão Manual';
      const cnpjFormatado = formatCNPJ(selectedCnpj);
      errorMessage = `Erro de Pré-cadastro: O CNPJ do cliente (${cnpjFormatado}) ou e-mail de origem (${senderEmail}) não está pré-cadastrado no ERP. Vincule ou crie o pré-cadastro.`;
    } else if (isMissingRequired) {
      status = 'Revisão Manual';
      errorMessage = 'A extração de IA falhou em coletar campos obrigatórios.';
    } else if (hasPendingItems) {
      status = 'Revisão Manual';
      errorMessage = 'Há itens de pedido sem mapeamento correspondente no catálogo.';
    } else if (confidenceScore < threshold) {
      status = 'Revisão Manual';
      errorMessage = `Acurácia Baixa: A confiança da IA na extração (${confidenceScore}%) foi inferior ao limite configurado (${threshold}%).`;
    }

    // Generate Chat Messages history based on status
    const chatMessages: ChatMessage[] = [
      { 
        id: `msg-${Date.now()}-1`, 
        sender: 'buyer' as const, 
        text: `Olá! Quero fazer o seguinte pedido de compra para faturamento:\n\n${rawItems.map(it => `- ${it.quantity} un de ${it.rawDescription}`).join('\n')}\n\nCNPJ para faturamento: ${formatCNPJ(selectedCnpj)}`, 
        timestamp: formattedDate 
      }
    ];

    if (isClientMissing) {
      chatMessages.push({
        id: `msg-${Date.now()}-2`,
        sender: 'agent' as const,
        text: `Olá, ${senderName}! Identifiquei os itens, porém o CNPJ ${formatCNPJ(selectedCnpj)} não foi localizado no nosso cadastro de clientes do ERP.\n\nPara que eu possa faturar o seu pedido, estou transferindo nossa conversa para que um operador humano faça o seu vínculo manual ou pré-cadastro. Por favor, aguarde.`,
        timestamp: formattedDate
      });
    } else if (hasPendingItems) {
      chatMessages.push({
        id: `msg-${Date.now()}-2`,
        sender: 'agent' as const,
        text: `Olá, ${senderName}! Localizei o cadastro de ${company}. No entanto, alguns produtos solicitados não foram encontrados no nosso catálogo. Estou chamando o time de suporte para fazer o mapeamento De-Para manual. Um momento.`,
        timestamp: formattedDate
      });
    } else {
      chatMessages.push({
        id: `msg-${Date.now()}-2`,
        sender: 'agent' as const,
        text: `Olá, ${senderName}! Localizei o cadastro de ${company}. Confirmei que os itens batem com nosso catálogo:\n${resolvedItems.map(it => `- ${it.quantity}x ${it.catalogName} (R$ ${it.unitPrice.toFixed(2)})`).join('\n')}\n\nValor total: R$ ${calculatedValTotal.toFixed(2)}. Tudo certo para faturamento?`,
        timestamp: formattedDate
      });
      chatMessages.push({
        id: `msg-${Date.now()}-3`,
        sender: 'buyer' as const,
        text: `Sim, tudo correto! Pode faturar.`,
        timestamp: formattedDate
      });
      chatMessages.push({
        id: `msg-${Date.now()}-4`,
        sender: 'agent' as const,
        text: `Excelente! Enviei o pedido para faturamento.`,
        timestamp: formattedDate
      });
    }

    const defaultEmail: EmailOrderData = {
      id: emailId,
      senderName,
      senderEmail,
      subject,
      receivedAt: formattedDate,
      status,
      rawBody,
      extractedFields: ext,
      mappedFields: ext,
      rawItems,
      items: resolvedItems,
      erpTarget: get().activeErp,
      confidenceScore,
      errorMessage,
      attachmentName,
      isOpened: false,
      chatMessages
    };

    const finalEmail = { ...defaultEmail, ...customEmail };

    set((state) => {
      const next = [finalEmail, ...state.emails];
      saveLocalData('emails', next);
      return { emails: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('emails_orders').insert({
        id: finalEmail.id,
        sender_name: finalEmail.senderName,
        sender_email: finalEmail.senderEmail,
        subject: finalEmail.subject,
        received_at: finalEmail.receivedAt,
        status: finalEmail.status,
        raw_body: finalEmail.rawBody,
        extracted_fields: finalEmail.extractedFields,
        mapped_fields: finalEmail.mappedFields,
        items: finalEmail.items,
        raw_items: finalEmail.rawItems,
        erp_target: finalEmail.erpTarget,
        error_message: finalEmail.errorMessage || null,
        confidence_score: finalEmail.confidenceScore,
        attachment_name: finalEmail.attachmentName
      });
    }

    // Auto-send to ERP check
    const activeSettings = get().settings;
    const isAutoSend = matchedCompany && matchedCompany.autoSendToErp !== undefined
      ? matchedCompany.autoSendToErp
      : activeSettings.autoSendToErp;
      
    if (isAutoSend && finalEmail.status === 'Aguardando') {
      setTimeout(() => {
        get().sendEmailToErp(finalEmail.id);
        toast.info(`Envio Automático: Pedido ${finalEmail.extractedFields.codigo_pedido || finalEmail.id} enviado ao ERP automaticamente.`);
      }, 800);
    }
  },

  triggerBatchSimulation: async (count) => {
    const newEmails: EmailOrderData[] = [];
    
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * companyNames.length);
      const company = companyNames[idx];
      const email = senderEmails[idx];
      const buyer = buyerNames[idx];
      
      const itemsIdx = Math.floor(Math.random() * rawItemsPool.length);
      const rawItems = rawItemsPool[itemsIdx];
      
      const calculatedValTotal = rawItems.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);
      const emailId = `email-${Math.floor(10000 + Math.random() * 90000)}`;
      
      const dateOffset = Math.floor(Math.random() * 30);
      const now = new Date();
      const pastDate = new Date(now.getTime() - dateOffset * 24 * 60 * 60 * 1000);
      const randomHour = Math.floor(8 + Math.random() * 10);
      const randomMin = Math.floor(10 + Math.random() * 49);
      const formattedDate = `${pastDate.getDate().toString().padStart(2, '0')}/${(pastDate.getMonth() + 1).toString().padStart(2, '0')}/${pastDate.getFullYear()} ${randomHour}:${randomMin}`;

      // Pick random registered customer for bulk success path
      const randomCust = get().erpCustomers[Math.floor(Math.random() * get().erpCustomers.length)];
      const customerCnpj = randomCust?.cnpj || '47960950000121';

      const ext = generateExtractedFields(get().activeErp, company, email, calculatedValTotal, customerCnpj);

      const resolvedItems: OrderItemMapped[] = rawItems.map((raw) => {
        const clientCnpjClean = customerCnpj.replace(/\D/g, '');
        const clientMappings = get().dePara.filter(
          (m) => m.incomingTerm.toLowerCase() === raw.rawDescription.toLowerCase() && m.isActive !== false
        );
        const mapping = clientMappings.find(m => m.clientCnpj && m.clientCnpj.replace(/\D/g, '') === clientCnpjClean) || clientMappings.find(m => !m.clientCnpj);
        const product = mapping 
          ? get().catalog.find((p) => p.code === mapping.catalogCode) 
          : get().catalog.find((p) => p.name.toLowerCase().includes(raw.rawDescription.toLowerCase()));
        
        if (product) {
          return {
            catalogCode: product.code,
            catalogName: product.name,
            quantity: raw.quantity,
            unitPrice: product.price,
            totalPrice: product.price * raw.quantity,
            unit: product.unit
          };
        }
        return {
          catalogCode: 'PENDENTE',
          catalogName: `Mapeamento pendente: "${raw.rawDescription}"`,
          quantity: raw.quantity,
          unitPrice: raw.unitPrice,
          totalPrice: raw.unitPrice * raw.quantity,
          unit: 'UN'
        };
      });

      const randStatus = Math.random();
      let status: EmailStatus = 'Enviado ao ERP';
      let errorMessage: string | undefined;

      if (randStatus < 0.05) {
        status = 'Erro';
        errorMessage = 'Falha na resposta do servidor do ERP (Timeout)';
      } else if (randStatus < 0.15) {
        status = 'Revisão Manual';
        errorMessage = 'Validação dos itens pendente no catálogo local.';
      } else if (randStatus < 0.25) {
        status = 'Aguardando';
      }

      const confidenceScore = status === 'Revisão Manual' ? 62 : Math.floor(85 + Math.random() * 15);

      const chatMessages: ChatMessage[] = [
        { id: `msg-${emailId}-1`, sender: 'buyer' as const, text: `Olá! Preciso de:\n${rawItems.map(it => `- ${it.quantity} un de ${it.rawDescription}`).join('\n')}\nCNPJ: ${formatCNPJ(customerCnpj)}`, timestamp: formattedDate },
        { id: `msg-${emailId}-2`, sender: 'agent' as const, text: `Olá, ${buyer}! Identifiquei os produtos no catálogo. Total do pedido R$ ${calculatedValTotal.toFixed(2)}. Enviando dados ao ERP...`, timestamp: formattedDate }
      ];

      if (status === 'Enviado ao ERP') {
        chatMessages.push({ id: `msg-${emailId}-3`, sender: 'agent' as const, text: `Pedido faturado e enviado ao ERP com sucesso!`, timestamp: formattedDate });
      } else if (status === 'Erro') {
        chatMessages.push({ id: `msg-${emailId}-3`, sender: 'agent' as const, text: `Erro de faturamento: O ERP retornou erro de Timeout. Direcionando para atendimento humano.`, timestamp: formattedDate });
      }

      newEmails.push({
        id: emailId,
        senderName: buyer,
        senderEmail: email,
        subject: `PEDIDO AUTOMÁTICO COMPRA #${emailId.replace('email-', '')}`,
        receivedAt: formattedDate,
        status,
        rawBody: `Prezado time,\n\nSolicitamos faturar as mercadorias listadas abaixo para nossa unidade operacional:\n\n${rawItems.map((it) => `- ${it.quantity} un de ${it.rawDescription}`).join('\n')}\n\nFaturamento: boleto bancário.\n\nAtenciosamente,\n${buyer}\n${company}`,
        extractedFields: ext,
        mappedFields: ext,
        rawItems,
        items: resolvedItems,
        erpTarget: get().activeErp,
        confidenceScore,
        errorMessage,
        isOpened: false,
        chatMessages
      });
    }

    set((state) => {
      const nextEmails = [...newEmails, ...state.emails];
      const nextSettings = {
        ...state.settings,
        usageCount: state.settings.usageCount + newEmails.filter(e => e.status === 'Enviado ao ERP').length
      };
      saveLocalData('emails', nextEmails);
      saveLocalData('settings', nextSettings);
      return { emails: nextEmails, settings: nextSettings };
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const dbInserts = newEmails.map(finalEmail => ({
          id: finalEmail.id,
          sender_name: finalEmail.senderName,
          sender_email: finalEmail.senderEmail,
          subject: finalEmail.subject,
          received_at: finalEmail.receivedAt,
          status: finalEmail.status,
          raw_body: finalEmail.rawBody,
          extracted_fields: finalEmail.extractedFields,
          mapped_fields: finalEmail.mappedFields,
          items: finalEmail.items,
          raw_items: finalEmail.rawItems,
          erp_target: finalEmail.erpTarget,
          error_message: finalEmail.errorMessage || null,
          confidence_score: finalEmail.confidenceScore
        }));

        await supabase.from('emails_orders').insert(dbInserts);
        await supabase.from('settings').update({ usage_count: get().settings.usageCount }).eq('id', 'global_settings');
      } catch (e) {
        console.error(e);
      }
    }
  },

  updateSettings: async (updatedSettings) => {
    set((state) => {
      const next = { ...state.settings, ...updatedSettings };
      saveLocalData('settings', next);
      return { settings: next };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('settings').update({
        company_name: get().settings.companyName,
        ai_enabled: get().settings.aiEnabled,
        confidence_threshold: get().settings.confidenceThreshold,
        notify_errors: get().settings.notifyErrors,
        notify_daily_summary: get().settings.notifyDailySummary,
        reply_template_confirm: get().settings.replyTemplateConfirm,
        reply_template_inconsistency: get().settings.replyTemplateInconsistency,
        reply_template_no_registration: get().settings.replyTemplateNoRegistration,
        cost_saving_filters_enabled: get().settings.costSavingFiltersEnabled,
        cost_saving_filter_attachment: get().settings.costSavingFilterAttachment,
        cost_saving_filter_keywords: get().settings.costSavingFilterKeywords,
        cost_saving_filter_whitelist: get().settings.costSavingFilterWhitelist,
        saved_ai_cost: get().settings.savedAiCost,
        filtered_emails_count: get().settings.filteredEmailsCount
      }).eq('id', 'global_settings');
    }
  },

  updateEmailConnection: async (conn) => {
    set((state) => {
      const next = { ...state.emailConnection, ...conn };
      saveLocalData('email_connection', next);
      return { emailConnection: next };
    });

    if (isSupabaseConfigured && supabase) {
      const ec = get().emailConnection;
      await supabase.from('connections').upsert({
        id: 'email',
        name: 'Email Inbox Reader',
        logo: 'Mail',
        connected: ec.connected,
        last_sync_time: ec.lastSyncTime || null,
        extra_config: {
          provider: ec.provider,
          imapHost: ec.imapHost,
          imapPort: ec.imapPort,
          imapUser: ec.imapUser
        }
      });
    }
  },

  setErpGeneralInstruction: (instruction: string) => {
    set({ erpGeneralInstruction: instruction });
    saveLocalData('erp_general_instruction', instruction);
  },

  updateErpConnection: async (id, conn) => {
    set((state) => {
      const next = state.erpConnections.map((c) => c.id === id ? { ...c, ...conn } : c);
      saveLocalData('erp_connections', next);
      return { erpConnections: next };
    });

    if (isSupabaseConfigured && supabase) {
      const ec = get().erpConnections.find(c => c.id === id);
      if (ec) {
        await supabase.from('connections').update({
          connected: ec.connected,
          api_key: ec.apiKey,
          base_url: ec.baseUrl,
          last_sync_time: ec.lastSyncTime || null
        }).eq('id', id);
      }
    }
  },

  completeOnboardingStep: async (step) => {
    set({ onboardingStep: step });
    saveLocalData('onboarding_step', step);
  },

  resetAllData: async () => {
    localStorage.clear();
    set({
      emails: defaultEmails,
      catalog: defaultCatalog,
      dePara: defaultDePara,
      deParaClientes: defaultDeParaClientes,
      erpCustomers: defaultErpCustomers,
      erpFields: erpPresets.Bling,
      activeErp: 'Bling',
      onboardingStep: 3,
      settings: {
        companyName: 'Softeum Logística Integrada Ltda',
        aiEnabled: true,
        confidenceThreshold: 80,
        autoSendToErp: false,
        notifyErrors: true,
        notifyDailySummary: true,
        usageCount: 1420,
        usageLimit: 5000,
        teamMembers: [
          { id: '1', email: 'diego@softeum.com.br', role: 'Admin' },
          { id: '2', email: 'lucas.silva@softeum.com.br', role: 'Operador' },
          { id: '3', email: 'diretoria@softeum.com.br', role: 'Visualizador' }
        ]
      }
    });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('emails_orders').delete().neq('id', '0');
        await supabase.from('catalog_products').delete().neq('code', '0');
        await supabase.from('depara_mappings').delete().neq('id', '0');
        await supabase.from('depara_clientes').delete().neq('id', '0');
        await supabase.from('erp_customers').delete().neq('id', '0');
        
        // Seed again
        await supabase.from('catalog_products').insert(defaultCatalog);
        await supabase.from('depara_mappings').insert(defaultDePara.map(d => ({ id: d.id, incoming_term: d.incomingTerm, catalog_code: d.catalogCode, confidence: d.confidence, status: d.status })));
        await supabase.from('erp_customers').insert(defaultErpCustomers.map(c => ({ id: c.id, cnpj: c.cnpj, razao_social: c.razaoSocial })));
        await supabase.from('depara_clientes').insert(defaultDeParaClientes.map(d => ({ id: d.id, incoming_cnpj: d.incomingCnpj, incoming_name: d.incomingName, erp_customer_code: d.erpCustomerCode, status: d.status })));
      } catch (e) {
        console.error(e);
      }
    }
  },

  testPromptExtraction: async (prompt, emailBody) => {
    // Artificial AI latency
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const fields = get().erpFields;
    const result: Record<string, string> = {};

    fields.forEach((f) => {
      let extractedVal = '';
      
      if (f.name.includes('cnpj') || f.name.includes('TaxID') || f.name.includes('cgc')) {
        const match = emailBody.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}\-?\d{2}/);
        extractedVal = match ? match[0].replace(/\D/g, '') : '';
      } else if (f.name.includes('razao') || f.name.includes('cliente') || f.name.includes('razaoSocial')) {
        const match = emailBody.match(/(?:Razão Social|Cliente|Razao):\s*([^\n]+)/i);
        extractedVal = match ? match[1].trim() : 'Cliente Demonstrativo S/A';
      } else if (f.name.includes('codigo') || f.name.includes('num') || f.name.includes('PO') || f.name.includes('PurchaseOrder')) {
        const match = emailBody.match(/(?:Pedido|PO|Compra|Ordem|Ref|#)\s*(?:#|no|do)?\s*([A-Za-z0-9\-]+)/i);
        extractedVal = match ? match[1].trim() : `PED-${Math.floor(10000 + Math.random() * 90000)}`;
      } else if (f.name.includes('valor') || f.name.includes('total')) {
        const match = emailBody.match(/(?:Total|Valor|Soma|R\$)\s*([0-9\.,]+)/i);
        extractedVal = match ? match[1].trim().replace(',', '.') : '750.00';
      } else if (f.name.includes('data') || f.name.includes('dat') || f.name.includes('previsao')) {
        extractedVal = new Date().toLocaleDateString('pt-BR');
      } else {
        extractedVal = f.defaultValue || `Extraído com prompt "${prompt.substring(0, 10)}...": [${f.label}]`;
      }
      result[f.name] = extractedVal;
    });

    return result;
  }
}));
