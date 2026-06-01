export type ErpFieldType = 'Text' | 'Number' | 'Date' | 'Select' | 'Boolean';

export interface ErpField {
  id: string;
  name: string;
  label: string;
  type: ErpFieldType;
  required: boolean;
  aiInstruction: string;
  defaultValue?: string;
  validationRule?: string; // Regex expression or numeric range like "1-100"
}

export interface CatalogProduct {
  code: string;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
}

export type DeParaStatus = 'Confirmado' | 'Sugerido pela IA' | 'Pendente';

export interface DeParaMapping {
  id: string;
  incomingTerm: string;
  catalogCode: string;
  confidence: number; // percentage, e.g. 95
  status: DeParaStatus;
  clientCnpj?: string;
  clientName?: string;
  description?: string;
  mappingType?: 'Manual' | 'Automático';
  isActive?: boolean;
}

export type EmailStatus = 'Aguardando' | 'Processando' | 'Enviado ao ERP' | 'Erro' | 'Revisão Manual' | 'E-mail Geral' | 'Arquivado';

export interface OrderItemExtracted {
  rawDescription: string;
  quantity: number;
  unitPrice: number;
  rawCode?: string;
}

export interface OrderItemMapped {
  catalogCode: string;
  catalogName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

export interface EmailOrderData {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  receivedAt: string;
  status: EmailStatus;
  rawBody: string;
  // Dynamic fields based on ERP layout
  extractedFields: Record<string, string>;
  // Dynamic fields after applying De-Para catalog mappings
  mappedFields: Record<string, string>;
  items: OrderItemMapped[];
  rawItems: OrderItemExtracted[];
  erpTarget: string; // Bling, TOTVS, Omie, SAP, Senior, Custom REST
  errorMessage?: string;
  confidenceScore: number; // General confidence score of AI extraction (0-100)
  replies?: EmailReply[];
  attachmentName?: string;
  attachmentUrl?: string;
  erpPayloadSent?: string;
  erpResponseLog?: string;
  isOpened?: boolean;
  chatMessages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sender: 'buyer' | 'agent' | 'operator';
  text: string;
  timestamp: string;
}

export interface ERPConnection {
  id: string; // bling, totvs, omie, sap, senior, custom
  name: string;
  logo: string;
  connected: boolean;
  apiKey: string;
  baseUrl: string;
  lastSyncTime?: string;
}

export interface EmailConnection {
  provider: 'Gmail' | 'Outlook' | 'IMAP';
  connected: boolean;
  lastSyncTime?: string;
  imapHost?: string;
  imapPort?: string;
  imapUser?: string;
  imapPassword?: string;
}

export interface SystemSettings {
  companyName: string;
  companyLogoUrl?: string;
  aiEnabled: boolean;
  confidenceThreshold: number; // 0-100, if below → manual review
  autoSendToErp: boolean;
  notifyErrors: boolean;
  notifyDailySummary: boolean;
  usageCount: number;
  usageLimit: number;
  teamMembers: Array<{
    id: string;
    email: string;
    role: 'Admin' | 'Operador' | 'Visualizador';
  }>;
  replyTemplateConfirm?: string;
  replyTemplateInconsistency?: string;
  replyTemplateNoRegistration?: string;
  costSavingFiltersEnabled?: boolean;
  costSavingFilterAttachment?: boolean;
  costSavingFilterKeywords?: boolean;
  costSavingFilterWhitelist?: boolean;
  savedAiCost?: number;
  filteredEmailsCount?: number;
}

export interface EmailReply {
  id: string;
  body: string;
  sentAt: string;
}

export interface ErpCustomer {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

export interface DeParaCliente {
  id: string;
  incomingCnpj?: string;
  incomingEmail?: string;
  incomingName: string;
  erpCustomerCode: string;
  status: 'Confirmado' | 'Pendente';
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Operador' | 'Visualizador';
  companyId: string | null;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  status: 'Ativo' | 'Suspenso';
  planName: string;
  monthlyFee: number;
  setupFee: number;
  setupPaidInstallments: number;
  setupTotalInstallments: number;
  orderLimit: number;
  overagePrice: number;
  avgTokenUsage: number;
  processedOrdersCount: number;
  erpTarget: string; // Bling, TOTVS, Omie, SAP, Senior, Custom
  dueDay?: number; // Dia de vencimento da fatura (ex: 5, 10, 15, 20)
  // Advanced Tenant Configurations
  confidenceThreshold?: number; // client-specific threshold override (default 80)
  autoSendToErp?: boolean; // client-specific auto send to ERP (default false)
  erpConnectionStatus?: 'Conectado' | 'Erro' | 'Desconectado'; // ERP status override
  apiKeyOverride?: string;
  apiUrlOverride?: string;
  contractFileName?: string; // name of uploaded contract file
  // Contacts & Users (Quem Responde)
  finContactName?: string;
  finContactEmail?: string;
  finContactPhone?: string;
  tiContactName?: string;
  tiContactEmail?: string;
  tiContactPhone?: string;
  usersList?: Array<{
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Operador' | 'Visualizador';
  }>;
  // Per-tenant AI Cost Saving Filters
  costSavingFiltersEnabled?: boolean;
  costSavingFilterAttachment?: boolean;
  costSavingFilterKeywords?: boolean;
  costSavingFilterWhitelist?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: 'Cliente' | 'Financeiro' | 'IA' | 'Sistema';
  details: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  companyName: string;
  period: string;
  subscriptionAmount: number;
  overageAmount: number;
  setupAmount: number;
  totalAmount: number;
  status: 'Pago' | 'Pendente' | 'Vencido';
  dueDate: string;
}
