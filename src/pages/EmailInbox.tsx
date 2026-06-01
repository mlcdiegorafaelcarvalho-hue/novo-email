import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useFlowStore } from '../store/useFlowStore';
import { EmailStatus, EmailOrderData, ChatMessage, OrderItemMapped } from '../types';
import { 
  Search, 
  Send, 
  Download, 
  AlertTriangle, 
  Check, 
  X,
  RefreshCw,
  Calendar,
  User,
  ExternalLink,
  Edit2,
  Archive,
  Inbox,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Sliders,
  Cpu,
  Link2,
  Sparkles,
  ArrowLeftRight,
  Plus,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

export const EmailInbox: React.FC = () => {
  const emailsRaw = useFlowStore((state) => state.emails);
  const currentUser = useFlowStore((state) => state.currentUser);
  const companies = useFlowStore((state) => state.companies);
  const deParaClientes = useFlowStore((state) => state.deParaClientes);
  const erpCustomers = useFlowStore((state) => state.erpCustomers);
  const getActiveEmails = useFlowStore((state) => state.getActiveEmails);

  const emails = React.useMemo(() => {
    return getActiveEmails();
  }, [emailsRaw, currentUser, companies, deParaClientes, erpCustomers, getActiveEmails]);

  const erpFields = useFlowStore((state) => state.erpFields);
  const catalog = useFlowStore((state) => state.catalog);
  const settings = useFlowStore((state) => state.settings);
  const sendEmailToErp = useFlowStore((state) => state.sendEmailToErp);
  const updateEmailStatus = useFlowStore((state) => state.updateEmailStatus);
  const updateEmailFields = useFlowStore((state) => state.updateEmailFields);
  const updateEmailItems = useFlowStore((state) => state.updateEmailItems);
  const receiveEmailWithDocument = useFlowStore((state) => state.receiveEmailWithDocument);
  const selectedEmailId = useFlowStore((state) => state.selectedEmailId);
  const setSelectedEmailId = useFlowStore((state) => state.setSelectedEmailId);
  
  const linkCustomerToErp = useFlowStore((state) => state.linkCustomerToErp);
  const createCustomerInErp = useFlowStore((state) => state.createCustomerInErp);
  const addDeParaMapping = useFlowStore((state) => state.addDeParaMapping);
  
  // Custom edit mode for extracted fields
  const [isEditing, setIsEditing] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmailStatus | 'Todos'>('Aguardando');
  const [rightPanelTab, setRightPanelTab] = useState<'extracted' | 'products' | 'logs'>('extracted');
  const [isSending, setIsSending] = useState(false);

  // Email response input
  const [takeoverText, setTakeoverText] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Customer resolution search states
  const [customerEmailSearch, setCustomerEmailSearch] = useState('');
  const [showEmailCustSuggestions, setShowEmailCustSuggestions] = useState(false);
  const [customerCnpjSearch, setCustomerCnpjSearch] = useState('');
  const [showCnpjCustSuggestions, setShowCnpjCustSuggestions] = useState(false);

  // Inline product De-Para mapping states
  const [mappingItemIdx, setMappingItemIdx] = useState<number | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [selectedSkuCode, setSelectedSkuCode] = useState('');

  // Import Email Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSenderName, setImportSenderName] = useState('');
  const [importSenderEmail, setImportSenderEmail] = useState('');
  const [importSubject, setImportSubject] = useState('');
  const [importBody, setImportBody] = useState('');
  const [importAttachmentName, setImportAttachmentName] = useState('');
  const [importCnpj, setImportCnpj] = useState('');
  const [isParsingDoc, setIsParsingDoc] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportAttachmentName(file.name);
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'html' || ext === 'htm' || ext === 'csv' || ext === 'txt') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setImportBody(prev => prev ? `${prev}\n\n[Conteúdo do anexo ${file.name}]:\n${text}` : text);
          toast.success(`Arquivo ${file.name} carregado com sucesso!`);
        }
      };
      reader.readAsText(file);
    } else {
      toast.info(`Arquivo ${file.name} anexado.`, {
        description: 'Documentos PDF/Excel serão processados via IA ao clicar em Enviar.'
      });
    }
  };

  const filteredEmailCustomers = useMemo(() => {
    const query = customerEmailSearch.toLowerCase();
    return erpCustomers.filter(
      (cust) => cust.razaoSocial.toLowerCase().includes(query) || cust.cnpj.includes(query)
    );
  }, [erpCustomers, customerEmailSearch]);

  const filteredCnpjCustomers = useMemo(() => {
    const query = customerCnpjSearch.toLowerCase();
    return erpCustomers.filter(
      (cust) => cust.razaoSocial.toLowerCase().includes(query) || cust.cnpj.includes(query)
    );
  }, [erpCustomers, customerCnpjSearch]);

  const filteredCatalogSuggestions = useMemo(() => {
    if (!productSearchQuery.trim()) return catalog.slice(0, 8);
    const query = productSearchQuery.toLowerCase();
    return catalog.filter(
      (p) => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)
    );
  }, [catalog, productSearchQuery]);

  // Filtered emails list
  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      const matchesSearch = 
        email.senderName.toLowerCase().includes(search.toLowerCase()) ||
        email.senderEmail.toLowerCase().includes(search.toLowerCase()) ||
        email.subject.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'Todos' 
        ? email.status !== 'Arquivado' 
        : email.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [emails, search, statusFilter]);

  // Selected email details
  const selectedEmail = useMemo(() => {
    return emails.find((e) => e.id === selectedEmailId) || null;
  }, [emails, selectedEmailId]);

  // Split emails into Today and Older groups
  const { todayEmails, olderEmails } = useMemo(() => {
    const today: EmailOrderData[] = [];
    const older: EmailOrderData[] = [];
    const now = new Date();
    const todayStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    filteredEmails.forEach((email) => {
      const datePart = email.receivedAt.split(' ')[0];
      if (datePart === todayStr) {
        today.push(email);
      } else {
        older.push(email);
      }
    });

    return { todayEmails: today, olderEmails: older };
  }, [filteredEmails]);

  // Scroll to bottom of interactions when message thread updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedEmail?.chatMessages, selectedEmailId]);

  const handleSelectEmail = (email: EmailOrderData) => {
    setSelectedEmailId(email.id);
    setIsEditing(false);
    setEditedFields(email.extractedFields);
    setTakeoverText('');
    setMappingItemIdx(null);
    setRightPanelTab('extracted');
    
    // Mark as opened in state
    if (email.isOpened === false) {
      useFlowStore.setState((state) => ({
        emails: state.emails.map((e) => e.id === email.id ? { ...e, isOpened: true } : e)
      }));
    }
  };

  const handleSaveFields = () => {
    if (!selectedEmail) return;
    
    // Check if required fields are missing
    const requiredFields = erpFields.filter((f) => f.required);
    const hasMissingRequired = requiredFields.some((f) => !editedFields[f.name]);
    
    // Check if client is registered or mapped
    const extractedCnpj = editedFields.cliente_cnpj || editedFields.C7_CLIENTE || editedFields.cnpj_cliente || editedFields.SAP_TaxID || editedFields.cgcCli || '';
    const hasClientMapping = deParaClientes.some(c => 
      (c.incomingCnpj && c.incomingCnpj === extractedCnpj) ||
      (c.incomingEmail && c.incomingEmail === selectedEmail.senderEmail)
    );
    const isCustomerRegistered = erpCustomers.some(c => c.cnpj === extractedCnpj);
    const isClientMissing = !hasClientMapping && !isCustomerRegistered;

    // Check if there are pending SKU mappings
    const hasPendingItems = selectedEmail.items.some((it) => it.catalogCode === 'PENDENTE');

    let newStatus = selectedEmail.status;
    let newErrorMessage = selectedEmail.errorMessage;

    if (selectedEmail.status === 'Revisão Manual' || selectedEmail.status === 'Erro') {
      if (!isClientMissing && !hasMissingRequired && !hasPendingItems) {
        newStatus = 'Aguardando';
        newErrorMessage = undefined;
      } else {
        if (isClientMissing) {
          const cnpjFormatado = formatCNPJ(extractedCnpj) || 'vazio';
          newErrorMessage = `Erro de Pré-cadastro: O CNPJ do cliente (${cnpjFormatado}) ou e-mail de origem não está pré-cadastrado no ERP.`;
        } else if (hasMissingRequired) {
          const errList = requiredFields.filter((f) => !editedFields[f.name]).map((f) => `"${f.label}"`).join(', ');
          newErrorMessage = `Erro de Validação: Os campos obrigatórios ${errList} estão ausentes.`;
        } else if (hasPendingItems) {
          newErrorMessage = 'Erro de De-Para: O pedido contém itens com código de catálogo pendente de mapeamento.';
        }
      }
    }

    // Update fields in store & database
    updateEmailFields(selectedEmail.id, editedFields, newStatus, newErrorMessage);

    setIsEditing(false);
    toast.success('Campos corrigidos salvos com sucesso!', {
      description: newStatus === 'Aguardando' 
        ? 'O e-mail foi revalidado com sucesso e está pronto para o ERP!' 
        : 'Alterações gravadas. Pedido ainda possui pendências.'
    });
  };

  const handleSend = async (emailId: string) => {
    setIsSending(true);
    const success = await sendEmailToErp(emailId);
    setIsSending(false);
    
    if (success) {
      toast.success('Pedido integrado com sucesso!', {
        description: `O pedido foi transmitido para o ERP.`
      });
    } else {
      toast.error('Erro na integração do pedido', {
        description: 'Verifique se há campos obrigatórios ausentes ou conexões inativas.'
      });
    }
  };

  const handleSendEmailReply = async () => {
    if (!selectedEmail || !takeoverText.trim()) return;
    setIsSendingMsg(true);
    await useFlowStore.getState().sendEmailReply(selectedEmail.id, takeoverText);
    setIsSendingMsg(false);
    setTakeoverText('');
  };

  const handleExport = (type: 'csv' | 'xml' | 'json', email: EmailOrderData) => {
    const dataStr = type === 'json' 
      ? JSON.stringify(email, null, 2) 
      : type === 'xml'
        ? `<?xml version="1.0" encoding="UTF-8"?>\n<pedido id="${email.id}">\n  <cliente>\n    <cnpj>${email.extractedFields.cliente_cnpj || ''}</cnpj>\n    <nome>${email.extractedFields.cliente_razao || ''}</nome>\n  </cliente>\n  <itens>\n${email.items.map(it => `    <item>\n      <codigo>${it.catalogCode}</codigo>\n      <quantidade>${it.quantity}</quantidade>\n      <preco>${it.unitPrice}</preco>\n    </item>`).join('\n')}\n  </itens>\n</pedido>`
        : `Codigo Pedido,CNPJ Cliente,Razao Social,Valor Total\n${email.extractedFields.codigo_pedido || ''},${email.extractedFields.cliente_cnpj || ''},${email.extractedFields.cliente_razao || ''},${email.extractedFields.valor_total || ''}`;
        
    const blob = new Blob([dataStr], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `email-pedido-${email.id}.${type}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exportado para ${type.toUpperCase()} com sucesso!`);
  };

  const formatCNPJ = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length !== 14) return val;
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
  };

  const convertBRToISODate = (brDate: string): string => {
    if (!brDate) return '';
    const parts = brDate.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return brDate;
  };

  const convertISOToBRDate = (isoDate: string): string => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  };

  const getStatusStyle = (status: EmailStatus) => {
    switch (status) {
      case 'Aguardando': return 'bg-azul/10 text-azul border-azul/25';
      case 'Processando': return 'bg-lilas/10 text-lilas border-lilas/25 animate-pulse';
      case 'Enviado ao ERP': return 'bg-success/10 text-success border-success/25';
      case 'Erro': return 'bg-error/10 text-error border-error/25';
      case 'Revisão Manual': return 'bg-warning/10 text-warning border-warning/25';
      case 'E-mail Geral': return 'bg-text-tertiary/10 text-text-secondary border-border/25';
      case 'Arquivado': return 'bg-black/5 text-text-tertiary border-border/25';
      default: return 'bg-black/5 text-text-tertiary border-border/25';
    }
  };

  const isCustomerMissing = useMemo(() => {
    if (!selectedEmail) return false;
    const cnpj = selectedEmail.extractedFields.cliente_cnpj || selectedEmail.extractedFields.C7_CLIENTE || selectedEmail.extractedFields.cnpj_cliente || selectedEmail.extractedFields.cgcCli || '';
    const hasClientMapping = deParaClientes.some(c => 
      (c.incomingCnpj && c.incomingCnpj === cnpj) ||
      (c.incomingEmail && c.incomingEmail === selectedEmail.senderEmail)
    );
    const isCustomerRegistered = erpCustomers.some(c => c.cnpj === cnpj);
    return !hasClientMapping && !isCustomerRegistered;
  }, [selectedEmail, deParaClientes, erpCustomers]);

  const hasPendingItems = useMemo(() => {
    if (!selectedEmail) return false;
    return selectedEmail.items.some((it) => it.catalogCode === 'PENDENTE');
  }, [selectedEmail]);

  return (
    <div className="h-[calc(100vh-8.5rem)] flex gap-6 animate-fadeIn text-text-primary">
      
      {/* Left panel: E-mail Ingestion List */}
      <div className="w-[340px] lg:w-[380px] glass-panel rounded-2xl flex flex-col overflow-hidden shrink-0 border border-border/40 bg-white/60">
        
        {/* Search Header */}
        <div className="p-4 border-b border-border/30 bg-white/30 space-y-3">
          <button
            onClick={() => {
              setImportSenderName('');
              setImportSenderEmail('');
              setImportSubject('');
              setImportBody('');
              setImportAttachmentName('');
              setImportCnpj('');
              setIsImportModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-lilas to-azul text-white font-bold text-xs hover:opacity-95 shadow-sm transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Novo E-mail / Upload Documento</span>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-text-tertiary w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por remetente, e-mail ou assunto..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/60 bg-white/60 focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Quick filter tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {[
              { status: 'Aguardando' as const, label: 'Aguardando' },
              { status: 'Revisão Manual' as const, label: 'Revisão Manual' },
              { status: 'E-mail Geral' as const, label: 'Geral' },
              { status: 'Todos' as const, label: 'Todos' }
            ].map((tab) => (
              <button
                key={tab.label}
                onClick={() => setStatusFilter(tab.status)}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === tab.status
                    ? 'bg-lilas text-white border-lilas shadow-sm'
                    : 'bg-white/60 text-text-secondary border-border/60 hover:bg-white hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* E-mails Scroll area */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/20">
          {filteredEmails.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-border/20 flex items-center justify-center text-text-tertiary mb-3">
                <Inbox size={20} />
              </div>
              <p className="text-xs font-bold text-text-secondary">Nenhum e-mail encontrado</p>
              <p className="text-[11px] text-text-tertiary mt-1">Refine a busca ou altere os filtros.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {todayEmails.length > 0 && (
                <div className="flex flex-col">
                  <div className="bg-lilas/5 px-4 py-2 text-[9px] font-bold text-lilas uppercase tracking-wider sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b border-border/10 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-lilas animate-pulse shrink-0" />
                    <span>Novos Hoje ({todayEmails.length})</span>
                  </div>
                  <div className="divide-y divide-border/10">
                    {todayEmails.map((email) => {
                      const isSelected = email.id === selectedEmailId;
                      const itemsTotal = email.items.reduce((acc, it) => acc + it.totalPrice, 0);
                      
                      return (
                        <button
                          key={email.id}
                          onClick={() => handleSelectEmail(email)}
                          className={`w-full p-4 text-left flex items-start gap-3 transition border-l-4 ${
                            isSelected 
                              ? 'bg-white/80 border-lilas shadow-sm' 
                              : 'hover:bg-white/40 border-transparent bg-transparent'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lilas/10 to-azul/10 text-lilas border border-lilas/25 flex items-center justify-center shrink-0 relative font-bold text-xs">
                            {email.senderName.slice(0, 2).toUpperCase()}
                            {email.isOpened === false && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[12px] font-bold text-text-primary truncate">{email.senderName}</span>
                              <span className="text-[9px] text-text-tertiary font-semibold shrink-0">
                                {email.receivedAt.split(' ')[1]}
                              </span>
                            </div>
                            <span className="text-[10px] text-text-tertiary block font-mono font-medium truncate">
                              {email.senderEmail}
                            </span>
                            <p className="text-[11px] text-text-secondary truncate font-bold">
                              {email.subject}
                            </p>
                            <div className="flex items-center justify-between mt-1.5 pt-1">
                              <span className="text-[10px] font-bold text-lilas">
                                R$ {itemsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wider ${getStatusStyle(email.status)}`}>
                                {email.status === 'E-mail Geral' ? 'Geral' : email.status}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {olderEmails.length > 0 && (
                <div className="flex flex-col">
                  <div className="bg-black/[0.02] px-4 py-2 text-[9px] font-bold text-text-secondary uppercase tracking-wider sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b border-border/10">
                    <span>E-mails Anteriores ({olderEmails.length})</span>
                  </div>
                  <div className="divide-y divide-border/10">
                    {olderEmails.map((email) => {
                      const isSelected = email.id === selectedEmailId;
                      const itemsTotal = email.items.reduce((acc, it) => acc + it.totalPrice, 0);
                      
                      return (
                        <button
                          key={email.id}
                          onClick={() => handleSelectEmail(email)}
                          className={`w-full p-4 text-left flex items-start gap-3 transition border-l-4 ${
                            isSelected 
                              ? 'bg-white/80 border-lilas shadow-sm' 
                              : 'hover:bg-white/40 border-transparent bg-transparent'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lilas/10 to-azul/10 text-lilas border border-lilas/25 flex items-center justify-center shrink-0 relative font-bold text-xs">
                            {email.senderName.slice(0, 2).toUpperCase()}
                            {email.isOpened === false && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[12px] font-bold text-text-primary truncate">{email.senderName}</span>
                              <span className="text-[9px] text-text-tertiary font-semibold shrink-0">
                                {email.receivedAt.split(' ')[0]}
                              </span>
                            </div>
                            <span className="text-[10px] text-text-tertiary block font-mono font-medium truncate">
                              {email.senderEmail}
                            </span>
                            <p className="text-[11px] text-text-secondary truncate font-bold">
                              {email.subject}
                            </p>
                            <div className="flex items-center justify-between mt-1.5 pt-1">
                              <span className="text-[10px] font-bold text-lilas">
                                R$ {itemsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wider ${getStatusStyle(email.status)}`}>
                                {email.status === 'E-mail Geral' ? 'Geral' : email.status}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center & Right panels: Email Reader & Extractions */}
      <div className="flex-1 flex gap-5 min-w-0">
        
        {selectedEmail ? (
          <>
            {/* Center Panel: Email Content & History logs */}
            <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden border border-border/40 bg-white/20">
              
              {/* Reader Header */}
              <div className="p-4 border-b border-border/30 bg-white/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-lilas/10 border border-lilas/25 flex items-center justify-center font-bold text-lilas text-sm shrink-0">
                    {selectedEmail.senderName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-text-primary">
                      {selectedEmail.subject}
                    </span>
                    <span className="text-[11px] text-text-tertiary font-mono font-medium">
                      De: {selectedEmail.senderName} ({selectedEmail.senderEmail}) • Recebido em: {selectedEmail.receivedAt}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 bg-white shadow-xs ${getStatusStyle(selectedEmail.status)}`}>
                    <Sparkles size={11} className="text-lilas" />
                    <span>IA: {selectedEmail.status === 'E-mail Geral' ? 'Isenta' : 'Ativa'}</span>
                  </span>
                  <button 
                    onClick={() => setSelectedEmailId(null)}
                    className="p-1.5 rounded-lg hover:bg-black/5 text-text-secondary cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Email Content Details */}
              <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50 space-y-5">
                
                {/* PDF/Attachment Row if exists */}
                {selectedEmail.attachmentName && (() => {
                  const name = selectedEmail.attachmentName;
                  const ext = name.split('.').pop()?.toLowerCase();
                  
                  let icon = <FileText size={18} />;
                  let iconBg = 'bg-rose-50 border-rose-100 text-rose-500';
                  let label = 'Documento PDF Extraído';
                  
                  if (ext === 'xlsx' || ext === 'xls') {
                    icon = <FileSpreadsheet size={18} />;
                    iconBg = 'bg-emerald-50 border-emerald-100 text-emerald-600';
                    label = 'Planilha Excel Extraída';
                  } else if (ext === 'html' || ext === 'htm') {
                    icon = <FileCode size={18} />;
                    iconBg = 'bg-blue-50 border-blue-100 text-blue-500';
                    label = 'Documento HTML Extraído';
                  } else if (ext === 'csv') {
                    icon = <FileSpreadsheet size={18} />;
                    iconBg = 'bg-amber-50 border-amber-100 text-amber-500';
                    label = 'Planilha CSV Extraída';
                  } else if (ext) {
                    icon = <File size={18} />;
                    iconBg = 'bg-slate-50 border-slate-100 text-slate-500';
                    label = `Arquivo ${ext.toUpperCase()} Extraído`;
                  }
                  
                  return (
                    <div className="p-3.5 rounded-xl border border-border bg-white/80 shadow-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${iconBg} border flex items-center justify-center shrink-0`}>
                          {icon}
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <span className="text-[12px] font-bold text-text-primary truncate">{name}</span>
                          <span className="text-[9px] text-text-tertiary uppercase font-bold">{label}</span>
                        </div>
                      </div>
                      <a
                        href={`/pdf-viewer/${selectedEmail.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-border hover:bg-black/5 text-text-secondary hover:text-text-primary text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink size={12} />
                        Ver Documento
                      </a>
                    </div>
                  );
                })()}

                {/* Raw Email Text Body */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Corpo do E-mail</span>
                  <div className="bg-white/80 border border-border/30 p-5 rounded-2xl text-xs font-semibold leading-relaxed font-mono whitespace-pre-wrap text-text-primary shadow-xs">
                    {selectedEmail.rawBody}
                  </div>
                </div>

                {/* Timeline Interaction History */}
                <div className="space-y-3 pt-3">
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">Linha do Tempo & Logs da IA</span>
                  
                  {selectedEmail.chatMessages && selectedEmail.chatMessages.length > 0 ? (
                    <div className="space-y-3">
                      {selectedEmail.chatMessages.map((msg) => {
                        const isBuyer = msg.sender === 'buyer';
                        const isAgent = msg.sender === 'agent';
                        
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex w-full ${isBuyer ? 'justify-start' : 'justify-end'}`}
                          >
                            <div 
                              className={`max-w-[85%] p-3.5 rounded-2xl shadow-xs leading-relaxed text-xs relative ${
                                isBuyer 
                                  ? 'bg-white text-text-primary rounded-tl-xs border border-slate-200' 
                                  : 'bg-[#ECE5F9] text-text-primary rounded-tr-xs border border-[#DCD0F3]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-6 mb-1 text-[9px] uppercase tracking-wider font-bold text-text-tertiary">
                                <span>
                                  {isBuyer 
                                    ? 'Comprador' 
                                    : isAgent 
                                      ? '🤖 Assistente IA' 
                                      : '👨‍💼 Resposta Operador'}
                                </span>
                                <span className="font-mono text-[8px] font-medium">{msg.timestamp}</span>
                              </div>
                              <p className="whitespace-pre-wrap font-sans text-[12px] font-medium text-text-primary">
                                {msg.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-border/60 rounded-xl text-center text-text-tertiary text-xs">
                      Nenhum histórico de processamento estruturado.
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Email Reply Text Footer */}
              <div className="p-4 border-t border-border/30 bg-white/40 shrink-0 space-y-3">
                {/* Reply Quick Templates */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-text-secondary font-bold uppercase mr-1 shrink-0">Templates:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const base = settings.replyTemplateConfirm || 'Olá {cliente}, confirmamos o recebimento e processamento do seu pedido! As informações já foram devidamente integradas ao nosso ERP.';
                      setTakeoverText(base.replace('{cliente}', selectedEmail.senderName));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-lilas/10 hover:bg-lilas/20 border border-lilas/25 text-[9px] font-bold text-lilas transition cursor-pointer"
                  >
                    👍 Confirmar Recebimento
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = settings.replyTemplateInconsistency || 'Olá {cliente}, identificamos divergências em alguns itens do pedido em relação ao catálogo do ERP. Poderia revisar as descrições?';
                      setTakeoverText(base.replace('{cliente}', selectedEmail.senderName));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-warning/10 hover:bg-warning/20 border border-warning/25 text-[9px] font-bold text-warning transition cursor-pointer"
                  >
                    ⚠️ Pendência de SKU
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = settings.replyTemplateNoRegistration || 'Olá {cliente}, não localizamos o CNPJ da sua empresa em nosso cadastro. Por favor, responda com os dados cadastrais.';
                      setTakeoverText(base.replace('{cliente}', selectedEmail.senderName));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-error/10 hover:bg-error/20 border border-error/25 text-[9px] font-bold text-error transition cursor-pointer"
                  >
                    🔍 Solicitar CNPJ
                  </button>
                </div>

                {/* Email typing box */}
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder="Escrever e-mail de resposta manual ao comprador (suspende IA temporariamente)..."
                    className="flex-1 p-2.5 border border-border/60 bg-white rounded-xl focus:outline-none focus:border-lilas text-xs font-semibold placeholder:text-text-tertiary resize-none leading-relaxed text-text-primary"
                    value={takeoverText}
                    onChange={(e) => setTakeoverText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendEmailReply();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!takeoverText.trim() || isSendingMsg}
                    onClick={handleSendEmailReply}
                    className="w-12 rounded-xl bg-gradient-to-tr from-lilas to-azul hover:opacity-90 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-sm transition cursor-pointer"
                  >
                    {isSendingMsg ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel: Data Extraction & Mapped SKUs */}
            <div className="w-[380px] lg:w-[440px] glass-panel rounded-2xl flex flex-col overflow-hidden shrink-0 border border-border/40 bg-white/40">
              
              {/* Right Panel Tabs */}
              <div className="flex border-b border-border/20 bg-white/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setRightPanelTab('extracted')}
                  className={`flex-1 py-3 text-[11px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                    rightPanelTab === 'extracted' 
                      ? 'border-lilas text-lilas bg-white/10' 
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Cpu size={13} />
                  Dados da Nota/Pedido
                </button>
                
                <button
                  type="button"
                  onClick={() => setRightPanelTab('products')}
                  className={`flex-1 py-3 text-[11px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                    rightPanelTab === 'products' 
                      ? 'border-lilas text-lilas bg-white/10' 
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Sliders size={13} />
                  Produtos (De-Para)
                </button>

                <button
                  type="button"
                  onClick={() => setRightPanelTab('logs')}
                  className={`flex-1 py-3 text-[11px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                    rightPanelTab === 'logs' 
                      ? 'border-lilas text-lilas bg-white/10' 
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Link2 size={13} />
                  Logs ERP
                </button>
              </div>

              {/* Tabs Content Scroll Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                
                {selectedEmail.errorMessage && (
                  <div className="p-3 rounded-xl border border-error/25 bg-error/5 flex gap-2.5 items-start">
                    <AlertTriangle className="text-error shrink-0 mt-0.5" size={16} />
                    <p className="text-[11px] text-error font-medium leading-relaxed">
                      {selectedEmail.errorMessage}
                    </p>
                  </div>
                )}

                {rightPanelTab === 'extracted' && (
                  <div className="space-y-4">
                    {/* Link Client Warning Card */}
                    {isCustomerMissing && (
                      <div className="p-4 rounded-xl border border-lilas/25 bg-gradient-to-tr from-lilas/5 via-azul/5 to-transparent space-y-3 text-left">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary">
                          <User size={13} className="text-lilas" />
                          <span>Vincular Cliente no ERP</span>
                        </div>
                        <p className="text-[10px] text-text-secondary leading-relaxed">
                          O remetente ou CNPJ extraído não possui um cadastro ou vínculo ativo de carteira no ERP.
                        </p>

                        <div className="flex flex-col gap-3 pt-1">
                          {/* Search matching clients input dropdown */}
                          <div className="flex flex-col gap-1 p-2 bg-white border border-border/30 rounded-lg">
                            <span className="text-[8px] font-bold text-text-secondary uppercase">Pesquisar por nome do cliente</span>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Procurar cliente cadastrado..."
                                className="w-full p-2 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-[10px] font-semibold text-text-primary mt-1"
                                value={customerEmailSearch}
                                onChange={(e) => {
                                  setCustomerEmailSearch(e.target.value);
                                  setShowEmailCustSuggestions(true);
                                }}
                                onFocus={() => setShowEmailCustSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowEmailCustSuggestions(false), 200)}
                              />
                              {showEmailCustSuggestions && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-border shadow-xl max-h-[140px] overflow-y-auto z-50 p-1 divide-y divide-border/10">
                                  {filteredEmailCustomers.length === 0 ? (
                                    <div className="p-2 text-center text-[9px] text-text-tertiary">Nenhum cliente correspondente</div>
                                  ) : (
                                    filteredEmailCustomers.map((cust) => (
                                      <button
                                        key={cust.id}
                                        type="button"
                                        onClick={() => {
                                          linkCustomerToErp(selectedEmail.id, cust.id, 'email');
                                          setCustomerEmailSearch('');
                                          setShowEmailCustSuggestions(false);
                                        }}
                                        className="w-full text-left p-1.5 hover:bg-black/5 flex flex-col rounded text-[10px] cursor-pointer"
                                      >
                                        <span className="font-bold text-text-primary">{cust.razaoSocial}</span>
                                        <span className="text-[8px] font-mono text-text-tertiary">CNPJ: {formatCNPJ(cust.cnpj)} | Cód: {cust.id}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="relative flex py-0.5 items-center">
                            <div className="flex-grow border-t border-border/20"></div>
                            <span className="flex-shrink mx-3 text-[8px] text-text-tertiary font-bold uppercase">ou</span>
                            <div className="flex-grow border-t border-border/20"></div>
                          </div>

                          {/* Trigger customer creation in ERP */}
                          <button
                            type="button"
                            onClick={() => {
                              createCustomerInErp(
                                selectedEmail.id,
                                selectedEmail.extractedFields.cliente_cnpj || '',
                                selectedEmail.extractedFields.cliente_razao || selectedEmail.senderName,
                                'email'
                              );
                            }}
                            className="w-full py-2 px-3 bg-lilas hover:bg-lilas/90 text-white text-[11px] font-bold rounded-lg shadow-sm transition cursor-pointer"
                          >
                            Cadastrar Cliente no ERP
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Extracted ERP Fields Header */}
                    <div className="flex items-center justify-between border-b border-border/20 pb-2">
                      <span className="text-[12px] font-bold text-text-primary">Campos Estruturados pela IA</span>
                      {isEditing ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleSaveFields}
                            className="px-2.5 py-1 rounded bg-success text-white text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Check size={11} /> Salvar
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setEditedFields(selectedEmail.extractedFields);
                            }}
                            className="px-2.5 py-1 rounded bg-black/5 hover:bg-black/10 text-text-secondary text-[10px] font-bold cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        selectedEmail.status !== 'Enviado ao ERP' && (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="px-2.5 py-1 rounded border border-border/80 text-text-secondary hover:text-text-primary text-[10px] font-bold flex items-center gap-1 bg-white cursor-pointer"
                          >
                            <Edit2 size={11} /> Editar Campos
                          </button>
                        )
                      )}
                    </div>

                    {/* Editable fields mapping list */}
                    <div className="space-y-3 text-left">
                      {erpFields.map((field) => {
                        const value = isEditing 
                          ? (editedFields[field.name] || '') 
                          : (selectedEmail.extractedFields[field.name] || '');
                        
                        return (
                          <div 
                            key={field.id} 
                            className="p-3 rounded-xl bg-white border border-border/30 shadow-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-text-secondary">{field.label}</span>
                              {field.required && (
                                <span className="text-[8px] font-bold px-1 rounded bg-error/10 text-error">Obrigatório</span>
                              )}
                            </div>

                            {isEditing ? (
                              <input
                                type={field.type === 'Number' ? 'number' : field.type === 'Date' ? 'date' : 'text'}
                                className="w-full p-2 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                                value={field.type === 'Date' ? convertBRToISODate(value) : value}
                                onChange={(e) => setEditedFields({ ...editedFields, [field.name]: field.type === 'Date' ? convertISOToBRDate(e.target.value) : e.target.value })}
                              />
                            ) : (
                              <div className="text-[12px] font-bold text-text-primary flex items-center justify-between">
                                <span>{value || <em className="text-error font-medium not-italic">Ausente</em>}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {rightPanelTab === 'products' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/20 pb-2">
                      <span className="text-[12px] font-bold text-text-primary">Mapeamento de Produtos De-Para</span>
                      <span className="text-[10px] text-text-tertiary">Mapeamento de SKUs de e-mail</span>
                    </div>

                    <div className="space-y-3">
                      {selectedEmail.items.map((it, idx) => {
                        const rawItem = selectedEmail.rawItems[idx];
                        const isMatched = it.catalogCode !== 'PENDENTE';
                        
                        return (
                          <div key={idx} className="p-3.5 rounded-xl bg-white border border-border/30 flex flex-col gap-2.5 text-left">
                            <div className="flex justify-between items-start gap-4">
                              <div className="min-w-0">
                                <p className="text-[9px] text-text-tertiary font-bold uppercase truncate">No E-mail: "{rawItem?.rawDescription || it.catalogName}"</p>
                                <p className="text-[12px] font-bold text-text-primary mt-0.5 truncate">{it.catalogName}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                                isMatched ? 'bg-success/10 text-success border border-success/20' : 'bg-warning/10 text-warning border border-warning/20'
                              }`}>
                                {it.catalogCode}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-[10px] text-text-secondary font-semibold">
                              <div>Qtd: <strong className="text-text-primary">{it.quantity} {it.unit}</strong></div>
                              <div>Unit: <strong className="text-text-primary">R$ {it.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                              <div className="text-right text-lilas">Total: <strong>R$ {it.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                            </div>

                            {/* SKU manual mapper mapping tools */}
                            {mappingItemIdx === idx ? (
                              <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-lilas/30 space-y-2 relative text-left">
                                <span className="text-[9px] font-bold text-text-secondary uppercase">Pesquisar no Catálogo:</span>
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="Buscar SKU ou nome do produto..."
                                    className="w-full p-2 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-[11px] font-semibold text-text-primary"
                                    value={productSearchQuery}
                                    onChange={(e) => {
                                      setProductSearchQuery(e.target.value);
                                      setShowProductSuggestions(true);
                                    }}
                                    onFocus={() => setShowProductSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
                                  />
                                  {showProductSuggestions && (
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-border shadow-xl max-h-[140px] overflow-y-auto z-50 p-1 divide-y divide-border/10">
                                      {filteredCatalogSuggestions.length === 0 ? (
                                        <div className="p-2 text-center text-[9px] text-text-tertiary">Nenhum produto correspondente</div>
                                      ) : (
                                        filteredCatalogSuggestions.map((product) => (
                                          <button
                                            key={product.code}
                                            type="button"
                                            onClick={() => {
                                              setSelectedSkuCode(product.code);
                                              setProductSearchQuery(`[${product.code}] ${product.name}`);
                                              setShowProductSuggestions(false);
                                            }}
                                            className="w-full text-left p-1.5 hover:bg-black/5 flex flex-col rounded text-[10px] cursor-pointer"
                                          >
                                            <span className="font-bold text-text-primary truncate">{product.name}</span>
                                            <span className="text-[8px] font-mono text-text-tertiary">SKU: {product.code} | R$ {product.price.toFixed(2)}</span>
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex justify-end gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setMappingItemIdx(null)}
                                    className="px-2.5 py-1 bg-black/5 hover:bg-black/10 rounded text-[9px] font-bold text-text-secondary cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!selectedSkuCode}
                                    onClick={async () => {
                                      const informalName = rawItem?.rawDescription || it.catalogName;
                                      if (!informalName) return;
                                      
                                      const emailCnpj = selectedEmail.extractedFields.cliente_cnpj || selectedEmail.extractedFields.C7_CLIENTE || selectedEmail.extractedFields.cnpj_cliente || '';
                                      const emailClientName = selectedEmail.extractedFields.cliente_razao || selectedEmail.extractedFields.C7_RAZAO || selectedEmail.extractedFields.razao_social || selectedEmail.senderName;
                                      const resolvedProduct = catalog.find(p => p.code === selectedSkuCode);

                                      // Save mapping globally
                                      await addDeParaMapping({
                                        id: `dp-${Math.floor(1000 + Math.random() * 9000)}`,
                                        incomingTerm: informalName,
                                        catalogCode: selectedSkuCode,
                                        status: 'Confirmado',
                                        confidence: 100,
                                        clientCnpj: emailCnpj,
                                        clientName: emailClientName,
                                        description: resolvedProduct ? resolvedProduct.name : '',
                                        mappingType: 'Manual',
                                        isActive: true
                                      });

                                      // Update in store & database
                                      const product = catalog.find(p => p.code === selectedSkuCode);
                                      if (product) {
                                        const newItems = selectedEmail.items.map((item, itemIdx) => {
                                          if (itemIdx !== idx) return item;
                                          return {
                                            catalogCode: product.code,
                                            catalogName: product.name,
                                            quantity: item.quantity,
                                            unitPrice: product.price,
                                            totalPrice: product.price * item.quantity,
                                            unit: product.unit
                                          };
                                        });

                                        const hasPending = newItems.some(it => it.catalogCode === 'PENDENTE');
                                        const status = hasPending ? selectedEmail.status : 'Aguardando';
                                        const errorMessage = hasPending ? selectedEmail.errorMessage : undefined;

                                        await updateEmailItems(selectedEmail.id, newItems, status, errorMessage);
                                      }

                                      toast.success('Associação de SKU registrada. Pedido liberado!');
                                      setMappingItemIdx(null);
                                    }}
                                    className="px-2.5 py-1 bg-gradient-to-r from-lilas to-azul hover:opacity-90 text-white rounded text-[9px] font-bold disabled:opacity-40 cursor-pointer"
                                  >
                                    Vincular SKU
                                  </button>
                                </div>
                              </div>
                            ) : (
                              !isMatched && (
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMappingItemIdx(idx);
                                      setProductSearchQuery('');
                                      setSelectedSkuCode('');
                                    }}
                                    className="px-2.5 py-1.5 text-[9px] font-bold rounded-lg bg-lilas text-white flex items-center gap-1 hover:bg-lilas/90 transition shadow-sm cursor-pointer"
                                  >
                                    <ArrowLeftRight size={10} />
                                    <span>Mapear SKU</span>
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {rightPanelTab === 'logs' && (
                  <div className="space-y-4 text-left">
                    <span className="text-[12px] font-bold text-text-primary block border-b border-border/20 pb-2">Payload Enviado ao ERP</span>
                    <pre className="bg-slate-950 p-3 rounded-xl font-mono text-[9px] text-[#A78BFA] leading-normal overflow-x-auto whitespace-pre">
                      {selectedEmail.erpPayloadSent || 'Nenhum payload enviado ainda.'}
                    </pre>

                    <span className="text-[12px] font-bold text-text-primary block border-b border-border/20 pb-2 pt-2">Log de Resposta do ERP</span>
                    <pre className="bg-slate-950 p-3 rounded-xl font-mono text-[9px] text-emerald-400 leading-normal overflow-x-auto whitespace-pre">
                      {selectedEmail.erpResponseLog || 'Aguardando envio para logar resposta.'}
                    </pre>
                  </div>
                )}
              </div>

              {/* Right Panel Footer Integrations */}
              <div className="p-4 border-t border-border/30 bg-white/40 flex gap-2 shrink-0">
                {selectedEmail.status === 'E-mail Geral' ? (
                  <button
                    onClick={() => {
                      updateEmailStatus(selectedEmail.id, 'Arquivado', 'Conversa arquivada pelo operador.');
                      toast.success('Pedido geral arquivado com sucesso!');
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-500 hover:bg-slate-600 font-bold text-white text-[12px] flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Archive size={15} />
                    <span>Arquivar E-mail</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend(selectedEmail.id)}
                    disabled={selectedEmail.status === 'Enviado ao ERP' || selectedEmail.status === 'Arquivado' || isSending || isCustomerMissing || hasPendingItems}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-lilas to-azul disabled:from-text-tertiary/20 disabled:to-text-tertiary/20 disabled:text-text-tertiary hover:opacity-90 font-bold text-white text-[12px] flex items-center justify-center gap-2 shadow-sm transition disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSending ? (
                      <RefreshCw className="animate-spin" size={16} />
                    ) : (
                      <Check size={15} />
                    )}
                    {selectedEmail.status === 'Enviado ao ERP' ? 'Integrado no ERP' : 'Enviar para o ERP'}
                  </button>
                )}

                {selectedEmail.status !== 'Arquivado' && (
                  <button
                    onClick={() => {
                      updateEmailStatus(selectedEmail.id, 'Arquivado', 'Conversa arquivada pelo operador.');
                      toast.success('Pedido arquivado com sucesso!');
                    }}
                    className="py-3 px-3 rounded-xl border border-border bg-white/60 hover:bg-white text-text-secondary hover:text-text-primary text-[12px] font-bold transition cursor-pointer"
                    title="Arquivar e-mail"
                  >
                    <Archive size={15} />
                  </button>
                )}

                <div className="relative group">
                  <button 
                    className="py-3 px-3 rounded-xl border border-border bg-white/60 hover:bg-white text-text-secondary hover:text-text-primary text-[12px] font-bold transition cursor-pointer"
                    title="Exportar dados"
                  >
                    <Download size={15} />
                  </button>
                  <div className="absolute right-0 bottom-full mb-2 bg-white rounded-xl border border-border shadow-lg p-1 space-y-1 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition duration-150 z-50 min-w-[100px]">
                    <button onClick={() => handleExport('json', selectedEmail)} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-black/5 text-[10px] font-bold text-text-primary flex items-center gap-1 cursor-pointer">
                      JSON
                    </button>
                    <button onClick={() => handleExport('xml', selectedEmail)} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-black/5 text-[10px] font-bold text-text-primary flex items-center gap-1 cursor-pointer">
                      XML
                    </button>
                    <button onClick={() => handleExport('csv', selectedEmail)} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-black/5 text-[10px] font-bold text-text-primary flex items-center gap-1 cursor-pointer">
                      CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 glass-panel rounded-2xl flex flex-col items-center justify-center p-8 text-center border border-border/40 bg-white/10">
            <div className="w-16 h-16 rounded-full bg-lilas/10 flex items-center justify-center text-lilas mb-4">
              <Inbox size={26} className="text-lilas" />
            </div>
            <h3 className="text-sm font-bold text-text-secondary">Nenhum e-mail selecionado</h3>
            <p className="text-[12px] text-text-tertiary max-w-[320px] mt-1.5 leading-relaxed">
              Escolha um e-mail de pedido na barra lateral para analisar o corpo do texto, resolver vínculos cadastrais de produtos/clientes ou autorizar o faturamento no ERP.
            </p>
          </div>
        )}
      </div>

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-[550px] glass-panel bg-white/95 rounded-2xl border border-border shadow-2xl p-6 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-lilas/10 flex items-center justify-center text-lilas">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Novo E-mail / Documento Recebido</h3>
                  <p className="text-[10px] text-text-tertiary">Simule a chegada de um novo e-mail para processamento automático da IA no Supabase</p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 text-text-secondary hover:text-text-primary transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-left">
              {/* Form Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-text-secondary">Nome do Remetente</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Magazine Luiza S/A" 
                    value={importSenderName}
                    onChange={(e) => setImportSenderName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white focus:outline-none focus:border-lilas font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-text-secondary">E-mail do Remetente</label>
                  <input 
                    type="email" 
                    placeholder="Ex: compras@magalu.com.br" 
                    value={importSenderEmail}
                    onChange={(e) => setImportSenderEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white focus:outline-none focus:border-lilas font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-text-secondary">Assunto do E-mail</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Novo Pedido de Reposição #4412" 
                    value={importSubject}
                    onChange={(e) => setImportSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white focus:outline-none focus:border-lilas font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-text-secondary">CNPJ Faturamento (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 47960950000121 (somente números)" 
                    value={importCnpj}
                    onChange={(e) => setImportCnpj(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white focus:outline-none focus:border-lilas font-mono font-medium"
                  />
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-1">
                <span className="font-bold text-text-secondary text-[11px] block">Modelos rápidos de teste:</span>
                <div className="flex gap-2 flex-wrap">
                  <button 
                    type="button"
                    onClick={() => {
                      setImportSenderName('Magazine Luiza S/A');
                      setImportSenderEmail('compras@magalu.com.br');
                      setImportSubject('NOVO PEDIDO #4412 - MAGALU');
                      setImportCnpj('47960950000121');
                      setImportBody(`Prezados,\n\nSegue pedido de reposição de itens de escritório:\n- 15x Resma de Papel A4 Chamex 75g 500 Folhas\n- 30x Caneta BIC azul\n\nAbraços,\nMarcos Souza`);
                    }}
                    className="px-2 py-1 rounded bg-black/5 hover:bg-black/10 text-[10px] font-bold text-text-secondary cursor-pointer"
                  >
                    Magalu (OK)
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setImportSenderName('Construtora Tenda S.A.');
                      setImportSenderEmail('suprimentos@tenda.com.br');
                      setImportSubject('SOLICITAÇÃO DE MATERIAIS PARA OBRA #990');
                      setImportCnpj('12345678000199'); // Not mapped client
                      setImportBody(`Olá, favor faturar os itens a seguir para a Construtora Tenda.\n- 50 un de Caderno Tilibra 10mat\n\nAtt,\nEngenharia Tenda`);
                    }}
                    className="px-2 py-1 rounded bg-black/5 hover:bg-black/10 text-[10px] font-bold text-text-secondary cursor-pointer"
                  >
                    Sem Cadastro (Review)
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setImportSenderName('Sandra Pires');
                      setImportSenderEmail('suprimentos@carrefour.com');
                      setImportSubject('Ordem de Compra OC-9988 - Carrefour');
                      setImportCnpj('45543915000181');
                      setImportBody(`Bom dia,\n\nSolicitamos os seguintes produtos:\n- 10 un de Item Totalmente Novo Sem SKU`);
                    }}
                    className="px-2 py-1 rounded bg-black/5 hover:bg-black/10 text-[10px] font-bold text-text-secondary cursor-pointer"
                  >
                    Item Sem SKU (Review)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-text-secondary">Corpo do E-mail (Lista de produtos / Texto livre)</label>
                <textarea 
                  rows={4}
                  placeholder={`Prezados,\nSolicitamos faturamento de:\n- 10 un de Resma de Papel A4 Chamex\n- 5 un de Grampeador de Mesa\n\nAtt, Compras`} 
                  value={importBody}
                  onChange={(e) => setImportBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white focus:outline-none focus:border-lilas font-medium min-h-[100px]"
                />
              </div>

              {/* Attachment selector */}
              <div className="space-y-1">
                <label className="font-bold text-text-secondary">Anexo do E-mail (PDF, Excel, HTML, CSV)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border/80 hover:border-lilas hover:bg-lilas/5 cursor-pointer text-text-secondary font-bold font-mono transition text-[11px] flex-1 justify-center">
                    <Upload size={14} className="text-lilas" />
                    <span>{importAttachmentName ? importAttachmentName : 'Selecionar Documento...'}</span>
                    <input 
                      type="file" 
                      accept=".pdf,.xlsx,.xls,.html,.htm,.csv,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {importAttachmentName && (
                    <button 
                      type="button"
                      onClick={() => setImportAttachmentName('')}
                      className="px-2.5 py-2 rounded-xl bg-black/5 hover:bg-black/10 text-[11px] font-bold text-error cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 border-border/40">
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 text-xs font-bold text-text-secondary cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  if (!importSenderName.trim() || !importSenderEmail.trim() || !importBody.trim()) {
                    toast.error('Preencha pelo menos o Remetente, E-mail e o Corpo do e-mail!');
                    return;
                  }

                  setIsParsingDoc(true);
                  // Artificial AI delay
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  
                  await receiveEmailWithDocument({
                    senderName: importSenderName,
                    senderEmail: importSenderEmail,
                    subject: importSubject || 'Nova Ordem de Compra Recebida',
                    rawBody: importBody,
                    cnpj: importCnpj || undefined,
                    attachmentName: importAttachmentName || undefined
                  });

                  setIsParsingDoc(false);
                  setIsImportModalOpen(false);
                }}
                disabled={isParsingDoc}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-lilas to-azul text-white font-bold text-xs hover:opacity-95 shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isParsingDoc ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>IA Processando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Processar com IA no Supabase</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailInbox;
