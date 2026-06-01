import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import BackgroundOrbs from './BackgroundOrbs';
import { useFlowStore } from '../store/useFlowStore';
import { MailCheck, CheckCircle2, Play, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { toast } from 'sonner';

export const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const activeErp = useFlowStore((state) => state.activeErp);
  const receiveSimulatedEmail = useFlowStore((state) => state.receiveSimulatedEmail);
  const triggerBatchSimulation = useFlowStore((state) => state.triggerBatchSimulation);
  const syncDeParaSuggestions = useFlowStore((state) => state.syncDeParaSuggestions);
  const emails = useFlowStore((state) => state.emails);
  const selectedEmailId = useFlowStore((state) => state.selectedEmailId);
  const sendEmailToErp = useFlowStore((state) => state.sendEmailToErp);
  const isOfflineMode = useFlowStore((state) => state.isOfflineMode);

  // Authentication variables
  const currentUser = useFlowStore((state) => state.currentUser);
  const companies = useFlowStore((state) => state.companies);

  // Compute active company name dynamically
  const activeCompanyName = React.useMemo(() => {
    if (!currentUser) return '';
    const compId = currentUser.companyId;
    if (!compId) return 'Softeum Logística Integrada';
    const comp = companies.find(c => c.id === compId);
    return comp ? comp.name : 'Softeum Logística Integrada';
  }, [currentUser, companies]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        toast.info('Atalho [N]: Direcionando para Novo Mapeamento De-Para.');
        navigate('/depara');
      } else if (key === 's') {
        e.preventDefault();
        if (location.pathname === '/inbox' && selectedEmailId) {
          toast.info('Atalho [S]: Integrando pedido selecionado no ERP...');
          sendEmailToErp(selectedEmailId).then((success) => {
            if (success) {
              toast.success('Pedido integrado com sucesso via atalho!');
            } else {
              toast.error('Falha na integração do pedido via atalho.');
            }
          });
        } else {
          toast.info('Atalho [S] de envio está disponível apenas na Inbox Inteligente com um e-mail de pedido selecionado.');
        }
      } else if (key === 'e') {
        e.preventDefault();
        toast.info('Atalho [E]: Exportando relatório de pedidos consolidado.');
        const csvContent = "data:text/csv;charset=utf-8,ID,Cliente,Valor,Status\n" + 
          emails.map(em => `"${em.id}","${em.senderName}",${em.items.reduce((acc, curr) => acc + curr.totalPrice, 0)},"${em.status}"`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "relatorio_pedidos_softeum_flow.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname, selectedEmailId, sendEmailToErp, emails]);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Painel Operacional';
      case '/inbox': return 'WhatsApp Inbox';
      case '/erp-layout': return 'Mapeador de Layout ERP';
      case '/depara': return 'Dicionário De-Para';
      case '/catalogo': return 'Catálogo de Produtos';
      case '/pedidos': return 'Fila de Pedidos Processados';
      case '/conexoes': return 'Painel de Conexões';
      case '/configuracoes': return 'Configurações do Sistema';
      default: return 'Softeum Flow';
    }
  };

  const handleSimulateSingle = () => {
    receiveSimulatedEmail();
    toast.success('Novo chat de WhatsApp recebido na Inbox!', {
      description: 'A IA está extraindo os campos e respondendo em tempo real.',
      duration: 3500,
    });
  };

  const handleSimulateBatch = () => {
    const loader = toast.loading('Simulando tráfego de alta escala...');
    setTimeout(() => {
      triggerBatchSimulation(100);
      toast.dismiss(loader);
      toast.success('Lote de 100 chats do WhatsApp simulado com sucesso!', {
        description: 'Dados populados e processados em lote no Painel.',
        duration: 4000,
      });
    }, 1000);
  };

  const handleForceSync = () => {
    const loader = toast.loading('Re-sincronizando sugestões da inteligência artificial...');
    setTimeout(() => {
      syncDeParaSuggestions();
      toast.dismiss(loader);
      toast.success('Sugestões de De-Para atualizadas com sucesso!', {
        description: 'Vínculos de produtos reprocessados com base no catálogo atual.',
        duration: 3000,
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen flex text-text-primary">
      <BackgroundOrbs />
      
      {/* Sidebar Navigation */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'pl-20' : 'pl-20 md:pl-64'
        }`}
      >


        {/* Top Header */}
        <header className="glass-panel sticky top-0 z-30 h-16 border-b border-border/40 px-6 flex items-center justify-between bg-white/40">
          <div className="flex flex-col">
            <h1 className="text-base md:text-lg font-bold tracking-tight text-text-primary">{getPageTitle()}</h1>
            <span className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">Empresa: {activeCompanyName}</span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Status indicators */}
            <div className="hidden lg:flex items-center gap-3.5 mr-2 text-[12px] font-medium border-r border-border/50 pr-4">
              <div className="flex items-center gap-1.5 text-success">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>WhatsApp API Conectada</span>
              </div>
              <div className="flex items-center gap-1.5 text-success">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span>{activeErp} ERP Conectado</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isOfflineMode ? 'text-warning' : 'text-success'}`}>
                <span className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-warning animate-pulse' : 'bg-success'}`} />
                <span>{isOfflineMode ? 'Modo Local' : 'Supabase OK'}</span>
              </div>
            </div>

            {/* AI Control buttons */}
            {currentUser?.role === 'Admin' && (
              <div className="flex items-center gap-2">
              <button
                onClick={handleForceSync}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-lilas bg-white/60 hover:bg-white text-text-secondary hover:text-text-primary text-[12px] font-medium transition"
                title="Reprocessar De-Para"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                <span className="hidden sm:inline">Re-sync IA</span>
              </button>

              <button
                onClick={handleSimulateSingle}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-border hover:border-azul text-text-secondary hover:text-text-primary text-[12px] font-medium shadow-sm transition"
              >
                <Play size={14} className="text-azul fill-azul/20" />
                <span>+1 Chat (Pedido)</span>
              </button>

              <button
                onClick={() => {
                  receiveSimulatedEmail({
                    senderName: 'Diretoria de Compras',
                    senderEmail: 'compras@empresa-nova.com',
                    subject: 'PEDIDO DE COMPRA DE TESTE - SEM CADASTRO',
                    status: 'Revisão Manual',
                    errorMessage: 'Erro de Pré-cadastro: O CNPJ do cliente (99.888.777/0001-99) ou e-mail de origem (compras@empresa-nova.com) não está pré-cadastrado no ERP. Vincule ou crie o pré-cadastro.',
                    extractedFields: {
                      codigo_pedido: 'PED-TESTE-999',
                      cliente_cnpj: '99888777000199',
                      cliente_razao: 'Empresa Nova Teste Ltda',
                      data_emissao: new Date().toLocaleDateString('pt-BR'),
                      condicao_pagamento: 'Boleto 30 dias',
                      valor_total: '450.00'
                    },
                    mappedFields: {
                      codigo_pedido: 'PED-TESTE-999',
                      cliente_cnpj: '99888777000199',
                      cliente_razao: 'Empresa Nova Teste Ltda',
                      data_emissao: new Date().toLocaleDateString('pt-BR'),
                      condicao_pagamento: 'Boleto 30 dias',
                      valor_total: '450.00'
                    }
                  });
                  toast.warning('Simulado chat de cliente sem De-Para cadastrado!', {
                    description: 'Verifique a aba de Revisão Manual na Inbox.'
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-border hover:border-warning text-text-secondary hover:text-text-primary text-[12px] font-medium shadow-sm transition"
                title="Simular chat com CNPJ/Telefone desconhecido"
              >
                <Play size={14} className="text-warning fill-warning/20" />
                <span>+1 Chat (Sem De-Para)</span>
              </button>

              <button
                onClick={() => {
                  // Simulate an email with registered customer but unrecognized product items
                  receiveSimulatedEmail({
                    senderName: 'Marcos Souza',
                    senderEmail: 'compras@magalu.com.br',
                    subject: 'PEDIDO ADICIONAL #4420 - ITENS NOVOS',
                    status: 'Revisão Manual',
                    errorMessage: 'Há itens de pedido sem mapeamento correspondente no catálogo.',
                    extractedFields: {
                      codigo_pedido: 'PED-4420',
                      cliente_cnpj: '47960950000121',
                      cliente_razao: 'Magazine Luiza S/A',
                      data_emissao: new Date().toLocaleDateString('pt-BR'),
                      condicao_pagamento: 'Boleto 30 dias',
                      valor_total: '770.00'
                    },
                    mappedFields: {
                      codigo_pedido: 'PED-4420',
                      cliente_cnpj: '47960950000121',
                      cliente_razao: 'Magazine Luiza S/A',
                      data_emissao: new Date().toLocaleDateString('pt-BR'),
                      condicao_pagamento: 'Boleto 30 dias',
                      valor_total: '770.00'
                    },
                    rawItems: [
                      { rawDescription: 'Resma Chamex 90g Premium', quantity: 20, unitPrice: 35.50 },
                      { rawDescription: 'Item Inexistente Totalmente', quantity: 5, unitPrice: 12.00 }
                    ],
                    items: [
                      {
                        catalogCode: 'PENDENTE',
                        catalogName: 'Aguardando mapeamento: "Resma Chamex 90g Premium"',
                        quantity: 20,
                        unitPrice: 35.50,
                        totalPrice: 710.00,
                        unit: 'UN'
                      },
                      {
                        catalogCode: 'PENDENTE',
                        catalogName: 'Aguardando mapeamento: "Item Inexistente Totalmente"',
                        quantity: 5,
                        unitPrice: 12.00,
                        totalPrice: 60.00,
                        unit: 'UN'
                      }
                    ],
                    confidenceScore: 72
                  });
                  toast.warning('Simulado chat com produtos sem De-Para cadastrado!', {
                    description: 'Verifique a aba de Revisão Manual na Inbox.'
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-border hover:border-lilas text-text-secondary hover:text-text-primary text-[12px] font-medium shadow-sm transition"
                title="Simular chat com produtos sem mapeamento"
              >
                <Play size={14} className="text-lilas fill-lilas/20" />
                <span>+1 Prod Sem De-Para</span>
              </button>

              <button
                onClick={() => {
                  receiveSimulatedEmail({
                    status: 'E-mail Geral'
                  });
                  toast.info('Simulado chat de assunto geral na Inbox!', {
                    description: 'IA não consumida para esta mensagem.'
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary text-[12px] font-medium shadow-sm transition"
                title="Simular chat geral (sem pedido)"
              >
                <Play size={14} className="text-text-secondary fill-text-secondary/20" />
                <span>+1 Chat Geral</span>
              </button>

              <button
                onClick={() => {
                  receiveSimulatedEmail({
                    senderName: 'Remetente Ilegível',
                    senderEmail: 'contato@remetentedesconhecido.com',
                    subject: 'SOLICITAÇÃO DE ORDEM - ARQUIVO CORROMPIDO',
                    status: 'Revisão Manual',
                    errorMessage: 'Falha Crítica de Leitura: A inteligência artificial não conseguiu extrair os campos da mensagem do WhatsApp. Todos os campos obrigatórios estão vazios.',
                    extractedFields: {
                      codigo_pedido: '',
                      cliente_cnpj: '',
                      cliente_razao: '',
                      data_emissao: '',
                      condicao_pagamento: '',
                      valor_total: '0.00'
                    },
                    mappedFields: {
                      codigo_pedido: '',
                      cliente_cnpj: '',
                      cliente_razao: '',
                      data_emissao: '',
                      condicao_pagamento: '',
                      valor_total: '0.00'
                    },
                    rawItems: [
                      { rawDescription: 'Item Ilegível no Chat', quantity: 1, unitPrice: 0.00 }
                    ],
                    items: [
                      {
                        catalogCode: 'PENDENTE',
                        catalogName: 'Aguardando mapeamento manual de item ilegível',
                        quantity: 1,
                        unitPrice: 0.00,
                        totalPrice: 0.00,
                        unit: 'UN'
                      }
                    ],
                    confidenceScore: 0,
                    attachmentName: 'pedido_corrompido.pdf'
                  });
                  toast.error('Simulado chat com falha crítica de leitura!', {
                    description: 'Verifique a aba de Revisão Manual na Inbox.'
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-border hover:border-error text-text-secondary hover:text-text-primary text-[12px] font-medium shadow-sm transition"
                title="Simular chat com erro crítico de leitura"
              >
                <Play size={14} className="text-error fill-error/20" />
                <span>+1 Falha Leitura</span>
              </button>

              <button
                onClick={handleSimulateBatch}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-lilas to-azul hover:from-lilas/90 hover:to-azul/90 text-white text-[12px] font-semibold shadow-sm transition"
              >
                <Layers size={14} />
                <span>+100 Chats Lote</span>
              </button>
            </div>
            )}
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default Layout;
