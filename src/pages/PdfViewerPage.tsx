import React from 'react';
import { useParams } from 'react-router-dom';
import { useFlowStore } from '../store/useFlowStore';
import { Printer, Download, FileText, Sparkles } from 'lucide-react';

export const PdfViewerPage: React.FC = () => {
  const { emailId } = useParams<{ emailId: string }>();
  const emails = useFlowStore((state) => state.emails);
  const email = emails.find((e) => e.id === emailId);

  if (!email) {
    return (
      <div className="min-h-screen bg-slate-800 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-xl font-bold">Documento não encontrado</h1>
        <p className="text-sm text-slate-400 mt-2">O código do pedido é inválido ou não existe.</p>
      </div>
    );
  }

  const formatCNPJ = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length !== 14) return val;
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-750 flex flex-col select-none">
      {/* PDF Viewer Header Bar */}
      <header className="bg-slate-900 text-white h-12 px-6 flex items-center justify-between border-b border-slate-800 shadow-md shrink-0">
        <div className="flex items-center gap-2.5">
          <FileText className="text-azul w-5 h-5" />
          <span className="text-xs font-bold font-mono tracking-wide">{email.attachmentName || 'pedido_compra.pdf'}</span>
          <span className="px-1.5 py-0.5 rounded bg-azul/20 text-azul font-bold text-[8px]">OCR AUTOMÁTICO</span>
        </div>

        {/* Mocks toolbar */}
        <div className="flex items-center gap-4 text-slate-300 text-xs">
          <button 
            onClick={handlePrint}
            className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition flex items-center gap-1.5"
            title="Imprimir documento"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          <button 
            onClick={() => {
              const element = document.createElement("a");
              const file = new Blob([email.rawBody], {type: 'text/plain'});
              element.href = URL.createObjectURL(file);
              element.download = email.attachmentName || "pedido.pdf";
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }}
            className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition flex items-center gap-1.5"
            title="Download PDF"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </header>

      {/* Main viewport */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start bg-slate-800">
        <div className="relative w-full max-w-[680px] bg-white shadow-2xl border border-slate-400 rounded-md p-10 font-sans text-slate-800 text-xs space-y-6 min-h-[840px] my-4 leading-relaxed text-left">
          {/* Watermark/AI floating help */}
          <div className="absolute top-2 right-4 text-[9px] text-slate-400 font-bold flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 shadow-sm pointer-events-none">
            <Sparkles size={10} className="text-lilas" />
            <span>Passe o mouse sobre os blocos para ver as informações extraídas pela IA</span>
          </div>

          {/* PO Header */}
          <div className="flex justify-between items-start border-b pb-4 border-slate-200">
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">PEDIDO DE COMPRA B2B</h1>
              <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">ORDEM DE COMPRA INTERNA DE MATERIAIS</p>
            </div>
            
            {/* Bounding Box: Código do Pedido */}
            <div className="group relative px-3 py-1.5 rounded border border-azul bg-azul/5 cursor-help transition hover:bg-azul/10">
              <span className="block text-[7px] text-slate-400 font-bold uppercase">Nº do Pedido</span>
              <span className="font-bold text-slate-800 text-sm">
                {email.extractedFields.codigo_pedido || email.extractedFields.C7_NUM || email.extractedFields.codigo_pedido_cliente || email.extractedFields.SAP_PurchaseOrder || email.extractedFields.numPedCli || 'PED-4412'}
              </span>
              
              {/* Tooltip */}
              <div className="absolute right-0 bottom-full mb-1.5 w-48 p-2 rounded bg-slate-900 text-white text-[10px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-150 shadow-lg z-50 pointer-events-none">
                <span className="block font-bold text-lilas">Campo: Número Pedido</span>
                <span className="block mt-0.5 text-slate-300 font-normal">Valor extraído pela IA com alta taxa de acurácia.</span>
              </div>
            </div>
          </div>

          {/* Buyer & Vendor grid */}
          <div className="grid grid-cols-2 gap-6 border-b pb-4 border-slate-200">
            <div className="space-y-1.5">
              <h3 className="font-bold text-slate-900 uppercase text-[9px] tracking-wider">Dados do Comprador</h3>
              
              {/* Bounding Box: Razão Social */}
              <div className="group relative p-1 rounded border border-transparent hover:border-lilas hover:bg-lilas/5 cursor-help transition">
                <p className="font-bold text-slate-800">{email.extractedFields.cliente_razao || 'Magazine Luiza S/A'}</p>
                <div className="absolute left-0 bottom-full mb-1.5 w-48 p-2 rounded bg-slate-900 text-white text-[10px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-150 shadow-lg z-50 pointer-events-none">
                  <span className="block font-bold text-lilas">Campo: Razão Social</span>
                  <span className="block mt-0.5 text-slate-300 font-normal">Nome corporativo oficial extraído.</span>
                </div>
              </div>

              {/* Bounding Box: CNPJ */}
              <div className="group relative p-1 rounded border border-transparent hover:border-lilas hover:bg-lilas/5 cursor-help transition">
                <p className="font-mono text-slate-600 text-xs">
                  CNPJ: {formatCNPJ(email.extractedFields.cliente_cnpj || email.extractedFields.C7_CLIENTE || email.extractedFields.cnpj_cliente || email.extractedFields.SAP_TaxID || email.extractedFields.cgcCli || '47960950000121')}
                </p>
                <div className="absolute left-0 bottom-full mb-1.5 w-48 p-2 rounded bg-slate-900 text-white text-[10px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-150 shadow-lg z-50 pointer-events-none">
                  <span className="block font-bold text-lilas">Campo: CNPJ</span>
                  <span className="block mt-0.5 text-slate-300 font-normal">CNPJ do comprador faturado.</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 uppercase text-[9px] tracking-wider">Dados do Fornecedor</h3>
              <p className="font-bold text-slate-800">Softeum Logística Integrada</p>
              <p className="text-slate-500 font-mono text-xs">CNPJ: 10.923.882/0001-90</p>
            </div>
          </div>

          {/* Dates & Payments grid */}
          <div className="grid grid-cols-2 gap-6 border-b pb-4 border-slate-200">
            {/* Bounding Box: Data de Emissão */}
            <div className="group relative p-2.5 rounded border border-slate-200 bg-slate-50 hover:bg-lilas/5 hover:border-lilas cursor-help transition">
              <span className="block text-[8px] text-slate-400 font-bold uppercase">Data de Emissão</span>
              <span className="font-semibold text-slate-800">
                {email.extractedFields.data_emissao || email.extractedFields.C7_EMISSAO || email.extractedFields.datEmi || '2026-05-27'}
              </span>
              <div className="absolute left-0 bottom-full mb-1.5 w-48 p-2 rounded bg-slate-900 text-white text-[10px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-150 shadow-lg z-50 pointer-events-none">
                <span className="block font-bold text-lilas">Campo: Data Emissão</span>
                <span className="block mt-0.5 text-slate-300 font-normal">Data oficial do pedido.</span>
              </div>
            </div>

            {/* Bounding Box: Condição de Pagamento */}
            <div className="group relative p-2.5 rounded border border-slate-200 bg-slate-50 hover:bg-lilas/5 hover:border-lilas cursor-help transition">
              <span className="block text-[8px] text-slate-400 font-bold uppercase">Condição de Faturamento</span>
              <span className="font-semibold text-slate-800">
                {email.extractedFields.condicao_pagamento || email.extractedFields.C7_CONDPAG || email.extractedFields.SAP_PaymentTerms || 'Boleto 30 dias'}
              </span>
              <div className="absolute left-0 bottom-full mb-1.5 w-48 p-2 rounded bg-slate-900 text-white text-[10px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-150 shadow-lg z-50 pointer-events-none">
                <span className="block font-bold text-lilas">Campo: Condição Pagamento</span>
                <span className="block mt-0.5 text-slate-300 font-normal">Forma de pagamento extraída do texto.</span>
              </div>
            </div>
          </div>

          {/* Product list */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 uppercase text-[9px] tracking-wider">Produtos solicitados</h3>
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200 text-[10px]">
                  <th className="p-2 border border-slate-200">Descrição do Produto</th>
                  <th className="p-2 text-center border border-slate-200 w-16">Qtd</th>
                  <th className="p-2 text-right border border-slate-200 w-28">Preço Unit.</th>
                  <th className="p-2 text-right border border-slate-200 w-28">Preço Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {email.rawItems.map((it, idx) => (
                  <tr key={idx} className="text-slate-600 hover:bg-slate-50/50">
                    <td className="p-2 border border-slate-200 font-medium">{it.rawDescription}</td>
                    <td className="p-2 text-center border border-slate-200 font-bold">{it.quantity}</td>
                    <td className="p-2 text-right border border-slate-200 font-mono">R$ {it.unitPrice.toFixed(2)}</td>
                    <td className="p-2 text-right border border-slate-200 font-bold text-lilas font-mono">R$ {(it.quantity * it.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total amount */}
          <div className="flex justify-end pt-3">
            {/* Bounding Box: Valor Total */}
            <div className="group relative p-3 rounded border border-slate-200 bg-slate-50 hover:bg-lilas/5 hover:border-lilas cursor-help transition flex items-baseline gap-3">
              <span className="text-[8px] text-slate-400 font-bold uppercase">Total da Compra</span>
              <span className="font-bold text-base text-slate-900">
                R$ {parseFloat(email.extractedFields.valor_total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <div className="absolute right-0 bottom-full mb-1.5 w-48 p-2 rounded bg-slate-900 text-white text-[10px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-150 shadow-lg z-50 pointer-events-none">
                <span className="block font-bold text-lilas">Campo: Valor Total</span>
                <span className="block mt-0.5 text-slate-300 font-normal">Valor acumulado final.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfViewerPage;
