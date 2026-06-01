import React, { useState, useMemo } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { DeParaMapping, DeParaStatus, DeParaCliente, ErpCustomer } from '../types';
import { 
  ArrowLeftRight, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  Upload, 
  Brain,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  X,
  User,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';

export const DePara: React.FC = () => {
  const dePara = useFlowStore((state) => state.dePara);
  const deParaClientes = useFlowStore((state) => state.deParaClientes);
  const catalog = useFlowStore((state) => state.catalog);
  const erpCustomers = useFlowStore((state) => state.erpCustomers);
  const currentUser = useFlowStore((state) => state.currentUser);
  const companies = useFlowStore((state) => state.companies);

  const addDeParaMapping = useFlowStore((state) => state.addDeParaMapping);
  const updateDeParaMapping = useFlowStore((state) => state.updateDeParaMapping);
  const deleteDeParaMapping = useFlowStore((state) => state.deleteDeParaMapping);

  const addDeParaCliente = useFlowStore((state) => state.addDeParaCliente);
  const deleteDeParaCliente = useFlowStore((state) => state.deleteDeParaCliente);

  const activeCompanyCnpj = useMemo(() => {
    if (!currentUser) return '';
    const compId = currentUser.companyId;
    if (!compId) return '';
    const comp = companies.find(c => c.id === compId);
    return comp ? comp.cnpj.replace(/\D/g, '') : '';
  }, [currentUser, companies]);

  const [activeTab, setActiveTab] = useState<'produtos' | 'clientes'>('produtos');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [clientFilter, setClientFilter] = useState<string>('Todas');
  const [mappingTypeFilter, setMappingTypeFilter] = useState<string>('Todos');
  
  // Modals state for product De-Para
  const [isOpenProdForm, setIsOpenProdForm] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [incomingTerm, setIncomingTerm] = useState('');
  const [catalogCode, setCatalogCode] = useState('');
  const [prodStatus, setProdStatus] = useState<DeParaStatus>('Confirmado');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Extended product mapping states for modal
  const [selectedClientCnpj, setSelectedClientCnpj] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [mappingType, setMappingType] = useState<'Manual' | 'Automático'>('Manual');
  const [prodIsActive, setProdIsActive] = useState(true);

  // Suggestion logic
  const filteredCatalogSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return catalog.slice(0, 10);
    const query = searchQuery.toLowerCase();
    return catalog.filter(
      (p) => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)
    );
  }, [catalog, searchQuery]);

  // Modals state for client De-Para
  const [isOpenClientForm, setIsOpenClientForm] = useState(false);
  const [incomingCnpj, setIncomingCnpj] = useState('');
  const [incomingEmail, setIncomingEmail] = useState('');
  const [incomingName, setIncomingName] = useState('');
  const [erpCustomerCode, setErpCustomerCode] = useState('');

  // Active clients dropdown builder
  const activeClientsList = useMemo(() => {
    const clients = new Map<string, string>(); // CNPJ -> Name
    // Seed from registered companies
    companies.forEach(c => {
      clients.set(c.cnpj.replace(/\D/g, ''), c.name);
    });
    // Add from erp customers list
    erpCustomers.forEach(c => {
      clients.set(c.cnpj.replace(/\D/g, ''), c.razaoSocial);
    });
    // Add any others from mappings
    dePara.forEach(m => {
      if (m.clientCnpj && m.clientName) {
        clients.set(m.clientCnpj.replace(/\D/g, ''), m.clientName);
      }
    });
    return Array.from(clients.entries()).map(([cnpj, name]) => ({ cnpj, name }));
  }, [companies, erpCustomers, dePara]);

  // Filtered lists
  const filteredProducts = useMemo(() => {
    return dePara.filter(item => {
      const clientNameLower = (item.clientName || '').toLowerCase();
      const clientCnpjClean = (item.clientCnpj || '').replace(/\D/g, '');
      const searchLower = search.toLowerCase();
      
      const matchSearch = 
        item.incomingTerm.toLowerCase().includes(searchLower) ||
        item.catalogCode.toLowerCase().includes(searchLower) ||
        (item.description || '').toLowerCase().includes(searchLower) ||
        clientNameLower.includes(searchLower) ||
        clientCnpjClean.includes(searchLower);
      
      const matchStatus = statusFilter === 'Todos' || item.status === statusFilter;
      
      const matchClient = clientFilter === 'Todas' || clientCnpjClean === clientFilter;
      
      const matchMappingType = mappingTypeFilter === 'Todos' || (item.mappingType || 'Manual') === mappingTypeFilter;
      
      return matchSearch && matchStatus && matchClient && matchMappingType;
    });
  }, [dePara, search, statusFilter, clientFilter, mappingTypeFilter]);

  const filteredClients = useMemo(() => {
    return deParaClientes.filter(item => {
      if (activeCompanyCnpj) {
        const itemCnpj = (item.incomingCnpj || '').replace(/\D/g, '');
        if (itemCnpj && itemCnpj !== activeCompanyCnpj) {
          return false;
        }
      }
      
      const cnpjStr = item.incomingCnpj || '';
      const emailStr = item.incomingEmail || '';
      const matchSearch = 
        cnpjStr.toLowerCase().includes(search.toLowerCase()) ||
        emailStr.toLowerCase().includes(search.toLowerCase()) ||
        item.incomingName.toLowerCase().includes(search.toLowerCase()) ||
        item.erpCustomerCode.toLowerCase().includes(search.toLowerCase());
      
      const matchStatus = statusFilter === 'Todos' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [deParaClientes, search, statusFilter, activeCompanyCnpj]);

  const formatCNPJ = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length !== 14) return val;
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
  };

  const handleOpenProdAdd = () => {
    setEditingProdId(null);
    setIncomingTerm('');
    const firstCode = catalog[0]?.code || '';
    setCatalogCode(firstCode);
    const product = catalog[0];
    setSearchQuery(product ? `[${product.code}] ${product.name}` : '');
    setProdStatus('Confirmado');
    setShowSuggestions(false);
    
    // Reset extended fields
    setSelectedClientCnpj('');
    setSelectedClientName('');
    setProdDescription('');
    setMappingType('Manual');
    setProdIsActive(true);
    
    setIsOpenProdForm(true);
  };

  const handleOpenProdEdit = (mapping: DeParaMapping) => {
    setEditingProdId(mapping.id);
    setIncomingTerm(mapping.incomingTerm);
    setCatalogCode(mapping.catalogCode);
    const product = catalog.find(p => p.code === mapping.catalogCode);
    setSearchQuery(product ? `[${product.code}] ${product.name}` : mapping.catalogCode);
    setProdStatus(mapping.status);
    setShowSuggestions(false);
    
    // Set extended fields
    setSelectedClientCnpj(mapping.clientCnpj || '');
    setSelectedClientName(mapping.clientName || '');
    setProdDescription(mapping.description || '');
    setMappingType(mapping.mappingType || 'Manual');
    setProdIsActive(mapping.isActive !== false);
    
    setIsOpenProdForm(true);
  };

  const handleProdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomingTerm.trim()) {
      toast.error('O termo recebido é obrigatório.');
      return;
    }

    if (!catalogCode) {
      toast.error('Selecione um SKU correspondente no catálogo.');
      return;
    }

    let clientName = selectedClientName;
    if (selectedClientCnpj && !clientName) {
      const erpCust = erpCustomers.find(c => c.cnpj === selectedClientCnpj);
      const company = companies.find(c => c.cnpj === selectedClientCnpj);
      clientName = erpCust ? erpCust.razaoSocial : (company ? company.name : '');
    }

    const mappingData = {
      incomingTerm,
      catalogCode,
      status: prodStatus,
      confidence: prodStatus === 'Confirmado' ? 100 : 85,
      clientCnpj: selectedClientCnpj || undefined,
      clientName: clientName || undefined,
      description: prodDescription || undefined,
      mappingType,
      isActive: prodIsActive
    };

    if (editingProdId) {
      updateDeParaMapping(editingProdId, mappingData);
      toast.success('Mapeamento de produto atualizado!');
    } else {
      addDeParaMapping({
        id: Math.random().toString(36).substring(7),
        ...mappingData
      });
      toast.success('Novo mapeamento de produto cadastrado!');
    }
    setIsOpenProdForm(false);
  };

  const handleProdDelete = (id: string) => {
    if (confirm('Deseja excluir este mapeamento de produto?')) {
      deleteDeParaMapping(id);
      toast.success('Mapeamento removido.');
    }
  };

  const handleOpenClientAdd = () => {
    setIncomingCnpj('');
    setIncomingEmail('');
    setIncomingName('');
    setErpCustomerCode(erpCustomers[0]?.id || '');
    setIsOpenClientForm(true);
  };

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCnpj = incomingCnpj.replace(/\D/g, '');
    const cleanEmail = incomingEmail.trim();

    if (!cleanCnpj && !cleanEmail) {
      toast.error('Informe pelo menos um identificador: CNPJ do cliente ou E-mail do remetente.');
      return;
    }

    if (cleanCnpj && cleanCnpj.length !== 14) {
      toast.error('Se informado, o CNPJ deve conter exatamente 14 dígitos.');
      return;
    }

    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      toast.error('Informe um formato de e-mail de remetente válido.');
      return;
    }

    if (!incomingName.trim()) {
      toast.error('Informe o nome do cliente conforme chega no pedido.');
      return;
    }

    if (cleanCnpj && deParaClientes.some(c => c.incomingCnpj === cleanCnpj)) {
      toast.error('Este CNPJ já possui um mapeamento cadastrado.');
      return;
    }

    if (cleanEmail && deParaClientes.some(c => c.incomingEmail?.toLowerCase() === cleanEmail.toLowerCase())) {
      toast.error('Este E-mail já possui um mapeamento cadastrado.');
      return;
    }

    addDeParaCliente({
      id: `c-map-${Math.floor(1000 + Math.random() * 9000)}`,
      incomingCnpj: cleanCnpj || undefined,
      incomingEmail: cleanEmail || undefined,
      incomingName: incomingName,
      erpCustomerCode: erpCustomerCode,
      status: 'Confirmado'
    });
    toast.success('Novo mapeamento de cliente cadastrado!');
    setIsOpenClientForm(false);
  };

  const handleClientDelete = (id: string) => {
    if (confirm('Deseja excluir este mapeamento de cliente?')) {
      deleteDeParaCliente(id);
      toast.success('Mapeamento de cliente removido.');
    }
  };

  const handleExportCSV = () => {
    let csvContent = "";
    if (activeTab === 'produtos') {
      csvContent = "data:text/csv;charset=utf-8,Como chega no pedido,SKU Catalogo,Confianca,Status\n"
        + dePara.map(m => `"${m.incomingTerm}","${m.catalogCode}",${m.confidence},"${m.status}"`).join("\n");
    } else {
      csvContent = "data:text/csv;charset=utf-8,CNPJ Email,Email Origem,Nome Email,Codigo Cliente ERP,Status\n"
        + deParaClientes.map(c => `"${c.incomingCnpj || ''}","${c.incomingEmail || ''}","${c.incomingName}","${c.erpCustomerCode}","${c.status}"`).join("\n");
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", activeTab === 'produtos' ? "depara_produtos.csv" : "depara_clientes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Planilha exportada com sucesso!');
  };

  const handleImportCSV = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: 'Analisando planilha de mapeamento...',
        success: activeTab === 'produtos' 
          ? 'Novos SKUs alinhados com sucesso!' 
          : 'Novas chaves de CNPJ sincronizadas com ERP!',
        error: 'Erro ao carregar arquivo.'
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="text-lilas" size={20} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-text-primary font-bold">Mapeamentos Inteligentes De-Para</span>
            <span className="text-xs text-text-tertiary">Traduza termos e clientes informais para as chaves oficiais do ERP</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleImportCSV}
            className="px-3.5 py-2 rounded-xl border border-border bg-white/60 hover:bg-white text-text-secondary hover:text-text-primary text-[12px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload size={14} />
            <span>Importar planilha</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-border bg-white/60 hover:bg-white text-text-secondary hover:text-text-primary text-[12px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download size={14} />
            <span>Baixar modelo</span>
          </button>
          <button
            onClick={activeTab === 'produtos' ? handleOpenProdAdd : handleOpenClientAdd}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-lilas to-azul hover:opacity-90 text-white text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Plus size={14} />
            <span>{activeTab === 'produtos' ? 'Nova regra' : 'Novo Cliente'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border/40 gap-1 bg-white/20 p-1.5 rounded-xl border max-w-md">
        <button
          onClick={() => { setActiveTab('produtos'); setSearch(''); }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'produtos'
              ? 'bg-white text-lilas shadow-sm border border-border'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/40'
          }`}
        >
          <ShoppingBag size={14} />
          Mapeamento de Produtos
        </button>
        <button
          onClick={() => { setActiveTab('clientes'); setSearch(''); }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'clientes'
              ? 'bg-white text-lilas shadow-sm border border-border'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/40'
          }`}
        >
          <User size={14} />
          Mapeamento de Clientes
        </button>
      </div>

      {/* Main Glass Panel */}
      <div className="glass-panel rounded-2xl flex flex-col overflow-hidden">
        {/* Search header */}
        <div className="p-4 border-b border-border/40 bg-white/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 text-text-tertiary w-4 h-4" />
              <input
                type="text"
                placeholder={activeTab === 'produtos' ? "Buscar por código ou cliente" : "Buscar CNPJ ou razão"}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/60 bg-white/60 focus:outline-none focus:border-lilas text-xs font-semibold placeholder:text-text-tertiary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {activeTab === 'produtos' && (
              <>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-border/60 bg-white/60 focus:outline-none focus:border-lilas text-xs font-semibold text-text-secondary cursor-pointer"
                >
                  <option value="Todas">Todos os clientes</option>
                  {activeClientsList.map((c) => (
                    <option key={c.cnpj} value={c.cnpj}>
                      {c.name} ({formatCNPJ(c.cnpj)})
                    </option>
                  ))}
                </select>

                <select
                  value={mappingTypeFilter}
                  onChange={(e) => setMappingTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-border/60 bg-white/60 focus:outline-none focus:border-lilas text-xs font-semibold text-text-secondary cursor-pointer"
                >
                  <option value="Todos">Todos os mapeamentos</option>
                  <option value="Manual">Manual</option>
                  <option value="Automático">Automático</option>
                </select>
              </>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {['Todos', 'Confirmado', 'Sugerido pela IA', 'Pendente'].map((filter) => {
              if (activeTab === 'clientes' && (filter === 'Sugerido pela IA' || filter === 'Pendente')) return null;
              return (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-lilas text-white border-lilas'
                      : 'bg-white/60 text-text-secondary border-border/60 hover:bg-white hover:text-text-primary'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Products Table */}
        {activeTab === 'produtos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/25 bg-black/[0.01] text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="py-3 px-5">CLIENTE</th>
                  <th className="py-3 px-5">CÓDIGO ORIGEM</th>
                  <th className="py-3 px-1 text-center w-8"></th>
                  <th className="py-3 px-5">CÓDIGO ERP</th>
                  <th className="py-3 px-5">DESCRIÇÃO</th>
                  <th className="py-3 px-5">MAPEAMENTO</th>
                  <th className="py-3 px-5">STATUS</th>
                  <th className="py-3 px-5 text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-[12px]">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-tertiary font-semibold">
                      Nenhum mapeamento de produto cadastrado.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((mapping) => {
                    const isItemActive = mapping.isActive !== false;
                    return (
                      <tr key={mapping.id} className="hover:bg-white/40 transition">
                        {/* CLIENTE */}
                        <td className="py-3.5 px-5">
                          {mapping.clientName || mapping.clientCnpj ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-text-primary leading-tight">
                                {mapping.clientName || '-'}
                              </span>
                              <span className="text-[10px] text-text-tertiary font-mono mt-0.5">
                                {mapping.clientCnpj ? formatCNPJ(mapping.clientCnpj) : '-'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-text-tertiary font-medium font-bold">-</span>
                          )}
                        </td>

                        {/* CÓDIGO ORIGEM */}
                        <td className="py-3.5 px-5 font-bold text-text-primary">
                          <span className="font-mono bg-black/5 px-2 py-1 rounded text-[11px] text-text-primary border border-border/10 font-bold">
                            {mapping.incomingTerm}
                          </span>
                        </td>

                        {/* Arrows exchange column */}
                        <td className="py-3.5 px-1 text-center text-text-tertiary">
                          <ArrowLeftRight size={12} className="opacity-60 inline" />
                        </td>

                        {/* CÓDIGO ERP */}
                        <td className="py-3.5 px-5">
                          <span className="font-mono bg-lilas/5 text-lilas px-2 py-1 rounded text-[11px] font-bold border border-lilas/10">
                            {mapping.catalogCode}
                          </span>
                        </td>

                        {/* DESCRIÇÃO */}
                        <td className="py-3.5 px-5 text-text-secondary font-semibold max-w-[180px] truncate">
                          {mapping.description || <span className="text-text-tertiary">-</span>}
                        </td>

                        {/* MAPEAMENTO */}
                        <td className="py-3.5 px-5">
                          {mapping.mappingType === 'Automático' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-azul/10 text-azul border border-azul/20">
                              <Brain size={10} />
                              <span>Automático</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <span>Manual</span>
                            </span>
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isItemActive ? 'bg-success/10 text-success border border-success/20' : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isItemActive ? 'bg-success animate-pulse' : 'bg-slate-400'}`} />
                            <span>{isItemActive ? 'Ativa' : 'Desativa'}</span>
                          </span>
                        </td>

                        {/* AÇÕES */}
                        <td className="py-3.5 px-5 text-right space-x-3 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenProdEdit(mapping)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-text-secondary hover:text-lilas transition cursor-pointer"
                          >
                            <Edit2 size={11} />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => {
                              updateDeParaMapping(mapping.id, { isActive: !isItemActive });
                              toast.success(isItemActive ? 'Regra desativada com sucesso.' : 'Regra ativada com sucesso.');
                            }}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold transition cursor-pointer ${
                              isItemActive ? 'text-text-secondary hover:text-warning' : 'text-text-secondary hover:text-success'
                            }`}
                          >
                            <X size={11} />
                            <span>{isItemActive ? 'Desativar' : 'Ativar'}</span>
                          </button>
                          <button
                            onClick={() => handleProdDelete(mapping.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-error/80 hover:text-error transition cursor-pointer"
                          >
                            <Trash2 size={11} />
                            <span>Remover</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Customers Table */}
        {activeTab === 'clientes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/25 bg-black/[0.01] text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="py-3 px-5">CNPJ no Pedido</th>
                  <th className="py-3 px-5">E-mail de Origem</th>
                  <th className="py-3 px-5">Identificação no E-mail</th>
                  <th className="py-3 px-5">Vínculo ERP (Cliente)</th>
                  <th className="py-3 px-5">Código Cliente ERP</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-[12px]">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-tertiary">
                      Nenhum mapeamento de cliente cadastrado.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const resolvedCustomer = erpCustomers.find(c => c.id === client.erpCustomerCode);
                    return (
                      <tr key={client.id} className="hover:bg-white/40 transition">
                        <td className="py-3.5 px-5 font-mono font-bold text-text-primary">
                          {client.incomingCnpj ? formatCNPJ(client.incomingCnpj) : <span className="text-text-tertiary font-sans font-normal">-</span>}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-text-secondary">
                          {client.incomingEmail || <span className="text-text-tertiary">-</span>}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-text-secondary">{client.incomingName}</td>
                        <td className="py-3.5 px-5 font-bold text-text-primary">
                          {resolvedCustomer?.razaoSocial || 'Cliente não cadastrado no ERP'}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-[11px] font-semibold text-text-secondary">
                          {client.erpCustomerCode}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold bg-success/10 text-success border-success/20">
                            Confirmado
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => handleClientDelete(client.id)}
                            className="p-1.5 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {isOpenProdForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-filter backdrop-blur-md rounded-2xl border border-border max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <h3 className="text-sm font-bold text-text-primary">
                {editingProdId ? 'Editar regra de produto' : 'Nova regra de produto'}
              </h3>
              <button onClick={() => setIsOpenProdForm(false)} className="p-1 rounded-lg hover:bg-black/5 text-text-secondary cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleProdSubmit} className="space-y-4">
              {/* Cliente */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Cliente Vinculado (Opcional)</label>
                <select
                  className="p-2.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary cursor-pointer"
                  value={selectedClientCnpj}
                  onChange={(e) => {
                    const cnpj = e.target.value;
                    setSelectedClientCnpj(cnpj);
                    const match = activeClientsList.find(c => c.cnpj === cnpj);
                    setSelectedClientName(match ? match.name : '');
                  }}
                >
                  <option value="">Global / Todos os clientes</option>
                  {activeClientsList.map((c) => (
                    <option key={c.cnpj} value={c.cnpj}>
                      {c.name} ({formatCNPJ(c.cnpj)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Código Origem */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Código / Nome que chega no Pedido (Origem)</label>
                <input
                  type="text"
                  placeholder="e.g. CAM-POLO-AZ-M, Caneta BIC azul"
                  className="p-2.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                  value={incomingTerm}
                  onChange={(e) => setIncomingTerm(e.target.value)}
                />
              </div>

              {/* SKU Correspondente */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-[11px] font-bold text-text-secondary">Código ERP (SKU Correspondente)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar SKU ou nome do produto..."
                    className="w-full p-2.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {showSuggestions && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-border shadow-xl max-h-[140px] overflow-y-auto z-50 p-1 divide-y divide-border/10">
                      {filteredCatalogSuggestions.length === 0 ? (
                        <div className="p-2 text-center text-[10px] text-text-tertiary font-medium">Nenhum produto correspondente</div>
                      ) : (
                        filteredCatalogSuggestions.map((product) => {
                          const isSelected = product.code === catalogCode;
                          return (
                            <button
                              key={product.code}
                              type="button"
                              onClick={() => {
                                setCatalogCode(product.code);
                                setSearchQuery(`[${product.code}] ${product.name}`);
                                setShowSuggestions(false);
                              }}
                              className={`w-full text-left p-2 hover:bg-black/5 flex flex-col rounded-lg transition-colors cursor-pointer ${
                                isSelected ? 'bg-lilas/5 text-lilas' : ''
                              }`}
                            >
                              <span className="text-[11px] font-bold text-text-primary truncate">
                                {product.name}
                              </span>
                              <span className="text-[9px] font-mono text-text-tertiary mt-0.5">
                                SKU: {product.code} | R$ {product.price.toFixed(2)}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                {catalogCode && (
                  <div className="mt-1.5 p-2 bg-lilas/5 border border-lilas/10 rounded-lg flex items-center justify-between text-[10px] text-lilas font-bold">
                    <span>Selecionado: {catalogCode}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogCode('');
                        setSearchQuery('');
                        setShowSuggestions(true);
                      }}
                      className="hover:text-error cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>

              {/* Descrição */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Descrição do Produto (Opcional)</label>
                <input
                  type="text"
                  placeholder="e.g. Camiseta Polo Masculina cor Azul tamanho M"
                  className="p-2.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                />
              </div>

              {/* Tipo de Mapeamento */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Tipo de Mapeamento</label>
                <select
                  className="p-2.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary cursor-pointer"
                  value={mappingType}
                  onChange={(e) => setMappingType(e.target.value as any)}
                >
                  <option value="Manual">Manual</option>
                  <option value="Automático">Automático</option>
                </select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Status da Regra</label>
                <select
                  className="p-2.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary cursor-pointer"
                  value={prodIsActive ? 'Ativa' : 'Inativa'}
                  onChange={(e) => setProdIsActive(e.target.value === 'Ativa')}
                >
                  <option value="Ativa">Ativa</option>
                  <option value="Inativa">Inativa</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenProdForm(false)}
                  className="px-4 py-2 border border-border bg-white rounded-xl text-xs font-bold text-text-secondary cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-lilas to-azul text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95 cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Form Modal */}
      {isOpenClientForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-filter backdrop-blur-md rounded-2xl border border-border max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <h3 className="text-sm font-bold text-text-primary">Novo Mapeamento de Cliente</h3>
              <button onClick={() => setIsOpenClientForm(false)} className="p-1 rounded-lg hover:bg-black/5 text-text-secondary cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleClientSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">CNPJ que vem no E-mail (Opcional - Apenas Números)</label>
                <input
                  type="text"
                  maxLength={14}
                  placeholder="e.g. 12345678000199"
                  className="p-2.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary font-mono"
                  value={incomingCnpj}
                  onChange={(e) => setIncomingCnpj(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">E-mail do Remetente (Opcional - Mapeamento por E-mail)</label>
                <input
                  type="text"
                  placeholder="e.g. compras@cliente.com.br"
                  className="p-2.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                  value={incomingEmail}
                  onChange={(e) => setIncomingEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Nome / Identificação do Cliente no E-mail (Ex: MAGALU)</label>
                <input
                  type="text"
                  placeholder="e.g. MAGALU, Distribuidora Silva"
                  className="p-2.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                  value={incomingName}
                  onChange={(e) => setIncomingName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Vincular ao Cadastro Oficial do ERP</label>
                <select
                  className="p-2.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary cursor-pointer"
                  value={erpCustomerCode}
                  onChange={(e) => setErpCustomerCode(e.target.value)}
                >
                  {erpCustomers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      [{cust.id}] {cust.razaoSocial} (CNPJ: {formatCNPJ(cust.cnpj)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenClientForm(false)}
                  className="px-4 py-2 border border-border bg-white rounded-xl text-xs font-bold text-text-secondary cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-lilas to-azul text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95 cursor-pointer"
                >
                  Salvar Vínculo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DePara;
