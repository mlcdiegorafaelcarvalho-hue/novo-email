import React, { useState, useMemo } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { CatalogProduct } from '../types';
import { useDropzone } from 'react-dropzone';
import { 
  Database, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  RefreshCw, 
  X, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const ProductCatalog: React.FC = () => {
  const catalog = useFlowStore((state) => state.catalog);
  const addCatalogProduct = useFlowStore((state) => state.addCatalogProduct);
  const updateCatalogProduct = useFlowStore((state) => state.updateCatalogProduct);
  const deleteCatalogProduct = useFlowStore((state) => state.deleteCatalogProduct);
  const importCatalog = useFlowStore((state) => state.importCatalog);
  const syncDeParaSuggestions = useFlowStore((state) => state.syncDeParaSuggestions);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  // Form modal states
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Escritório');
  const [price, setPrice] = useState(0);
  const [unit, setUnit] = useState('UN');

  // Unique categories list
  const categories = useMemo(() => {
    const cats = new Set(catalog.map(p => p.category));
    return ['Todos', ...Array.from(cats)];
  }, [catalog]);

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return catalog.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.code.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = categoryFilter === 'Todos' || product.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [catalog, search, categoryFilter]);

  // Drag and Drop Zone handler
  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const loader = toast.loading(`Lendo arquivo ${file.name}...`);
    
    // Simulate CSV parsing
    setTimeout(() => {
      // Mocked products parsed from CSV
      const newParsedProducts: CatalogProduct[] = [
        { code: 'PROD-011', name: 'Organizador de Acrílico Cristal Duplo', description: 'Organizador triplo para documentos', category: 'Organização', price: 59.90, unit: 'UN' },
        { code: 'PROD-012', name: 'Tesoura Multiuso Inox 21cm Tramontina', description: 'Tesoura lâminas de aço inox', category: 'Escritório', price: 18.50, unit: 'UN' },
        { code: 'PROD-013', name: 'Bloco de Notas Autoadesivo 76x76 Post-it', description: 'Bloco 4 cores sortidas 400 fls', category: 'Escritório', price: 22.90, unit: 'PCT' },
        { code: 'PROD-014', name: 'Quadro Branco Magnético 90x60 Alumínio', description: 'Lousa magnética moldura alumínio', category: 'Suprimentos', price: 119.00, unit: 'UN' }
      ];

      importCatalog(newParsedProducts);
      toast.dismiss(loader);
      toast.success('Planilha processada!', {
        description: `${newParsedProducts.length} novos SKUs incorporados ao catálogo.`
      });
    }, 1500);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const handleOpenAdd = () => {
    setEditingCode(null);
    setCode(`PROD-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setDescription('');
    setCategory('Escritório');
    setPrice(0.00);
    setUnit('UN');
    setIsOpenForm(true);
  };

  const handleOpenEdit = (product: CatalogProduct) => {
    setEditingCode(product.code);
    setCode(product.code);
    setName(product.name);
    setDescription(product.description);
    setCategory(product.category);
    setPrice(product.price);
    setUnit(product.unit);
    setIsOpenForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Código e Nome do produto são obrigatórios.');
      return;
    }

    if (editingCode) {
      updateCatalogProduct(editingCode, {
        name,
        description,
        category,
        price,
        unit
      });
      toast.success('Produto atualizado no catálogo!');
    } else {
      // Check duplicate code
      if (catalog.some(p => p.code === code)) {
        toast.error('Já existe um produto com este código SKU.');
        return;
      }
      addCatalogProduct({
        code,
        name,
        description,
        category,
        price,
        unit
      });
      toast.success('Novo produto adicionado ao catálogo!');
    }

    setIsOpenForm(false);
  };

  const handleDelete = (code: string) => {
    if (confirm('Remover este produto poderá invalidar vínculos ativos. Deseja continuar?')) {
      deleteCatalogProduct(code);
      toast.success('Produto excluído do catálogo.');
    }
  };

  const handleReSyncSuggestions = () => {
    const loader = toast.loading('Reanalisando pedidos na inbox com base no catálogo atualizado...');
    setTimeout(() => {
      syncDeParaSuggestions();
      toast.dismiss(loader);
      toast.success('Sugestões re-sincronizadas com sucesso!', {
        description: 'Verifique a Inbox Inteligente para ver novos produtos vinculados.'
      });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Database className="text-lilas" size={20} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-text-primary">Catálogo Corporativo de Produtos</span>
            <span className="text-xs text-text-tertiary">Lista consolidada de mercadorias sincronizada com o ERP</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleReSyncSuggestions}
            className="px-3.5 py-2 rounded-xl border border-border bg-white/60 hover:bg-white text-text-secondary hover:text-text-primary text-[12px] font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className="animate-spin-slow" />
            <span>Re-sincronizar De-Para</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-lilas to-azul hover:opacity-90 text-white text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus size={14} />
            <span>Cadastrar SKU</span>
          </button>
        </div>
      </div>

      {/* Grid: CSV Upload + Categories filter */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* CSV Dropzone */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div 
            {...getRootProps()} 
            className={`glass-panel p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer min-h-[180px] transition ${
              isDragActive 
                ? 'border-lilas bg-lilas/5' 
                : 'border-border/60 hover:border-lilas/40 bg-white/30'
            }`}
          >
            <input {...getInputProps()} />
            <Upload size={32} className="text-lilas mb-3" />
            <span className="text-xs font-bold text-text-secondary">Arraste a Planilha</span>
            <span className="text-[10px] text-text-tertiary mt-1 px-4 leading-relaxed">
              Arraste seu arquivo CSV/XLSX de catálogo ou clique para buscar.
            </span>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-border/40 text-[11px] text-text-secondary leading-relaxed space-y-2.5 bg-white/20">
            <div className="flex items-center gap-2 font-bold text-text-primary">
              <AlertCircle size={13} className="text-azul animate-bounce-slow" />
              <span>Dados de Integração</span>
            </div>
            <p>Total de SKUs: <strong className="text-text-primary">{catalog.length}</strong></p>
            <p>Última Sincronização: <strong className="text-text-primary">27/05/2026 17:30</strong></p>
          </div>
        </div>

        {/* Catalog Table */}
        <div className="lg:col-span-3 glass-panel rounded-2xl flex flex-col overflow-hidden">
          {/* Table Header Filter */}
          <div className="p-4 border-b border-border/40 bg-white/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 text-text-tertiary w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por código, nome ou descrição..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/60 bg-white/60 focus:outline-none focus:border-lilas text-xs font-semibold"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap transition ${
                    categoryFilter === cat
                      ? 'bg-lilas text-white border-lilas'
                      : 'bg-white/60 text-text-secondary border-border/60 hover:bg-white hover:text-text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/25 bg-black/[0.01] text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="py-3 px-5">Código SKU</th>
                  <th className="py-3 px-5">Nome do SKU</th>
                  <th className="py-3 px-5">Categoria</th>
                  <th className="py-3 px-5">Preço Unit.</th>
                  <th className="py-3 px-5 text-center">Unidade</th>
                  <th className="py-3 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-[12px]">
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-tertiary">
                      Nenhum produto cadastrado com estas chaves de busca.
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((product) => (
                    <tr key={product.code} className="hover:bg-white/40 transition">
                      <td className="py-3.5 px-5 font-mono text-[11px] font-bold text-text-secondary">{product.code}</td>
                      <td className="py-3.5 px-5 font-bold text-text-primary">
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          <span className="text-[10px] text-text-tertiary font-normal mt-0.5">{product.description}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-text-secondary">{product.category}</td>
                      <td className="py-3.5 px-5 font-bold text-text-primary">
                        R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className="px-2 py-0.5 rounded bg-black/5 text-[10px] font-bold text-text-secondary">
                          {product.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="p-1.5 rounded-lg hover:bg-black/5 text-text-secondary hover:text-text-primary"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.code)}
                          className="p-1.5 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {isOpenForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-filter backdrop-blur-md rounded-2xl border border-border max-w-md w-full p-6 shadow-2xl animate-fadeIn space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <h3 className="text-sm font-bold text-text-primary">
                {editingCode ? 'Editar SKU' : 'Adicionar SKU ao Catálogo'}
              </h3>
              <button onClick={() => setIsOpenForm(false)} className="p-1 rounded-lg hover:bg-black/5 text-text-secondary">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Code SKU */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary">Código SKU</label>
                  <input
                    type="text"
                    disabled={editingCode !== null}
                    placeholder="e.g. PROD-001"
                    className="p-2 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-mono font-semibold disabled:bg-black/5"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </div>

                {/* Unit */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary">Unidade de Medida</label>
                  <input
                    type="text"
                    placeholder="e.g. UN, CX, PCT"
                    className="p-2 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Nome do Produto</label>
                <input
                  type="text"
                  placeholder="e.g. Resma de Papel Chamex A4"
                  className="p-2 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Descrição Curta</label>
                <input
                  type="text"
                  placeholder="Detalhes técnicos ou modelo"
                  className="p-2 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary">Categoria</label>
                  <select
                    className="p-2 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Escritório">Escritório</option>
                    <option value="Suprimentos">Suprimentos</option>
                    <option value="Organização">Organização</option>
                    <option value="Embalagem">Embalagem</option>
                    <option value="Serviços">Serviços</option>
                  </select>
                </div>

                {/* Price */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary">Preço Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="p-2 border border-border/60 bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenForm(false)}
                  className="px-4 py-2 border border-border bg-white rounded-xl text-xs font-bold text-text-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-lilas to-azul text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProductCatalog;
