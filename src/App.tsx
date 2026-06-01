import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import WhatsAppInbox from './pages/WhatsAppInbox';
import ErpLayoutBuilder from './pages/ErpLayoutBuilder';
import DePara from './pages/DePara';
import ProductCatalog from './pages/ProductCatalog';
import OrderProcessing from './pages/OrderProcessing';
import Connections from './pages/Connections';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { PdfViewerPage } from './pages/PdfViewerPage';
import React, { useEffect } from 'react';
import { useFlowStore } from './store/useFlowStore';
import { Toaster } from 'sonner';

// Authentication Route Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const currentUser = useFlowStore((state) => state.currentUser);
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const fetchInitialData = useFlowStore((state) => state.fetchInitialData);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return (
    <BrowserRouter>
      {/* Toast notifications config */}
      <Toaster 
        position="top-right" 
        expand={true} 
        richColors 
        toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(180, 155, 212, 0.18)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(26, 31, 54, 0.04)',
            color: '#1A1F36',
          }
        }} 
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pdf-viewer/:emailId" element={<ProtectedRoute><PdfViewerPage /></ProtectedRoute>} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inbox" element={<WhatsAppInbox />} />
          <Route path="/erp-layout" element={<ErpLayoutBuilder />} />
          <Route path="/depara" element={<DePara />} />
          <Route path="/catalogo" element={<ProductCatalog />} />
          <Route path="/pedidos" element={<OrderProcessing />} />
          <Route path="/conexoes" element={<Connections />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
