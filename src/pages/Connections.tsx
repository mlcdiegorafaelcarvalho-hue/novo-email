import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { 
  Link2, 
  Database, 
  Key, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const Connections: React.FC = () => {
  const currentUser = useFlowStore((state) => state.currentUser);
  const erpConnections = useFlowStore((state) => state.erpConnections);
  const updateErpConnection = useFlowStore((state) => state.updateErpConnection);
  const activeErp = useFlowStore((state) => state.activeErp);
  const setErpPreset = useFlowStore((state) => state.setErpPreset);

  // ERP testing states (id -> 'idle' | 'testing' | 'success' | 'error')
  const [testingStatus, setTestingStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({});

  const isAdmin = currentUser?.role === 'Admin';

  const handleTestErp = async (id: string, apiKey: string, baseUrl: string) => {
    if (!apiKey || !baseUrl) {
      toast.error('Informe a API Key e a URL Base para realizar o teste.');
      setTestingStatus(prev => ({ ...prev, [id]: 'error' }));
      return;
    }

    setTestingStatus(prev => ({ ...prev, [id]: 'testing' }));
    
    // Simulate API testing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setTestingStatus(prev => ({ ...prev, [id]: 'success' }));
    updateErpConnection(id, { connected: true, lastSyncTime: '27/05/2026 18:03' });
    toast.success('Conexão estabelecida com sucesso!', {
      description: `Integrador validou credenciais de API para ${id.toUpperCase()}`
    });
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link2 className="text-lilas" size={20} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-text-primary">Gerenciador de Integrações B2B</span>
            <span className="text-xs text-text-tertiary">Conecte a API do seu ERP de destino</span>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 max-w-xl mx-auto mt-12">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error animate-pulse">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-base font-bold text-text-primary">Acesso Restrito</h2>
          <p className="text-xs text-text-secondary leading-relaxed max-w-md">
            Apenas administradores têm permissão para acessar a aba de integrações com o ERP. Entre em contato com o administrador do sistema para solicitar acesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="flex items-center gap-2">
        <Link2 className="text-lilas" size={20} />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-primary">Gerenciador de Integrações B2B</span>
          <span className="text-xs text-text-tertiary">Conecte a API do seu ERP de destino</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="glass-panel p-5 rounded-2xl space-y-6">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <Database className="text-lilas" size={16} />
            <span className="text-[13px] font-bold text-text-primary">Integração de Saída (ERP Endpoints)</span>
          </div>

          {/* ERP Dropdown Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">ERP da sua Empresa</label>
            {isAdmin ? (
              <>
                <select
                  className="p-2.5 border border-border/60 bg-white/70 focus:bg-white rounded-xl focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                  value={activeErp}
                  onChange={(e) => {
                    const selectedPreset = e.target.value;
                    setErpPreset(selectedPreset);
                    toast.success(`ERP ${selectedPreset} selecionado como ativo!`);
                  }}
                >
                  <option value="Bling">Bling ERP</option>
                  <option value="TOTVS">TOTVS Protheus</option>
                  <option value="Omie">Omie ERP</option>
                  <option value="SAP">SAP S/4HANA</option>
                  <option value="Senior">Senior ERP</option>
                  <option value="Custom">Outro / Genérico (API REST)</option>
                </select>
                <p className="text-[10px] text-text-tertiary mt-0.5">Selecione o ERP contratado pela sua empresa para configurar as chaves de integração abaixo.</p>
              </>
            ) : (
              <div className="p-3 border border-border/40 bg-[#B49BD4]/5 text-[#B49BD4] rounded-xl flex items-center text-xs font-bold w-full">
                <Database className="w-4 h-4 mr-2" />
                {activeErp} ERP (Ativo e integrado para sua conta)
              </div>
            )}
          </div>

          {/* Active ERP connection details */}
          {(() => {
            const activeConn = erpConnections.find(c => c.id === activeErp.toLowerCase());
            if (!activeConn) return null;
            
            const testState = testingStatus[activeConn.id] || 'idle';
            
            return (
              <div className="p-5 rounded-2xl border bg-white/40 border-lilas/25 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/20 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lilas/10 to-azul/10 border border-border flex items-center justify-center font-bold text-lilas text-sm shrink-0">
                      {activeConn.logo}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-text-primary">{activeConn.name}</span>
                      {activeConn.connected ? (
                        <span className="text-[9px] text-success font-semibold flex items-center gap-0.5">
                          <Check size={10} /> Conexão Estabelecida e Ativa
                        </span>
                      ) : (
                        <span className="text-[9px] text-text-tertiary font-semibold flex items-center gap-0.5">
                          <AlertCircle size={10} /> Não Conectado
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-lilas/10 border border-lilas/25 text-[10px] text-lilas font-bold uppercase tracking-wider">
                    ERP Ativo
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-secondary">Token / API Key</label>
                      <div className="relative">
                        <Key className="absolute left-2.5 top-2.5 text-text-tertiary w-3 h-3" />
                        <input
                          type="password"
                          placeholder="Inserir Token"
                          className="w-full pl-8 pr-2.5 py-1.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-[11px] font-mono font-semibold"
                          value={activeConn.apiKey}
                          onChange={(e) => updateErpConnection(activeConn.id, { apiKey: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-secondary">URL Endpoint API</label>
                      <input
                        type="text"
                        placeholder="https://api.exemplo.com.br"
                        className="p-1.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-[11px] font-semibold"
                        value={activeConn.baseUrl}
                        onChange={(e) => updateErpConnection(activeConn.id, { baseUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/10">
                    <span className="text-[9px] text-text-tertiary font-medium">
                      {activeConn.lastSyncTime ? `Última sincronização: ${activeConn.lastSyncTime}` : 'Conexão pendente de teste'}
                    </span>
                    <button
                      onClick={() => handleTestErp(activeConn.id, activeConn.apiKey, activeConn.baseUrl)}
                      disabled={testState === 'testing'}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-lilas to-azul hover:opacity-90 disabled:opacity-50 text-[10px] font-bold text-white flex items-center gap-1.5 shadow-sm transition"
                    >
                      {testState === 'testing' ? (
                        <RefreshCw className="animate-spin" size={12} />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      Testar Conexão
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default Connections;

