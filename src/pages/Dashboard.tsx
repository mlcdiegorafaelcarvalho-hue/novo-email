import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFlowStore } from '../store/useFlowStore';
import { EmailStatus } from '../types';
import { 
  TrendingUp, 
  Mail, 
  MessageSquare,
  Phone,
  Send, 
  AlertCircle, 
  Clock, 
  Database, 
  Brain,
  Filter,
  Calendar,
  Sparkles,
  ChevronRight,
  DollarSign,
  Cpu,
  Search,
  Maximize2,
  X
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#B49BD4', '#8FB8E8', '#E8A5C4', '#4CAF91', '#FFA726'];

export const Dashboard: React.FC = () => {
  const emailsRaw = useFlowStore((state) => state.emails);
  const currentUser = useFlowStore((state) => state.currentUser);
  const companies = useFlowStore((state) => state.companies);
  const deParaClientes = useFlowStore((state) => state.deParaClientes);
  const erpCustomers = useFlowStore((state) => state.erpCustomers);
  const getActiveEmails = useFlowStore((state) => state.getActiveEmails);

  const emails = React.useMemo(() => {
    return getActiveEmails();
  }, [emailsRaw, currentUser, companies, deParaClientes, erpCustomers, getActiveEmails]);

  const catalog = useFlowStore((state) => state.catalog);
  const emailConnection = useFlowStore((state) => state.emailConnection);
  const settings = useFlowStore((state) => state.settings);

  // Filters State
  const [selectedCompany, setSelectedCompany] = useState<string>('Todas');
  const [companySearch, setCompanySearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [datePreset, setDatePreset] = useState<string>('month'); // 'month', '7days', '30days', 'all', 'custom'
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [showChurnModal, setShowChurnModal] = useState(false);

  // Helper to parse dates
  const parseDate = (dateStr: string) => {
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length !== 3) return new Date();
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  };



  // Unique companies list for suggestions
  const companiesList = useMemo(() => {
    const names = new Set<string>();
    emails.forEach(e => {
      const name = e.extractedFields.cliente_razao || e.senderName;
      if (name) names.add(name);
    });
    return Array.from(names);
  }, [emails]);

  // Filter suggestions list by name or CNPJ query
  const filteredSuggestions = useMemo(() => {
    const query = companySearch.toLowerCase();
    const allOptions = ['Todas as Empresas', ...companiesList];

    return allOptions.filter(compName => {
      if (compName === 'Todas as Empresas') {
        return 'todas as empresas'.includes(query) || query === '';
      }
      
      const hasNameMatch = compName.toLowerCase().includes(query);
      
      // CNPJ lookup for this company
      const matchingEmail = emails.find(e => {
        const name = e.extractedFields.cliente_razao || e.senderName;
        return name === compName;
      });
      const cnpj = matchingEmail?.extractedFields.cliente_cnpj || '';
      const hasCnpjMatch = cnpj.includes(query);
      
      return hasNameMatch || hasCnpjMatch;
    }).slice(0, 6);
  }, [companiesList, companySearch, emails]);

  // Filtered emails based on company & date range selection
  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      // Company check
      const compName = email.extractedFields.cliente_razao || email.senderName;
      if (selectedCompany !== 'Todas' && compName !== selectedCompany) {
        return false;
      }

      // Date range check
      const date = parseDate(email.receivedAt);
      const now = new Date();
      if (datePreset === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        if (date < sevenDaysAgo) return false;
      } else if (datePreset === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        if (date < thirtyDaysAgo) return false;
      } else if (datePreset === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        if (date < startOfMonth) return false;
      } else if (datePreset === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (date < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (date > end) return false;
        }
      }
      return true;
    });
  }, [emails, selectedCompany, datePreset, startDate, endDate]);

  // Compute metrics in real-time based on filters
  const stats = useMemo(() => {
    const total = filteredEmails.length;
    const sent = filteredEmails.filter(e => e.status === 'Enviado ao ERP').length;
    const error = filteredEmails.filter(e => e.status === 'Erro').length;
    const processing = filteredEmails.filter(e => e.status === 'Processando' || e.status === 'Aguardando').length;
    const manual = filteredEmails.filter(e => e.status === 'Revisão Manual').length;

    return { total, sent, error, processing, manual };
  }, [filteredEmails]);

  // Compute business performance indicators
  const businessMetrics = useMemo(() => {
    let totalRevenue = 0;
    let successfulOrdersCount = 0;
    let touchlessOrdersCount = 0;

    filteredEmails.forEach(email => {
      if (email.status === 'Enviado ao ERP') {
        const val = parseFloat(email.extractedFields.valor_total || '0');
        totalRevenue += val;
        successfulOrdersCount++;
        
        // Touchless faturamento if AI confidence was high (>= 80) and there were no manual error corrections
        if (email.confidenceScore >= 80 && !email.errorMessage) {
          touchlessOrdersCount++;
        }
      }
    });

    const averageOrderValue = successfulOrdersCount > 0 ? totalRevenue / successfulOrdersCount : 0;
    const touchlessRate = successfulOrdersCount > 0 ? Math.round((touchlessOrdersCount / successfulOrdersCount) * 100) : 0;

    return {
      totalRevenue,
      averageOrderValue,
      touchlessRate
    };
  }, [filteredEmails]);

  // Compute AI Accuracy based on filtered emails
  const avgConfidence = useMemo(() => {
    const validEmails = filteredEmails.filter(e => e.confidenceScore > 0);
    if (validEmails.length === 0) return 0;
    const total = validEmails.reduce((acc, curr) => acc + curr.confidenceScore, 0);
    return Math.round(total / validEmails.length);
  }, [filteredEmails]);

  // Compute Volume History Chart Data
  const chartData = useMemo(() => {
    const dataMap: Record<string, { total: number; sent: number; error: number }> = {};
    
    const now = new Date();
    let daysToPlot = 30;
    if (datePreset === '7days') {
      daysToPlot = 7;
    } else if (datePreset === 'month') {
      daysToPlot = now.getDate();
    }
    for (let i = daysToPlot - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      dataMap[dateString] = { total: 0, sent: 0, error: 0 };
    }

    filteredEmails.forEach(email => {
      const datePart = email.receivedAt.split(' ')[0];
      if (datePart) {
        const parts = datePart.split('/');
        if (parts.length === 3) {
          const dateString = `${parts[0]}/${parts[1]}`;
          if (dataMap[dateString]) {
            dataMap[dateString].total += 1;
            if (email.status === 'Enviado ao ERP') {
              dataMap[dateString].sent += 1;
            } else if (email.status === 'Erro') {
              dataMap[dateString].error += 1;
            }
          }
        }
      }
    });

    return Object.keys(dataMap).map(key => ({
      name: key,
      'Recebidos': dataMap[key].total,
      'Integrados': dataMap[key].sent,
      'Erros': dataMap[key].error,
    }));
  }, [filteredEmails, datePreset]);

  // Compute Top 10 Companies by Revenue
  const topCompaniesData = useMemo(() => {
    const companyMap: Record<string, number> = {};
    filteredEmails.forEach(email => {
      if (email.status !== 'Erro') {
        const name = email.extractedFields.cliente_razao || email.senderName;
        const totalVal = parseFloat(email.extractedFields.valor_total || '0');
        if (name) {
          companyMap[name] = (companyMap[name] || 0) + totalVal;
        }
      }
    });

    return Object.entries(companyMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredEmails]);

  // Compute Inactive / Churn Risk Customers
  const inactiveCustomersData = useMemo(() => {
    const now = new Date();
    const customerLastOrder: Record<string, Date | null> = {};
    
    // Seed with all registered customers
    erpCustomers.forEach(cust => {
      customerLastOrder[cust.razaoSocial] = null;
    });

    // Match with emails (successful orders)
    filteredEmails.forEach(email => {
      if (email.status === 'Enviado ao ERP') {
        const name = email.extractedFields.cliente_razao || email.senderName;
        const match = erpCustomers.find(c => c.razaoSocial.toLowerCase() === name.toLowerCase());
        if (match) {
          const date = parseDate(email.receivedAt);
          const currentLast = customerLastOrder[match.razaoSocial];
          if (!currentLast || date > currentLast) {
            customerLastOrder[match.razaoSocial] = date;
          }
        }
      }
    });

    // Map to array and mock last order dates realistically if missing
    return Object.entries(customerLastOrder)
      .map(([name, lastOrderDate]) => {
        const matchingCust = erpCustomers.find(c => c.razaoSocial === name);
        const cnpj = matchingCust?.cnpj || '';
        
        if (!lastOrderDate) {
          let mockDays = 45;
          if (name.includes('Objetivo')) {
            mockDays = 32;
          } else if (name.includes('Silva')) {
            mockDays = 28;
          } else if (name.includes('Lima')) {
            mockDays = 8;
          } else if (name.includes('Magalu')) {
            mockDays = 3;
          } else if (name.includes('Carrefour')) {
            mockDays = 3;
          }
          lastOrderDate = new Date(now.getTime() - mockDays * 24 * 60 * 60 * 1000);
        }

        const diffTime = Math.abs(now.getTime() - lastOrderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = 'Ativo';
        if (diffDays > 30) status = 'Inativo';
        else if (diffDays > 15) status = 'Em Risco';
        
        return {
          name,
          cnpj,
          daysInactive: diffDays,
          lastOrderStr: lastOrderDate.toLocaleDateString('pt-BR'),
          status
        };
      })
      .filter(c => c.daysInactive > 10)
      .sort((a, b) => b.daysInactive - a.daysInactive);
  }, [filteredEmails, erpCustomers]);

  // Compute automation bottlenecks / reasons for retention in manual review or error
  const retentionReasonsData = useMemo(() => {
    const reasonMap: Record<string, number> = {
      'De-Para de Produto Pendente': 0,
      'CNPJ não Cadastrado': 0,
      'Confiança abaixo do Limiar': 0,
      'Campos Obrigatórios Ausentes': 0,
      'Erro de Integração / API': 0,
      'Outros Motivos': 0
    };

    filteredEmails.forEach(email => {
      if (email.status === 'Revisão Manual' || email.status === 'Erro') {
        const msg = (email.errorMessage || '').toLowerCase();
        const hasPendingItems = email.items?.some((item) => item.catalogCode === 'PENDENTE');
        
        let reason = 'Outros Motivos';
        if (hasPendingItems || msg.includes('de-para') || msg.includes('mapeamento')) {
          reason = 'De-Para de Produto Pendente';
        } else if (msg.includes('pré-cadastro') || msg.includes('cnpj') || msg.includes('cliente') || msg.includes('vincule')) {
          reason = 'CNPJ não Cadastrado';
        } else if (email.confidenceScore > 0 && email.confidenceScore < 80) {
          reason = 'Confiança abaixo do Limiar';
        } else if (msg.includes('validação') || msg.includes('obrigatórios') || msg.includes('ausentes') || msg.includes('obrigatório')) {
          reason = 'Campos Obrigatórios Ausentes';
        } else if (msg.includes('conexão') || msg.includes('falhou') || msg.includes('autenticado') || msg.includes('api')) {
          reason = 'Erro de Integração / API';
        }

        reasonMap[reason] = (reasonMap[reason] || 0) + 1;
      }
    });

    return Object.entries(reasonMap)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredEmails]);

  // Compute Top 5 best & worst selling products
  const productSales = useMemo(() => {
    const salesMap: Record<string, { name: string; qty: number; value: number }> = {};
    
    // Seed with current catalog products
    catalog.forEach(p => {
      salesMap[p.code] = { name: p.name, qty: 0, value: 0 };
    });

    filteredEmails.forEach(email => {
      if (email.status !== 'Erro') {
        email.items.forEach(item => {
          if (item.catalogCode !== 'PENDENTE' && salesMap[item.catalogCode]) {
            salesMap[item.catalogCode].qty += item.quantity;
            salesMap[item.catalogCode].value += item.totalPrice;
          }
        });
      }
    });

    const sortedSales = Object.entries(salesMap)
      .map(([code, info]) => ({ code, ...info }))
      .sort((a, b) => b.qty - a.qty);

    const top5 = sortedSales.slice(0, 5);
    const worst5 = [...sortedSales]
      .filter(p => p.qty >= 0)
      .reverse()
      .slice(0, 5);

    return { top5, worst5 };
  }, [filteredEmails, catalog]);

  // Filtered Recent activity list
  const recentActivities = useMemo(() => {
    return filteredEmails.slice(0, 5).map(email => {
      let icon = Mail;
      let color = 'text-azul bg-azul/10';
      let title = '';
      
      if (email.status === 'Enviado ao ERP') {
        icon = Send;
        color = 'text-success bg-success/10';
        title = `Pedido ${email.extractedFields.codigo_pedido || 's/n'} enviado ao ERP ${email.erpTarget}`;
      } else if (email.status === 'Erro') {
        icon = AlertCircle;
        color = 'text-error bg-error/10';
        title = `Erro na integração do pedido de ${email.senderName}`;
      } else if (email.status === 'Revisão Manual') {
        icon = Clock;
        color = 'text-warning bg-warning/10';
        title = `Pedido de ${email.senderName} retido para revisão manual`;
      } else {
        icon = MessageSquare;
        color = 'text-azul bg-azul/10';
        title = `Novo chat do WhatsApp recebido de ${email.senderName}`;
      }

      return {
        id: email.id,
        icon,
        color,
        title,
        time: email.receivedAt,
        details: email.subject
      };
    });
  }, [filteredEmails]);

  return (
    <div className="space-y-6">
      
      {/* WhatsApp Connection Status Alert/Banner */}
      <div className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${
        emailConnection.connected 
          ? 'bg-success/5 border-success/20 text-success' 
          : 'bg-error/5 border-error/20 text-error animate-pulse bg-error/10'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${emailConnection.connected ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>
            {emailConnection.connected ? <Phone size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-bold text-text-primary">
              {emailConnection.connected 
                ? 'Conexão com WhatsApp Ativa' 
                : 'Atenção: Instância do WhatsApp Desconectada!'}
            </span>
            <span className="text-[10px] text-text-tertiary">
              {emailConnection.connected 
                ? `Conectado com sucesso via WhatsApp API. QR Code sincronizado: ${emailConnection.lastSyncTime || 'Agora mesmo'}` 
                : 'Não estamos recebendo novos pedidos via WhatsApp. Reconecte a instância nas Configurações.'}
            </span>
          </div>
        </div>
        
        {emailConnection.connected ? (
          <span className="text-[9px] bg-success/15 text-success px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0">
            Online
          </span>
        ) : (
          <Link 
            to="/configuracoes" 
            className="text-[10px] bg-error text-white px-3 py-1.5 rounded-xl font-bold hover:bg-error/90 transition shadow-sm whitespace-nowrap shrink-0"
          >
            Reconectar WhatsApp
          </Link>
        )}
      </div>

      {/* Dynamic Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between bg-white/30 relative z-50">
        <div className="flex items-center gap-2.5">
          <Filter className="text-lilas w-5 h-5" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-primary">Filtros Operacionais</span>
            <span className="text-[11px] text-text-tertiary">Pesquise empresas e selecione o período das métricas</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          
          {/* Company Autocomplete Search */}
          <div className="flex flex-col gap-1 relative z-50">
            <span className="text-[9px] font-bold text-text-secondary uppercase">Buscar Empresa (Nome/CNPJ)</span>
            <div className="relative w-[240px]">
              <input
                type="text"
                placeholder="Digite o nome ou CNPJ..."
                className="w-full p-2 pr-8 border border-border/60 bg-white/70 focus:bg-white rounded-xl focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary pl-8"
                value={companySearch}
                onChange={(e) => {
                  setCompanySearch(e.target.value);
                  setShowSuggestions(true);
                  if (!e.target.value) {
                    setSelectedCompany('Todas');
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
              />
              <Search className="absolute left-2.5 top-2.5 text-text-tertiary w-3.5 h-3.5" />
              {companySearch && (
                <button
                  type="button"
                  onClick={() => {
                    setCompanySearch('');
                    setSelectedCompany('Todas');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2.5 top-2 text-text-tertiary hover:text-text-primary text-xs font-bold"
                >
                  ✕
                </button>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-border shadow-xl max-h-[180px] overflow-y-auto z-50 p-1 divide-y divide-border/10">
                  {filteredSuggestions.length === 0 ? (
                    <div className="p-2.5 text-center text-[10px] text-text-tertiary">Nenhuma empresa encontrada</div>
                  ) : (
                    filteredSuggestions.map((comp) => {
                      const matchingEmail = emails.find(e => {
                        const name = e.extractedFields.cliente_razao || e.senderName;
                        return name === comp;
                      });
                      const cnpj = matchingEmail?.extractedFields.cliente_cnpj || '';
                      
                      return (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => {
                            if (comp === 'Todas as Empresas') {
                              setSelectedCompany('Todas');
                              setCompanySearch('');
                            } else {
                              setSelectedCompany(comp);
                              setCompanySearch(comp);
                            }
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left p-2 hover:bg-black/5 flex flex-col rounded text-[11px] font-semibold text-text-primary transition"
                        >
                          <span>{comp}</span>
                          {comp !== 'Todas as Empresas' && cnpj && (
                            <span className="text-[9px] font-mono text-text-tertiary">
                              CNPJ: {cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Date preset filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-text-secondary uppercase">Período</span>
            <select
              className="p-2 border border-border/60 bg-white/70 focus:bg-white rounded-xl focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary min-w-[140px]"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
            >
              <option value="month">Mês Atual</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="all">Todo o Período</option>
              <option value="custom">Customizado</option>
            </select>
          </div>

          {/* Custom start/end dates */}
          {datePreset === 'custom' && (
            <div className="flex gap-2 items-center animate-fadeIn">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-text-secondary uppercase">Data Inicial</span>
                <input
                  type="date"
                  className="p-1.5 border border-border/60 bg-white/70 focus:bg-white rounded-xl focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-text-secondary uppercase">Data Final</span>
                <input
                  type="date"
                  className="p-1.5 border border-border/60 bg-white/70 focus:bg-white rounded-xl focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI: Recebidos */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Total Recebidos</span>
            <div className="p-2 rounded-xl bg-azul/10 text-azul">
              <Mail size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-primary">{stats.total}</span>
            <span className="text-[10px] font-semibold text-success flex items-center gap-0.5">
              <TrendingUp size={10} /> +12%
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary mt-1">Filtrados no período</p>
        </div>

        {/* KPI: Processados */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Em Processamento</span>
            <div className="p-2 rounded-xl bg-lilas/10 text-lilas">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-primary">{stats.processing}</span>
          </div>
          <p className="text-[11px] text-text-tertiary mt-1">Aguardando/Extraindo</p>
        </div>

        {/* KPI: Enviados ao ERP */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Integrados no ERP</span>
            <div className="p-2 rounded-xl bg-success/10 text-success">
              <Send size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-primary">{stats.sent}</span>
            <span className="text-[10px] font-semibold text-success flex items-center gap-0.5">
              {stats.total > 0 ? `${Math.round((stats.sent / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary mt-1">Concluídos com sucesso</p>
        </div>

        {/* KPI: Revisão Manual */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Revisão Manual</span>
            <div className="p-2 rounded-xl bg-warning/10 text-warning">
              <Database size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-primary">{stats.manual}</span>
          </div>
          <p className="text-[11px] text-text-tertiary mt-1">Erros de De-Para ou dados</p>
        </div>

        {/* KPI: Erros */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Falhas de Envio</span>
            <div className="p-2 rounded-xl bg-error/10 text-error">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-primary">{stats.error}</span>
          </div>
          <p className="text-[11px] text-text-tertiary mt-1">Rejeitados por API/Conexão</p>
        </div>
      </div>

      {/* Primary Business Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue */}
        <div className="glass-panel p-5 rounded-2xl bg-gradient-to-tr from-lilas/5 to-transparent border-lilas/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Faturamento Total</span>
            <p className="text-xl font-bold text-text-primary">
              R$ {businessMetrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-text-tertiary">Pedidos integrados no ERP</p>
          </div>
          <div className="p-3 rounded-xl bg-lilas/10 text-lilas shrink-0">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Metric 2: Ticket Médio */}
        <div className="glass-panel p-5 rounded-2xl bg-gradient-to-tr from-azul/5 to-transparent border-azul/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Ticket Médio por Pedido</span>
            <p className="text-xl font-bold text-text-primary">
              R$ {businessMetrics.averageOrderValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-text-tertiary">Valor médio de cada transação</p>
          </div>
          <div className="p-3 rounded-xl bg-azul/10 text-azul shrink-0">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Metric 3: Pedidos Sem Toque (Touchless) */}
        <div className="glass-panel p-5 rounded-2xl bg-gradient-to-tr from-success/5 to-transparent border-success/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Integrações "Sem Toque" (Touchless)</span>
            <p className="text-xl font-bold text-text-primary">
              {businessMetrics.touchlessRate}%
            </p>
            <p className="text-[10px] text-text-tertiary">Faturamento sem intervenção manual</p>
          </div>
          <div className="p-3 rounded-xl bg-success/10 text-success shrink-0">
            <Cpu size={20} />
          </div>
        </div>

        {/* Metric 4: Economia de IA */}
        <div className="glass-panel p-5 rounded-2xl bg-gradient-to-tr from-rosa/5 to-transparent border-rosa/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Economia de IA</span>
            <p className="text-xl font-bold text-text-primary">
              R$ {(settings.savedAiCost || 112.50).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-text-tertiary">{(settings.filteredEmailsCount || 2250).toLocaleString('pt-BR')} chats filtrados</p>
          </div>
          <div className="p-3 rounded-xl bg-rosa/10 text-rosa shrink-0">
            <Filter size={20} />
          </div>
        </div>
      </div>

      {/* Charts First Row: Main Trend Line + AI Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Volume Area Chart */}
        <div className="glass-panel p-5 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">Histórico de Volume Operacional</span>
              <span className="text-xs text-text-tertiary">Pedidos trafegados no período selecionado</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-text-secondary">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-azul/60" />
                <span>Recebidos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
                <span>Integrados</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8FB8E8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8FB8E8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF91" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4CAF91" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#8A92A6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A92A6" fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip 
                  contentStyle={{ 
                    background: 'rgba(255,255,255,0.9)', 
                    border: '1px solid rgba(180,155,212,0.18)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                    fontSize: '12px' 
                  }} 
                />
                <Area type="monotone" dataKey="Recebidos" stroke="#8FB8E8" strokeWidth={2} fillOpacity={1} fill="url(#colorRec)" />
                <Area type="monotone" dataKey="Integrados" stroke="#4CAF91" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Telemetry Gauge Card */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
          <div className="flex items-center gap-2 self-start border-b border-border/20 w-full pb-2">
            <Brain className="text-lilas" size={18} />
            <span className="text-sm font-semibold text-text-primary">Acurácia Média da IA</span>
          </div>
          
          <div className="relative flex items-center justify-center h-32 w-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="48"
                className="stroke-border/20"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="48"
                className="stroke-lilas transition-all duration-1000 ease-out"
                strokeWidth="10"
                strokeDasharray="301.6"
                strokeDashoffset={301.6 - (301.6 * avgConfidence) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-text-primary">{avgConfidence}%</span>
              <span className="text-[8px] text-text-tertiary uppercase font-bold tracking-wider">Acurácia</span>
            </div>
          </div>
          <p className="text-[11px] text-text-tertiary text-center leading-relaxed max-w-[220px]">
            Índice de acurácia em extrações cognitivas de conversas e dados no período selecionado.
          </p>
        </div>
      </div>

      {/* Third Row: Rankings, Churn & Customer Segment Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Top 10 Companies by Revenue */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/20 pb-2">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="text-lilas" size={18} />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text-primary">Ranking Top 10 Clientes (Faturamento)</span>
                <span className="text-[11px] text-text-tertiary">Clientes que mais geraram faturamento de pedidos</span>
              </div>
            </div>
            <button
              onClick={() => setShowRankingModal(true)}
              className="p-1.5 rounded-lg hover:bg-black/5 text-text-secondary hover:text-text-primary transition"
              title="Expandir ranking"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          {topCompaniesData.length === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center text-text-tertiary italic text-xs">
              Nenhum pedido faturado para ranquear.
            </div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCompaniesData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" stroke="#8A92A6" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                  <YAxis dataKey="name" type="category" stroke="#8A92A6" fontSize={9} tickLine={false} axisLine={false} width={130} />
                  <ChartTooltip
                    formatter={(val: any) => [`R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento']}
                    contentStyle={{ 
                      background: 'rgba(255,255,255,0.95)', 
                      border: '1px solid rgba(180,155,212,0.18)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                      fontSize: '11px' 
                    }} 
                  />
                  <Bar dataKey="value" fill="#8FB8E8" radius={[0, 4, 4, 0]} barSize={12}>
                    {topCompaniesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#B49BD4' : '#8FB8E8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Clientes Inativos / Risco de Churn */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/20 pb-2">
            <div className="flex items-center gap-2.5">
              <Clock className="text-error/80" size={18} />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text-primary">Inatividade / Risco de Churn</span>
                <span className="text-[11px] text-text-tertiary">Clientes sem novos pedidos registrados recentemente</span>
              </div>
            </div>
            <button
              onClick={() => setShowChurnModal(true)}
              className="p-1.5 rounded-lg hover:bg-black/5 text-text-secondary hover:text-text-primary transition"
              title="Expandir inatividade"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          {inactiveCustomersData.length === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center text-text-tertiary italic text-xs">
              Todos os clientes ativos no período.
            </div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={inactiveCustomersData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" stroke="#8A92A6" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}d`} />
                  <YAxis dataKey="name" type="category" stroke="#8A92A6" fontSize={9} tickLine={false} axisLine={false} width={130} />
                  <ChartTooltip
                    formatter={(val: any) => [`${val} dias sem comprar`, 'Inatividade']}
                    contentStyle={{ 
                      background: 'rgba(255,255,255,0.95)', 
                      border: '1px solid rgba(180,155,212,0.18)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                      fontSize: '11px' 
                    }} 
                  />
                  <Bar dataKey="daysInactive" fill="#FFA726" radius={[0, 4, 4, 0]} barSize={12}>
                    {inactiveCustomersData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.status === 'Inativo' ? '#E8A5C4' : '#FFA726'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Motivos de Retenção na Revisão Manual */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-border/20 pb-2">
            <AlertCircle className="text-lilas" size={18} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">Motivos de Retenção (Revisão / Erros)</span>
              <span className="text-[11px] text-text-tertiary">Principais gargalos que impediram a integração automática</span>
            </div>
          </div>

          {retentionReasonsData.length === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center text-success text-center px-4 space-y-2">
              <Sparkles className="w-8 h-8 text-success animate-bounce mx-auto" />
              <p className="text-xs font-bold text-text-primary">Operação 100% Eficiente!</p>
              <p className="text-[11px] text-text-tertiary">Todos os pedidos foram integrados com sucesso ou estão em processamento sem retenção no período.</p>
            </div>
          ) : (
            <div className="h-[260px] w-full flex items-center justify-between">
              <div className="flex-1 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={retentionReasonsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {retentionReasonsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      formatter={(val: any) => [`${val} ${val === 1 ? 'pedido' : 'pedidos'}`, 'Volume']}
                      contentStyle={{ 
                        background: 'rgba(255,255,255,0.95)', 
                        border: '1px solid rgba(180,155,212,0.18)',
                        borderRadius: '12px',
                        fontSize: '11px' 
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend with Segment names and values */}
              <div className="space-y-3 shrink-0 w-36">
                {retentionReasonsData.map((seg, idx) => (
                  <div key={seg.name} className="flex items-start gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-bold text-text-secondary truncate" title={seg.name}>{seg.name}</span>
                      <span className="text-[8px] text-text-tertiary font-semibold">
                        {seg.value} {seg.value === 1 ? 'pedido' : 'pedidos'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Fourth Row: Product Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top & Worst Selling Products */}
        <div className="glass-panel p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 lg:col-span-2">
          {/* Best Selling */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/20 pb-2">
              <Sparkles className="text-success" size={15} />
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-text-primary">Top 5 Mais Vendidos</span>
                <span className="text-[10px] text-text-tertiary">Maior quantidade vendida</span>
              </div>
            </div>

            {productSales.top5.length === 0 || productSales.top5.every(p => p.qty === 0) ? (
              <p className="text-xs italic text-text-tertiary py-8 text-center">Sem vendas registradas.</p>
            ) : (
              <div className="space-y-3.5 pt-1">
                {productSales.top5.map((prod, idx) => {
                  const maxQty = productSales.top5[0]?.qty || 1;
                  const percentage = Math.round((prod.qty / maxQty) * 100);
                  return (
                    <div key={prod.code} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-text-secondary gap-2">
                        <span className="truncate max-w-[200px]" title={prod.name}>{prod.name}</span>
                        <span className="shrink-0">{prod.qty} un</span>
                      </div>
                      <div className="w-full bg-black/5 rounded-full h-1.5">
                        <div 
                          className="bg-gradient-to-r from-lilas to-azul h-1.5 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-text-tertiary">
                        Total: R$ {prod.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Least Selling */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/20 pb-2">
              <AlertCircle className="text-error/70" size={15} />
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-text-primary">Top 5 Menos Vendidos</span>
                <span className="text-[10px] text-text-tertiary">Menor volume de saída</span>
              </div>
            </div>

            {productSales.worst5.length === 0 ? (
              <p className="text-xs italic text-text-tertiary py-8 text-center">Nenhum produto cadastrado.</p>
            ) : (
              <div className="space-y-3.5 pt-1">
                {productSales.worst5.map((prod, idx) => {
                  const maxQty = Math.max(...productSales.worst5.map(p => p.qty)) || 1;
                  const percentage = maxQty > 0 ? Math.round((prod.qty / maxQty) * 100) : 0;
                  return (
                    <div key={prod.code} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-text-secondary gap-2">
                        <span className="truncate max-w-[200px]" title={prod.name}>{prod.name}</span>
                        <span className="shrink-0">{prod.qty} un</span>
                      </div>
                      <div className="w-full bg-black/5 rounded-full h-1.5">
                        <div 
                          className="bg-error/30 h-1.5 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-text-tertiary">
                        Total: R$ {prod.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Row 5: Filtered Activity Feed */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/20 pb-2">
          <div className="flex items-center gap-2">
            <Mail className="text-lilas w-4 h-4" />
            <span className="text-sm font-semibold text-text-primary">Atividades Recentes Filtradas</span>
          </div>
          <span className="text-xs text-text-tertiary">Exibindo últimas atividades que atendem aos filtros ativos</span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-6 text-center text-text-tertiary italic text-xs">
            Nenhuma atividade correspondente aos filtros aplicados.
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${act.color}`}>
                    <act.icon size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold text-text-primary">{act.title}</span>
                    <span className="text-[10px] text-text-tertiary mt-0.5">{act.details}</span>
                  </div>
                </div>
                <span className="text-[10px] text-text-tertiary font-medium whitespace-nowrap">{act.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Top 10 Clientes (Faturamento) */}
      {showRankingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-4xl p-6 rounded-3xl space-y-6 relative border border-border/40 shadow-2xl bg-white/95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="text-lilas" size={22} />
                <div className="flex flex-col">
                  <h3 className="text-base font-bold text-text-primary">Ranking Completo dos Clientes (Faturamento)</h3>
                  <p className="text-xs text-text-tertiary">Visualização ampliada do faturamento acumulado por empresa</p>
                </div>
              </div>
              <button
                onClick={() => setShowRankingModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 text-text-secondary hover:text-text-primary transition"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Chart Container */}
            {topCompaniesData.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-text-tertiary italic text-sm">
                Nenhum pedido faturado para ranquear.
              </div>
            ) : (
              <div className="h-[480px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCompaniesData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" stroke="#8A92A6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR')}`} />
                    <YAxis dataKey="name" type="category" stroke="#8A92A6" fontSize={11} tickLine={false} axisLine={false} width={180} />
                    <ChartTooltip
                      formatter={(val: any) => [`R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento']}
                      contentStyle={{ 
                        background: 'rgba(255,255,255,0.98)', 
                        border: '1px solid rgba(180,155,212,0.18)',
                        borderRadius: '16px',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
                        fontSize: '12px' 
                      }} 
                    />
                    <Bar dataKey="value" fill="#8FB8E8" radius={[0, 6, 6, 0]} barSize={24}>
                      {topCompaniesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#B49BD4' : '#8FB8E8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Footer Summary */}
            <div className="bg-black/[0.01] border border-border/30 p-4 rounded-2xl flex items-center justify-between text-xs text-text-secondary font-semibold">
              <span>Faturamento Total do Período:</span>
              <span className="text-sm font-bold text-lilas">
                R$ {businessMetrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clientes Inativos (Risco de Churn) */}
      {showChurnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-4xl p-6 rounded-3xl space-y-6 relative border border-border/40 shadow-2xl bg-white/95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <div className="flex items-center gap-2.5">
                <Clock className="text-error/80" size={22} />
                <div className="flex flex-col">
                  <h3 className="text-base font-bold text-text-primary">Relatório de Inatividade e Churn de Clientes</h3>
                  <p className="text-xs text-text-tertiary">Análise detalhada de clientes com risco de abandono</p>
                </div>
              </div>
              <button
                onClick={() => setShowChurnModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 text-text-secondary hover:text-text-primary transition"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Split layout: Chart on left, Detailed table on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Chart Column */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Visualização Gráfica</h4>
                  <span className="text-[10px] bg-error/10 text-error px-2 py-0.5 rounded-full font-bold">Risco de Churn</span>
                </div>
                <div className="h-[400px] w-full bg-black/[0.01] border border-border/30 rounded-2xl p-4">
                  {inactiveCustomersData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-text-tertiary italic text-xs">
                      Nenhum cliente inativo.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={inactiveCustomersData}
                        layout="vertical"
                        margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" stroke="#8A92A6" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}d`} />
                        <YAxis dataKey="name" type="category" stroke="#8A92A6" fontSize={10} tickLine={false} axisLine={false} width={100} />
                        <ChartTooltip
                          formatter={(val: any) => [`${val} dias sem comprar`, 'Inatividade']}
                          contentStyle={{ 
                            background: 'rgba(255,255,255,0.98)', 
                            border: '1px solid rgba(180,155,212,0.18)',
                            borderRadius: '12px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                            fontSize: '11px' 
                          }} 
                        />
                        <Bar dataKey="daysInactive" fill="#FFA726" radius={[0, 4, 4, 0]} barSize={16}>
                          {inactiveCustomersData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.status === 'Inativo' ? '#E8A5C4' : '#FFA726'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Table Column */}
              <div className="lg:col-span-7 space-y-3">
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Relação Detalhada de Clientes</h4>
                <div className="overflow-x-auto border border-border/40 rounded-2xl max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs font-semibold text-text-secondary">
                    <thead className="bg-black/[0.02] border-b border-border/40 text-[10px] text-text-tertiary uppercase font-bold tracking-wider sticky top-0 bg-white z-10">
                      <tr>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">CNPJ</th>
                        <th className="p-3 text-center">Dias Inativo</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {inactiveCustomersData.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center italic text-text-tertiary">Nenhum cliente inativo.</td>
                        </tr>
                      ) : (
                        inactiveCustomersData.map((cust) => (
                          <tr key={cust.name} className="hover:bg-black/[0.01]">
                            <td className="p-3 font-bold text-text-primary">
                              <div className="flex flex-col">
                                <span>{cust.name}</span>
                                <span className="text-[10px] text-text-tertiary font-normal">Último: {cust.lastOrderStr}</span>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-[11px]">
                              {cust.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
                            </td>
                            <td className="p-3 text-center font-bold text-text-primary">{cust.daysInactive}d</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap border ${
                                cust.status === 'Inativo'
                                  ? 'bg-error/15 text-error border-error/25'
                                  : cust.status === 'Em Risco'
                                  ? 'bg-warning/15 text-warning border-warning/25'
                                  : 'bg-success/15 text-success border-success/25'
                              }`}>
                                {cust.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
