import React, { useState, useMemo } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { EmailOrderData, EmailStatus } from '../types';
import { 
  FileSpreadsheet, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Download, 
  FileText, 
  Check, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

export const OrderProcessing: React.FC = () => {
  const emailsRaw = useFlowStore((state) => state.emails);
  const currentUser = useFlowStore((state) => state.currentUser);
  const companies = useFlowStore((state) => state.companies);

  const getPhoneNumber = (email: string) => {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    const number = Math.abs(hash).toString().substring(0, 9).padStart(9, '0');
    const ddd = ['11', '21', '31', '41', '51', '61', '71', '81', '85'][Math.abs(hash) % 9];
    return `+55 (${ddd}) 9${number.substring(1, 5)}-${number.substring(5)}`;
  };
  const deParaClientes = useFlowStore((state) => state.deParaClientes);
  const erpCustomers = useFlowStore((state) => state.erpCustomers);
  const getActiveEmails = useFlowStore((state) => state.getActiveEmails);

  const emails = React.useMemo(() => {
    return getActiveEmails();
  }, [emailsRaw, currentUser, companies, deParaClientes, erpCustomers, getActiveEmails]);

  const sendEmailToErp = useFlowStore((state) => state.sendEmailToErp);
  const sendBulkToErp = useFlowStore((state) => state.sendBulkToErp);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmailStatus | 'Todos'>('Todos');
  const [datePreset, setDatePreset] = useState<string>('Todos');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Helper to parse dates like "DD/MM/YYYY HH:MM:SS"
  const parseDate = (dateStr: string) => {
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length !== 3) return new Date();
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  };

  // Row expansion mapping (emailId -> boolean)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  
  // Checked row IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  
  // Single order sending loader mapping (emailId -> boolean)
  const [sendingStates, setSendingStates] = useState<Record<string, boolean>>({});

  // Active tab inside expanded detail row ('items' | 'logs')
  const [activeDetailsTab, setActiveDetailsTab] = useState<Record<string, 'items' | 'logs'>>({});

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle row selection checkbox
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return emails.filter(order => {
      const matchesSearch = 
        order.senderName.toLowerCase().includes(search.toLowerCase()) ||
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        (order.extractedFields.codigo_pedido && order.extractedFields.codigo_pedido.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === 'Todos' || order.status === statusFilter;

      // Date filtering
      let matchesDate = true;
      if (datePreset !== 'Todos') {
        const orderDate = parseDate(order.receivedAt);
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        if (datePreset === 'Hoje') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);
          if (orderDate < startOfToday || orderDate > endOfToday) {
            matchesDate = false;
          }
        } else if (datePreset === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          sevenDaysAgo.setHours(0, 0, 0, 0);
          if (orderDate < sevenDaysAgo) {
            matchesDate = false;
          }
        } else if (datePreset === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          thirtyDaysAgo.setHours(0, 0, 0, 0);
          if (orderDate < thirtyDaysAgo) {
            matchesDate = false;
          }
        } else if (datePreset === 'custom') {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (orderDate < start) matchesDate = false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (orderDate > end) matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [emails, search, statusFilter, datePreset, startDate, endDate]);

  // Toggle select all
  const toggleSelectAll = (checked: boolean) => {
    const nextSelected: Record<string, boolean> = {};
    if (checked) {
      filteredOrders.forEach(order => {
        nextSelected[order.id] = true;
      });
    }
    setSelectedIds(nextSelected);
  };

  // Check if all filtered rows are selected
  const isAllSelected = useMemo(() => {
    if (filteredOrders.length === 0) return false;
    return filteredOrders.every(order => selectedIds[order.id]);
  }, [filteredOrders, selectedIds]);

  // Count checked items
  const selectedCount = useMemo(() => {
    return Object.values(selectedIds).filter(Boolean).length;
  }, [selectedIds]);

  const handleSendSingle = async (emailId: string) => {
    setSendingStates(prev => ({ ...prev, [emailId]: true }));
    const res = await sendEmailToErp(emailId);
    setSendingStates(prev => ({ ...prev, [emailId]: false }));

    if (res) {
      toast.success('Pedido integrado com sucesso!');
    } else {
      toast.error('Erro de validação ou conexões ativas.');
    }
  };

  const handleBulkSend = async () => {
    const idsToSend = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (idsToSend.length === 0) return;

    // Filter out already sent
    const pendingIds = idsToSend.filter(id => {
      const order = emails.find(e => e.id === id);
      return order && order.status !== 'Enviado ao ERP';
    });

    if (pendingIds.length === 0) {
      toast.info('Todos os pedidos selecionados já foram enviados ao ERP.');
      return;
    }

    const loader = toast.loading(`Integrando ${pendingIds.length} pedidos no ERP...`);
    
    // Trigger bulk execution from store
    const { success, failed } = await sendBulkToErp(pendingIds);
    
    toast.dismiss(loader);
    toast.success('Processamento em lote concluído!', {
      description: `${success} integrados com sucesso. ${failed} falhas registradas.`
    });
    
    // Clear selection
    setSelectedIds({});
  };

  const handleDownload = (type: 'csv' | 'xml' | 'json' | 'pdf', order: EmailOrderData) => {
    const code = order.extractedFields.codigo_pedido || order.id;
    let dataStr = "";
    
    if (type === 'json') {
      dataStr = JSON.stringify(order, null, 2);
    } else if (type === 'xml') {
      dataStr = `<?xml version="1.0" encoding="UTF-8"?>\n<pedido>\n  <id>${order.id}</id>\n  <codigo_erp>${code}</codigo_erp>\n  <cliente>${order.senderName}</cliente>\n</pedido>`;
    } else if (type === 'csv') {
      dataStr = `Item,Codigo SKU,Descricao,Quantidade,Preco Unitario,Total\n` + 
        order.items.map((it, idx) => `${idx+1},"${it.catalogCode}","${it.catalogName}",${it.quantity},${it.unitPrice},${it.totalPrice}`).join('\n');
    } else {
      // PDF Mock
      dataStr = `========================================================\n` +
                `               SOFTEUM FLOW - RESUMO DE PEDIDO           \n` +
                `========================================================\n` +
                `ID Transação: ${order.id}\n` +
                `Código ERP: ${code}\n` +
                `Cliente: ${order.extractedFields.cliente_razao || order.senderName}\n` +
                `CNPJ: ${order.extractedFields.cliente_cnpj || 'Não Informado'}\n` +
                `Data: ${order.receivedAt}\n` +
                `--------------------------------------------------------\n` +
                `ITENS:\n` +
                order.items.map(it => `- [${it.catalogCode}] ${it.catalogName}\n  Qtd: ${it.quantity} ${it.unit} | Unit: R$ ${it.unitPrice} | Total: R$ ${it.totalPrice}`).join('\n\n') + '\n' +
                `--------------------------------------------------------\n` +
                `VALOR TOTAL: R$ ${order.items.reduce((acc, curr) => acc + curr.totalPrice, 0).toFixed(2)}\n` +
                `========================================================`;
    }

    const blob = new Blob([dataStr], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `resumo-pedido-${code}.${type === 'pdf' ? 'txt' : type}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Download de ${type.toUpperCase()} iniciado!`);
  };

  const getStatusBadge = (s: EmailStatus) => {
    switch (s) {
      case 'Aguardando': return 'bg-azul/10 text-azul border-azul/25';
      case 'Processando': return 'bg-lilas/10 text-lilas border-lilas/25 animate-pulse';
      case 'Enviado ao ERP': return 'bg-success/10 text-success border-success/25';
      case 'Erro': return 'bg-error/10 text-error border-error/25';
      case 'Revisão Manual': return 'bg-warning/10 text-warning border-warning/25';
      case 'E-mail Geral': return 'bg-text-tertiary/10 text-text-secondary border-border/25';
      case 'Arquivado': return 'bg-black/5 text-text-tertiary border-border/25';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="text-lilas" size={20} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-text-primary">Fila de Pedidos Processados</span>
            <span className="text-xs text-text-tertiary">Histórico completo de extrações, integrações e erros de ERP</span>
          </div>
        </div>

        {/* Bulk Action Panel (Sticky top trigger) */}
        {selectedCount > 0 && (
          <div className="bg-gradient-to-r from-lilas/20 to-azul/20 border border-lilas/30 px-4 py-2 rounded-xl flex items-center gap-4 animate-fadeIn">
            <span className="text-xs font-bold text-text-primary">
              {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkSend}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-lilas to-azul text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition"
              >
                <Layers size={13} />
                Enviar ao ERP
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid List wrapper */}
      <div className="glass-panel rounded-2xl flex flex-col overflow-hidden">
        {/* Filters Header bar */}
        <div className="p-4 border-b border-border/40 bg-white/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 text-text-tertiary w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por cliente, pedido..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/60 bg-white/60 focus:outline-none focus:border-lilas text-xs font-semibold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-text-secondary">Filtrar Período:</span>
              <select
                className="p-1.5 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-[11px] font-semibold"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
              >
                <option value="Todos">Todo o Período</option>
                <option value="Hoje">Hoje</option>
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
                <option value="custom">Customizado</option>
              </select>
            </div>

            {/* Custom Dates Inputs */}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2 animate-fadeIn">
                <input
                  type="date"
                  className="p-1 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-[10px] font-semibold"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-[10px] text-text-tertiary">até</span>
                <input
                  type="date"
                  className="p-1 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-[10px] font-semibold"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-text-secondary">Filtrar Status:</span>
              <select
                className="p-1.5 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-[11px] font-semibold"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as EmailStatus | 'Todos')}
              >
                {['Todos', 'Aguardando', 'Processando', 'Enviado ao ERP', 'Revisão Manual', 'Erro'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/25 bg-black/[0.01] text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-border text-lilas focus:ring-lilas cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-8"></th>
                <th className="py-3 px-4">Pedido ID</th>
                <th className="py-3 px-4">Cliente (Comprador)</th>
                <th className="py-3 px-4">ERP Alvo</th>
                <th className="py-3 px-4">Recebido em</th>
                <th className="py-3 px-4">Valor Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-text-tertiary">
                    Nenhum pedido processado atende a estes filtros.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isExpanded = !!expandedRows[order.id];
                  const isChecked = !!selectedIds[order.id];
                  const isSending = !!sendingStates[order.id];
                  const orderCode = order.extractedFields.codigo_pedido || order.id;
                  const orderTotal = order.items.reduce((acc, curr) => acc + curr.totalPrice, 0);

                  return (
                    <React.Fragment key={order.id}>
                      {/* Main Table Row */}
                      <tr className={`hover:bg-white/40 border-b border-border/10 transition ${isExpanded ? 'bg-white/30' : ''}`}>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(order.id)}
                            className="rounded border-border text-lilas focus:ring-lilas cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => toggleRow(order.id)}
                            className="p-1 rounded-md hover:bg-black/5 text-text-secondary"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] font-bold text-text-secondary">
                          {orderCode}
                        </td>
                        <td className="py-3 px-4 font-bold text-text-primary">
                          <div className="flex flex-col">
                            <span>{order.extractedFields.cliente_razao || order.senderName}</span>
                            <span className="text-[9px] text-text-tertiary font-mono font-medium mt-0.5">{getPhoneNumber(order.senderEmail)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-text-secondary">{order.erpTarget}</td>
                        <td className="py-3 px-4 text-text-secondary">{order.receivedAt}</td>
                        <td className="py-3 px-4 font-bold text-lilas">
                          R$ {orderTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSendSingle(order.id)}
                            disabled={order.status === 'Enviado ao ERP' || isSending}
                            className="p-1.5 rounded-lg bg-gradient-to-r from-lilas to-azul hover:opacity-90 disabled:bg-none disabled:bg-black/5 text-white disabled:text-text-tertiary/60 transition inline-flex items-center justify-center"
                            title="Enviar ao ERP"
                          >
                            {isSending ? <RefreshCw className="animate-spin" size={13} /> : <Send size={13} />}
                          </button>

                          {/* Export tools */}
                          <div className="relative inline-block group">
                            <button className="p-1.5 rounded-lg border border-border bg-white hover:bg-black/5 text-text-secondary transition">
                              <Download size={13} />
                            </button>
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-border shadow-lg p-1 space-y-1 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition duration-150 z-50 min-w-[140px] text-left">
                              <button onClick={() => handleDownload('json', order)} className="w-full text-left px-2.5 py-1.5 rounded hover:bg-black/5 text-[10px] font-semibold text-text-primary flex items-center gap-1">
                                <ExternalLink size={10} /> JSON
                              </button>
                              <button onClick={() => handleDownload('xml', order)} className="w-full text-left px-2.5 py-1.5 rounded hover:bg-black/5 text-[10px] font-semibold text-text-primary flex items-center gap-1">
                                <ExternalLink size={10} /> XML
                              </button>
                              <button onClick={() => handleDownload('csv', order)} className="w-full text-left px-2.5 py-1.5 rounded hover:bg-black/5 text-[10px] font-semibold text-text-primary flex items-center gap-1">
                                <ExternalLink size={10} /> CSV
                              </button>
                              <button onClick={() => handleDownload('pdf', order)} className="w-full text-left px-2.5 py-1.5 rounded hover:bg-black/5 text-[10px] font-semibold text-text-primary flex items-center gap-1">
                                <FileText size={10} /> PDF (TXT Summary)
                              </button>
                              <button disabled className="w-full text-left px-2.5 py-1.5 rounded text-[10px] font-semibold text-text-tertiary cursor-not-allowed flex items-center justify-between">
                                <span>EDIFACT</span>
                                <span className="text-[8px] bg-black/5 px-1 py-0.5 rounded text-text-tertiary shrink-0">em breve</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Items Details Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="py-3 px-6 bg-black/[0.02]">
                            <div className="border border-border/50 rounded-xl overflow-hidden bg-white/60">
                              <div className="flex border-b border-border/30 bg-black/[0.01] items-center justify-between px-4">
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveDetailsTab(prev => ({ ...prev, [order.id]: 'items' }))}
                                    className={`py-2 px-3 text-[11px] font-bold border-b-2 transition ${
                                      (activeDetailsTab[order.id] || 'items') === 'items'
                                        ? 'border-lilas text-lilas'
                                        : 'border-transparent text-text-secondary hover:text-text-primary'
                                    }`}
                                  >
                                    Lista de Itens do Pedido ({order.items.length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveDetailsTab(prev => ({ ...prev, [order.id]: 'logs' }))}
                                    className={`py-2 px-3 text-[11px] font-bold border-b-2 transition flex items-center gap-1.5 ${
                                      activeDetailsTab[order.id] === 'logs'
                                        ? 'border-lilas text-lilas'
                                        : 'border-transparent text-text-secondary hover:text-text-primary'
                                    }`}
                                  >
                                    Logs de Comunicação API
                                  </button>
                                </div>
                                {order.errorMessage && (
                                  <span className="text-[10px] text-error flex items-center gap-1 font-semibold">
                                    <AlertTriangle size={12} /> {order.errorMessage}
                                  </span>
                                )}
                              </div>

                              {(activeDetailsTab[order.id] || 'items') === 'items' && (
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="border-b border-border/20 bg-black/[0.01] text-text-secondary font-bold">
                                      <th className="py-2 px-4">Código SKU</th>
                                      <th className="py-2 px-4">Nome do SKU</th>
                                      <th className="py-2 px-4 text-center">Quantidade</th>
                                      <th className="py-2 px-4">Preço Unit.</th>
                                      <th className="py-2 px-4 text-right">Preço Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/10">
                                    {order.items.map((item, index) => (
                                      <tr key={index} className="text-text-primary font-medium hover:bg-white/60">
                                        <td className="py-2 px-4 font-mono text-[10px] text-text-secondary">{item.catalogCode}</td>
                                        <td className="py-2 px-4">{item.catalogName}</td>
                                        <td className="py-2 px-4 text-center">{item.quantity} {item.unit}</td>
                                        <td className="py-2 px-4">R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td className="py-2 px-4 text-right font-bold text-lilas">R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {activeDetailsTab[order.id] === 'logs' && (
                                <div className="p-4 space-y-4 text-xs">
                                  {order.status === 'Enviado ao ERP' && order.erpPayloadSent ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Payload Sent */}
                                      <div className="space-y-1.5">
                                        <span className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                          HTTP POST Payload (JSON enviado ao ERP)
                                        </span>
                                        <pre className="p-3 bg-slate-900/90 text-success-light font-mono text-[10px] rounded-lg overflow-x-auto max-h-[220px] border border-slate-800 leading-normal">
                                          {order.erpPayloadSent}
                                        </pre>
                                      </div>

                                      {/* Response Received */}
                                      <div className="space-y-1.5">
                                        <span className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                          HTTP Response (Retorno do Servidor ERP)
                                        </span>
                                        <pre className="p-3 bg-slate-900/90 text-azul font-mono text-[10px] rounded-lg overflow-x-auto max-h-[220px] border border-slate-800 leading-normal">
                                          {order.erpResponseLog}
                                        </pre>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center text-text-tertiary gap-2">
                                      <RefreshCw size={20} className="animate-spin text-lilas" />
                                      <div className="space-y-0.5">
                                        <p className="text-[11px] font-bold text-text-secondary">Telemetria de Integração Inexistente</p>
                                        <p className="text-[10px]">
                                          {order.status === 'Processando'
                                            ? 'O pedido está sendo integrado no ERP. Aguarde a conclusão.'
                                            : 'Integre este pedido para registrar o payload JSON enviado ao endpoint e a resposta HTTP.'}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default OrderProcessing;
