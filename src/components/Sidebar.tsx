import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useFlowStore } from '../store/useFlowStore';
import { 
  LayoutDashboard, 
  Inbox, 
  MessageSquare,
  Sliders, 
  ArrowLeftRight, 
  Database, 
  FileSpreadsheet, 
  Link2, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Shield,
  LogOut,
  Building2,
  DollarSign,
  Cpu,
  Home
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useFlowStore((state) => state.currentUser);
  const logout = useFlowStore((state) => state.logout);

  const isAdmin = currentUser?.role === 'Admin';

  const menuItems = [
    { path: '/dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { path: '/inbox', label: 'E-mail Inbox', icon: Inbox, badge: 'emails' },
    { path: '/erp-layout', label: 'Layout do ERP', icon: Sliders },
    { path: '/depara', label: 'Dicionário De-Para', icon: ArrowLeftRight },
    { path: '/catalogo', label: 'Catálogo de Produtos', icon: Database },
    { path: '/pedidos', label: 'Pedidos Processados', icon: FileSpreadsheet },
    ...(isAdmin ? [{ path: '/conexoes', label: 'Integrações', icon: Link2 }] : []),
    { path: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  const displayName = currentUser?.name || 'Sem Nome';
  const displayEmail = currentUser?.email || 'operador@softeum.com.br';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'US';

  return (
    <aside 
      className={`glass-panel h-screen fixed left-0 top-0 z-40 border-r border-border bg-white/60 flex flex-col justify-between transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Logo Section */}
        <div className={`p-5 flex items-center border-b border-border/40 relative ${collapsed ? 'justify-center px-4' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rosa via-lilas to-azul flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col whitespace-nowrap">
                <span className="font-semibold text-text-primary tracking-tight text-[16px]">Softeum</span>
                <span className="text-[11px] text-text-tertiary font-medium tracking-wider uppercase">Flow AI</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex absolute -right-3.5 top-6 bg-white border border-border shadow-sm p-1 rounded-full text-text-secondary hover:text-text-primary hover:bg-black/5 z-50 items-center justify-center w-7 h-7"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-[14px] transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-gradient-to-r from-lilas/10 to-azul/10 text-lilas border border-lilas/20 shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-black/5 border border-transparent'
                }
              `}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="whitespace-nowrap truncate">{item.label}</span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-text-primary text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap shadow-md z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Profile or Small Brand */}
      <div className={`p-4 border-t border-border/40 flex ${collapsed ? 'flex-col items-center gap-3' : 'items-center justify-between gap-2'} overflow-hidden`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-full bg-[#B49BD4]/20 border border-[#B49BD4]/30 flex items-center justify-center shrink-0" title={collapsed ? `${displayName} (${displayEmail})` : undefined}>
            <span className="text-xs font-semibold text-text-primary">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate whitespace-nowrap">
              <span className="text-xs font-semibold text-text-primary truncate">{displayName}</span>
              <span className="text-[9px] text-text-tertiary truncate">{displayEmail}</span>
            </div>
          )}
        </div>
        <button 
          onClick={handleLogoutClick}
          className="p-1.5 rounded-lg text-text-secondary hover:text-error hover:bg-error/5 transition shrink-0 cursor-pointer"
          title="Sair da Conta"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
