import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { 
  Settings as SettingsIcon,
  Building2, 
  BrainCircuit, 
  BellRing, 
  Users, 
  Plus, 
  Mail, 
  MessageSquare,
  Phone,
  UserCheck, 
  Trash2,
  AlertCircle,
  HelpCircle,
  Check,
  AlertTriangle,
  Server,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
  const settings = useFlowStore((state) => state.settings);
  const updateSettings = useFlowStore((state) => state.updateSettings);
  const emailConnection = useFlowStore((state) => state.emailConnection);
  const updateEmailConnection = useFlowStore((state) => state.updateEmailConnection);

  // Local state for company name and invitations
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Operador' | 'Visualizador'>('Operador');

  // Email connector states
  const [imapHost, setImapHost] = useState(emailConnection.imapHost || 'imap.minhaempresa.com.br');
  const [imapPort, setImapPort] = useState(emailConnection.imapPort || '993');
  const [imapUser, setImapUser] = useState(emailConnection.imapUser || 'pedidos@minhaempresa.com.br');
  const [imapPassword, setImapPassword] = useState(emailConnection.imapPassword || '••••••••••••');
  const [testingConnection, setTestingConnection] = useState(false);

  const handleSaveEmailConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imapHost || !imapPort || !imapUser) {
      toast.error('Preencha os campos obrigatórios do servidor IMAP.');
      return;
    }

    updateEmailConnection({
      provider: 'IMAP',
      connected: true,
      lastSyncTime: new Date().toLocaleString('pt-BR'),
      imapHost,
      imapPort,
      imapUser,
      imapPassword
    });
    toast.success('Configurações do servidor IMAP salvas com sucesso!');
  };

  const handleTestEmailConnection = () => {
    setTestingConnection(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Testando credenciais do servidor de email...',
        success: () => {
          setTestingConnection(false);
          updateEmailConnection({ connected: true, lastSyncTime: new Date().toLocaleString('pt-BR') });
          return 'Conexão IMAP estabelecida com sucesso!';
        },
        error: () => {
          setTestingConnection(false);
          return 'Erro de conexão ou credenciais inválidas.';
        }
      }
    );
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error('O nome da empresa é obrigatório.');
      return;
    }
    updateSettings({ companyName });
    toast.success('Informações da empresa salvas com sucesso!');
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Informe um e-mail válido para enviar o convite.');
      return;
    }
    
    // Add member to list
    const newMember = {
      id: Math.random().toString(36).substring(7),
      email: inviteEmail,
      role: inviteRole
    };
    
    updateSettings({
      teamMembers: [...settings.teamMembers, newMember]
    });

    setInviteEmail('');
    toast.success('Convite de convocado enviado com sucesso!', {
      description: `Um link de acesso foi disparado para ${inviteEmail}`
    });
  };

  const handleDeleteMember = (id: string) => {
    if (settings.teamMembers.length <= 1) {
      toast.error('É necessário manter pelo menos um membro na equipe.');
      return;
    }
    updateSettings({
      teamMembers: settings.teamMembers.filter(m => m.id !== id)
    });
    toast.success('Membro removido da organização.');
  };



  return (
    <div className="space-y-6">
      {/* Top Banner Info */}
      <div className="flex items-center gap-2">
        <SettingsIcon className="text-lilas" size={20} />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-primary">Configurações Gerais</span>
          <span className="text-xs text-text-tertiary">Gerencie sua conta corporativa, parâmetros de inteligência artificial e acessos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Organization & Billing */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Company profiling */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Building2 className="text-lilas" size={16} />
              <span className="text-[13px] font-bold text-text-primary">Dados da Organização</span>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary">Razão Social / Nome da Empresa</label>
                <input
                  type="text"
                  className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-lilas to-azul text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>

          {/* Section: AI Parameters */}
          <div className="glass-panel p-5 rounded-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <BrainCircuit className="text-lilas" size={16} />
                <span className="text-[13px] font-bold text-text-primary">Parâmetros de Inteligência Artificial</span>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.aiEnabled}
                  onChange={(e) => updateSettings({ aiEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-text-tertiary/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success"></div>
              </label>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                Ajuste a sensibilidade de processamento automático dos pedidos recebidos por e-mail.
              </p>

              {/* Slider for confidence threshold */}
              <div className="space-y-2 p-4 rounded-xl border border-border/40 bg-white/40">
                <div className="flex justify-between items-center text-[11px] font-semibold">
                  <span className="text-text-secondary">Nota Mínima de Confiança da IA</span>
                  <span className="text-lilas font-bold text-xs">{settings.confidenceThreshold}%</span>
                </div>
                
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-lilas"
                  value={settings.confidenceThreshold}
                  onChange={(e) => updateSettings({ confidenceThreshold: parseInt(e.target.value) })}
                />
                
                <div className="flex justify-between text-[9px] text-text-tertiary font-bold mt-1 uppercase">
                  <span>Alta Autonomia (50%)</span>
                  <span>Máxima Segurança (95%)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/50 bg-black/[0.01] flex items-start gap-2.5">
                <AlertCircle size={14} className="text-azul mt-0.5 shrink-0" />
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  Pedidos extraídos pela IA com nota de confiança inferior a <strong>{settings.confidenceThreshold}%</strong> serão automaticamente transferidos para a fila de <strong>Revisão Manual</strong>, bloqueando envios incorretos ao ERP.
                </p>
              </div>

              {/* Toggle for autoSendToErp */}
              <div className="flex items-center justify-between py-2 border-t border-border/10 pt-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-text-primary">Envio Automático ao ERP (Faturamento Direto)</span>
                  <span className="text-[9px] text-text-tertiary">Pedidos com acurácia acima do limite e sem erros serão integrados na hora sem interação humana.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.autoSendToErp}
                    onChange={(e) => {
                      updateSettings({ autoSendToErp: e.target.checked });
                      if (e.target.checked) {
                        toast.success('Envio automático ativado!', {
                          description: `Pedidos acima de ${settings.confidenceThreshold}% e sem pendências serão enviados direto ao ERP.`
                        });
                      } else {
                        toast.info('Envio automático desativado. Os pedidos limpos ficarão no status Aguardando.');
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-text-tertiary/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>
            </div>
          </div>


          {/* Section: Email Templates */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Mail className="text-lilas" size={16} />
              <span className="text-[13px] font-bold text-text-primary">Modelos de Respostas de E-mail (Agente Inteligente)</span>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                Configure os textos padrões que o robô de IA enviará em resposta aos compradores por e-mail. Use o marcador <code className="bg-black/5 px-1 py-0.5 rounded text-lilas font-bold">{`{cliente}`}</code> para inserir o nome do comprador dinamicamente.
              </p>

              {/* Template Confirmar Pedido */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary">👍 Template: Confirmar Pedido</label>
                <textarea
                  rows={3}
                  className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold leading-relaxed"
                  value={settings.replyTemplateConfirm}
                  onChange={(e) => updateSettings({ replyTemplateConfirm: e.target.value })}
                />
              </div>

              {/* Template Inconsistencia */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary">⚠️ Template: Inconsistência de Itens</label>
                <textarea
                  rows={3}
                  className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold leading-relaxed"
                  value={settings.replyTemplateInconsistency}
                  onChange={(e) => updateSettings({ replyTemplateInconsistency: e.target.value })}
                />
              </div>

              {/* Template Solicitar Cadastro */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary">🔍 Template: Solicitar CNPJ / Cadastro</label>
                <textarea
                  rows={3}
                  className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold leading-relaxed"
                  value={settings.replyTemplateNoRegistration}
                  onChange={(e) => updateSettings({ replyTemplateNoRegistration: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section: Email Connections */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Server className="text-lilas" size={16} />
              <span className="text-[13px] font-bold text-text-primary">Conectores de Entrada (Servidor IMAP)</span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Integre seu agente virtual com a caixa postal corporativa de recebimento de pedidos.
            </p>

            {/* Current Status Widget */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              emailConnection.connected 
                ? 'bg-success/5 border-success/20 text-text-primary' 
                : 'bg-error/5 border-error/20 text-text-primary'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  emailConnection.connected ? 'bg-success text-white' : 'bg-error text-white'
                }`}>
                  {emailConnection.connected ? <Check size={16} /> : <AlertTriangle size={16} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold">
                    {emailConnection.connected ? 'Conexão IMAP Ativa & Monitorando' : 'Monitoramento Inativo'}
                  </span>
                  <span className="text-[9px] text-text-tertiary mt-0.5">
                    {emailConnection.lastSyncTime ? `Última sincronização: ${emailConnection.lastSyncTime}` : 'Nunca sincronizado'}
                  </span>
                </div>
              </div>
              
              {emailConnection.connected && (
                <button
                  type="button"
                  onClick={() => {
                    updateEmailConnection({ connected: false });
                    toast.info('Instância IMAP desconectada.');
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-error/30 hover:bg-error/10 text-error text-[10px] font-bold transition cursor-pointer"
                >
                  Desconectar
                </button>
              )}
            </div>

            {/* IMAP Connection form */}
            <form onSubmit={handleSaveEmailConnection} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-text-secondary">Servidor Host IMAP</label>
                  <input
                    type="text"
                    className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-text-secondary">Porta</label>
                  <input
                    type="text"
                    className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-text-secondary">E-mail / Usuário</label>
                <input
                  type="email"
                  className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                  value={imapUser}
                  onChange={(e) => setImapUser(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-text-secondary">Senha de Acesso</label>
                <input
                  type="password"
                  className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold text-text-primary"
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={testingConnection}
                  onClick={handleTestEmailConnection}
                  className="flex-1 py-2.5 rounded-xl border border-border hover:bg-black/5 text-text-secondary text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={testingConnection ? 'animate-spin' : ''} size={14} />
                  Testar Conexão
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rosa to-azul hover:opacity-95 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check size={14} />
                  Salvar Conexão
                </button>
              </div>
            </form>
          </div>

          {/* Section: Notification Settings */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <BellRing className="text-lilas" size={16} />
              <span className="text-[13px] font-bold text-text-primary">Configurações de Notificações</span>
            </div>

            <div className="space-y-3">
              {/* Alert errors */}
              <div className="flex items-center justify-between py-2 border-b border-border/10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-text-primary">Alertar Erros de Conexão</span>
                  <span className="text-[9px] text-text-tertiary">Dispare e-mails emergenciais caso o webhook com o ERP falhar.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyErrors}
                    onChange={(e) => updateSettings({ notifyErrors: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-text-tertiary/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-text-primary">Resumo Diário Operacional</span>
                  <span className="text-[9px] text-text-tertiary">Relatório estatístico consolidado com tráfego e erros da IA.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyDailySummary}
                    onChange={(e) => updateSettings({ notifyDailySummary: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-text-tertiary/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Billing Meter & Team Space */}
        <div className="space-y-6">
          


          {/* Team space */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Users className="text-lilas" size={16} />
              <span className="text-[13px] font-bold text-text-primary">Membros da Equipe</span>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-text-secondary">Convidar por E-mail</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-2.5 top-2.5 text-text-tertiary w-3.5 h-3.5" />
                    <input
                      type="email"
                      placeholder="email@empresa.com"
                      className="w-full pl-8.5 pr-2.5 py-1.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <select
                    className="p-1.5 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-[11px] font-bold shrink-0"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                  >
                    <option value="Operador">Operador</option>
                    <option value="Admin">Admin</option>
                    <option value="Visualizador">Leitor</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-lilas to-azul hover:opacity-90 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-sm transition"
              >
                <Plus size={14} />
                Convidar Membro
              </button>
            </form>

            {/* Members List */}
            <div className="divide-y divide-border/20 pt-2 max-h-[220px] overflow-y-auto">
              {settings.teamMembers.map((member) => (
                <div key={member.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-full bg-lilas/10 flex items-center justify-center font-bold text-lilas text-xs shrink-0">
                      {member.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-[11px] font-bold text-text-primary truncate">{member.email}</span>
                      <span className="text-[9px] text-text-tertiary font-semibold flex items-center gap-0.5">
                        <UserCheck size={9} /> {member.role}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="p-1 rounded hover:bg-error/10 text-text-secondary hover:text-error shrink-0"
                    title="Remover acesso"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
export default Settings;
