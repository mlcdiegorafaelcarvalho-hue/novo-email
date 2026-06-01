import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlowStore } from '../store/useFlowStore';
import BackgroundOrbs from '../components/BackgroundOrbs';
import { Sparkles, User, Lock, ArrowRight, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const login = useFlowStore((state) => state.login);
  const currentUser = useFlowStore((state) => state.currentUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const getTenantFromEmail = (inputEmail: string) => {
    const e = inputEmail.toLowerCase().trim();
    if (e.includes('magalu')) {
      return { role: 'Operador' as const, companyId: 'comp-2' };
    }
    if (e.includes('carrefour')) {
      return { role: 'Visualizador' as const, companyId: 'comp-3' };
    }
    // Default to Objetivo (comp-1) for everything else
    return { role: 'Admin' as const, companyId: 'comp-1' };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Por favor, informe seu e-mail.');
      return;
    }
    if (!password) {
      toast.error('Por favor, digite sua senha.');
      return;
    }

    const tenant = getTenantFromEmail(email);
    login(email, tenant.role, tenant.companyId);
    toast.success('Login realizado com sucesso!');
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      toast.error('Por favor, informe seu e-mail para recuperação.');
      return;
    }
    
    toast.success(`E-mail de recuperação enviado para ${recoveryEmail}!`);
    setRecoveryEmail('');
    setIsRecovering(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <BackgroundOrbs />

      <div className="w-full max-w-[440px] z-10">
        {/* Logo/Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rosa via-lilas to-azul flex items-center justify-center shadow-lg mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col items-center">
            <span className="font-extrabold text-[22px] text-text-primary tracking-tight leading-tight">Softeum Flow</span>
            <span className="text-[10px] text-text-secondary font-bold tracking-widest uppercase mt-0.5">WhatsApp AI Ingestion</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-8 rounded-3xl bg-white/70 shadow-2xl relative">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-lilas/10 rounded-full blur-3xl -z-10" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-rosa/10 rounded-full blur-3xl -z-10" />

          {!isRecovering ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email field */}
              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1.5 uppercase tracking-wide">
                  E-mail
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu e-mail cadastrado"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-white/80 focus:border-lilas focus:ring-1 focus:ring-lilas text-[13px] outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1.5 uppercase tracking-wide">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha de acesso"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-white/80 focus:border-lilas focus:ring-1 focus:ring-lilas text-[13px] outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Submit & Recovery */}
              <div className="pt-2 space-y-4">
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-rosa via-lilas to-azul hover:opacity-95 text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <span>Entrar</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsRecovering(true)}
                    className="text-[12px] font-semibold text-lilas hover:text-rosa transition"
                  >
                    Recuperar Senha
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRecoverySubmit} className="space-y-5">
              {/* Recovery Email field */}
              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1.5 uppercase tracking-wide">
                  E-mail para recuperação
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="exemplo@empresa.com.br"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-white/80 focus:border-lilas focus:ring-1 focus:ring-lilas text-[13px] outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-rosa via-lilas to-azul hover:opacity-95 text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <span>Enviar E-mail de Recuperação</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </button>

                {/* Back to login link */}
                <button
                  type="button"
                  onClick={() => setIsRecovering(false)}
                  className="w-full h-11 rounded-xl border border-border/60 hover:bg-black/5 text-text-secondary font-semibold text-[13px] flex items-center justify-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para o Login</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
