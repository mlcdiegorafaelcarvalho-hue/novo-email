import React, { useState, useMemo } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { ErpField, ErpFieldType } from '../types';
import { 
  Sliders,
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  AlertTriangle, 
  Info,
  HelpCircle,
  Database,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export const ErpLayoutBuilder: React.FC = () => {
  const erpFields = useFlowStore((state) => state.erpFields);
  const activeErp = useFlowStore((state) => state.activeErp);
  const addErpField = useFlowStore((state) => state.addErpField);
  const updateErpField = useFlowStore((state) => state.updateErpField);
  const deleteErpField = useFlowStore((state) => state.deleteErpField);
  const reorderErpFields = useFlowStore((state) => state.reorderErpFields);
  const testPromptExtraction = useFlowStore((state) => state.testPromptExtraction);
  const erpGeneralInstruction = useFlowStore((state) => state.erpGeneralInstruction);
  const setErpGeneralInstruction = useFlowStore((state) => state.setErpGeneralInstruction);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    erpFields[0]?.id || null
  );

  const DEFAULT_PLAYGROUND_EMAIL = `Prezado fornecedor,

Seguem dados para emissão do faturamento do nosso pedido #98721:

CNPJ da Empresa: 47.960.950/0001-21
Razão Social: Magazine Luiza S/A
Valor total negociado: R$ 4.590,20
Prazo de entrega acordado: Boleto bancário para 30 dias.

Ficamos no aguardo da confirmação e do envio do arquivo XML.

Atenciosamente,
Sandra Pires - Departamento de Compras`;

  const [playgroundEmail, setPlaygroundEmail] = useState('');
  const [playgroundPrompt, setPlaygroundPrompt] = useState('');
  const [playgroundResult, setPlaygroundResult] = useState<Record<string, string> | null>(null);
  const [isPlayinggroundLoading, setIsPlayinggroundLoading] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const compiledPrompt = useMemo(() => {
    const baseInstruction = erpGeneralInstruction + '\n\nCampos a serem extraídos:';

    const fieldsList = erpFields.map(f => {
      const spec = f.aiInstruction ? `\n   - Instrução específica: ${f.aiInstruction}` : ' (extrair automaticamente pelo nome)';
      return `- ${f.label} [chave: "${f.name}", tipo: ${f.type}]${spec}`;
    }).join('\n');

    const additional = playgroundPrompt ? `\n\nInstruções adicionais de contexto:\n${playgroundPrompt}` : '';

    return `${baseInstruction}\n${fieldsList}${additional}`;
  }, [erpFields, playgroundPrompt, erpGeneralInstruction]);

  const handleRunExtraction = async () => {
    if (!playgroundEmail.trim()) return;
    setIsPlayinggroundLoading(true);
    try {
      const res = await testPromptExtraction(playgroundPrompt, playgroundEmail);
      setPlaygroundResult(res);
      toast.success('Extração simulada com sucesso!');
    } catch (e) {
      toast.error('Erro na simulação da IA.');
    } finally {
      setIsPlayinggroundLoading(false);
    }
  };

  // Field editor state
  const selectedField = erpFields.find((f) => f.id === selectedFieldId) || null;

  const handleAddField = () => {
    const newField: ErpField = {
      id: Math.random().toString(36).substring(7),
      name: `campo_novo_${Math.floor(100 + Math.random() * 900)}`,
      label: 'Novo Campo Extraído',
      type: 'Text',
      required: false,
      aiInstruction: ''
    };
    addErpField(newField);
    setSelectedFieldId(newField.id);
    toast.success('Novo campo adicionado ao layout!');
  };

  const handleDeleteField = (id: string) => {
    if (erpFields.length <= 1) {
      toast.error('O layout do ERP precisa ter pelo menos um campo.');
      return;
    }
    deleteErpField(id);
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
    toast.success('Campo removido do layout.');
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...erpFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    
    // Swap
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;
    
    reorderErpFields(newFields);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner showing the current Active ERP */}
      <div className="glass-panel p-4 rounded-2xl bg-white/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-lilas/10 text-lilas shrink-0">
            <Database size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-primary">Mapeamento de Layout: ERP {activeErp}</span>
            <span className="text-xs text-text-tertiary">Customize as chaves JSON que a Inteligência Artificial irá preencher para o seu ERP</span>
          </div>
        </div>

        <span className="text-[10px] font-bold bg-success/10 text-success border border-success/20 px-3 py-1 rounded-full uppercase tracking-wider">
          ERP Ativo
        </span>
      </div>

      {/* General AI Instruction Settings Card */}
      <div className="glass-panel p-5 rounded-2xl space-y-3 border border-border/20 bg-white/20">
        <div className="flex items-center gap-2">
          <Sliders className="text-lilas" size={16} />
          <span className="text-[12px] font-bold text-text-primary uppercase tracking-wide">Instrução Geral da IA (System Prompt de Extração)</span>
        </div>
        <p className="text-[10px] text-text-tertiary">
          Defina a regra principal de comportamento do robô de IA para este layout. Essa instrução será enviada no cabeçalho do prompt e servirá de diretriz para extrair todos os campos baseando-se em seus Nomes de Exibição.
        </p>
        <textarea
          rows={2}
          className="w-full p-3 border border-border/60 bg-white focus:bg-white rounded-xl focus:outline-none focus:border-lilas text-xs font-semibold leading-relaxed resize-none font-medium"
          value={erpGeneralInstruction}
          onChange={(e) => setErpGeneralInstruction(e.target.value)}
          placeholder="Escreva a instrução geral para a IA..."
        />
      </div>

      {/* Warning Box */}
      <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 flex items-start gap-3">
        <AlertTriangle className="text-warning shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="text-[12px] font-bold text-text-primary">Regra Fundamental do Mecanismo de Inteligência Artificial</h4>
          <p className="text-[11px] text-text-secondary leading-relaxed mt-1">
            "A IA nunca inventa dados. Se o campo não for encontrado no pedido de compra recebido, ele ficará vazio para revisão e preenchimento manual do operador, prevenindo faturamentos incorretos."
          </p>
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left side: Fields list */}
        <div className="lg:col-span-2 glass-panel rounded-2xl flex flex-col overflow-hidden h-[480px]">
          <div className="p-4 border-b border-border/40 flex items-center justify-between bg-white/30">
            <span className="text-[12px] font-bold text-text-primary">Campos do Layout ({erpFields.length})</span>
            <button
              onClick={handleAddField}
              className="px-2.5 py-1.5 rounded-lg bg-lilas text-white text-[11px] font-bold flex items-center gap-1 hover:bg-lilas/90 transition shadow-sm"
            >
              <Plus size={12} />
              Novo Campo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {erpFields.map((field, idx) => {
              const isSelected = field.id === selectedFieldId;
              return (
                <div
                  key={field.id}
                  onClick={() => setSelectedFieldId(field.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-white border-lilas shadow-sm'
                      : 'bg-white/40 hover:bg-white/70 border-border'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 truncate pr-2">
                    <span className="text-[12px] font-bold text-text-primary truncate">{field.label}</span>
                    <span className="text-[10px] text-text-tertiary font-mono truncate">{field.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={idx === 0}
                      onClick={() => moveField(idx, 'up')}
                      className="p-1 rounded hover:bg-black/5 text-text-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Mover para cima"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      disabled={idx === erpFields.length - 1}
                      onClick={() => moveField(idx, 'down')}
                      className="p-1 rounded hover:bg-black/5 text-text-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Mover para baixo"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteField(field.id)}
                      className="p-1 rounded hover:bg-error/10 text-text-secondary hover:text-error"
                      title="Excluir campo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side: Editor Form */}
        <div className="lg:col-span-3 glass-panel rounded-2xl flex flex-col overflow-hidden h-[480px]">
          {selectedField ? (
            <div className="p-5 flex flex-col justify-between h-full overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <Sliders className="text-lilas" size={16} />
                  <span className="text-[13px] font-bold text-text-primary">Configurar Propriedades do Campo</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Field Label */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-text-secondary">Nome Exibição (Label)</label>
                    <input
                      type="text"
                      className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold"
                      value={selectedField.label}
                      onChange={(e) => updateErpField(selectedField.id, { label: e.target.value })}
                    />
                  </div>

                  {/* Internal JSON Key */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-text-secondary">Chave Interna (JSON/XML Key)</label>
                    <input
                      type="text"
                      className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-mono font-semibold"
                      value={selectedField.name}
                      onChange={(e) => updateErpField(selectedField.id, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-text-secondary">Tipo de Dado</label>
                    <select
                      className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold"
                      value={selectedField.type}
                      onChange={(e) => updateErpField(selectedField.id, { type: e.target.value as ErpFieldType })}
                    >
                      <option value="Text">Texto (String)</option>
                      <option value="Number">Numérico (Float/Int)</option>
                      <option value="Date">Data (DD/MM/AAAA)</option>
                      <option value="Select">Seleção (Lista de Opções)</option>
                      <option value="Boolean">Booleano (Verdadeiro/Falso)</option>
                    </select>
                  </div>

                  {/* Required Switch */}
                  <div className="flex items-center justify-between border border-border/65 bg-white/30 rounded-xl px-4 py-2 mt-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-text-primary">Campo Obrigatório</span>
                      <span className="text-[9px] text-text-tertiary">Barra a integração se vazio</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedField.required}
                        onChange={(e) => updateErpField(selectedField.id, { required: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-text-tertiary/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success"></div>
                    </label>
                  </div>
                </div>

                {/* AI Extraction Prompt */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-text-secondary flex items-center gap-1">
                      <span>Instruções da IA para Extração</span>
                      <Sparkles size={11} className="text-lilas" />
                    </label>
                    <span className="text-[9px] text-text-tertiary">Prompts em linguagem natural</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Opcional. Se vazio, a IA usará o Nome de Exibição (Label) como instrução direta..."
                    className="p-3 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-medium leading-relaxed resize-none placeholder:italic"
                    value={selectedField.aiInstruction}
                    onChange={(e) => updateErpField(selectedField.id, { aiInstruction: e.target.value })}
                  />
                  <p className="text-[9px] text-text-tertiary">
                    * Deixe em branco para permitir extração automática baseada no Nome de Exibição. Preencha apenas para regras customizadas de tratamento de texto.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Default Fallback */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-text-secondary">Valor Padrão (Opcional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Boleto 30 dias"
                      className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold"
                      value={selectedField.defaultValue || ''}
                      onChange={(e) => updateErpField(selectedField.id, { defaultValue: e.target.value })}
                    />
                  </div>

                  {/* Custom Validation Rules */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-text-secondary">Validação de Formato (Regex ou Faixa)</label>
                    <input
                      type="text"
                      placeholder="e.g. ^\d{14}$ (CNPJ sem pontos)"
                      className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-mono font-semibold"
                      value={selectedField.validationRule || ''}
                      onChange={(e) => updateErpField(selectedField.id, { validationRule: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-text-tertiary flex items-center gap-1.5 mt-4 pt-3 border-t border-border/30">
                <Info size={12} className="text-azul" />
                <span>As alterações são aplicadas a todos os novos pedidos e re-sincronizações.</span>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-border/10 flex items-center justify-center text-text-tertiary mb-3">
                <Sliders size={20} />
              </div>
              <p className="text-xs font-bold text-text-secondary">Nenhum campo selecionado</p>
              <p className="text-[11px] text-text-tertiary mt-1">
                Selecione um campo na lista esquerda para editar as configurações e prompts.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Playground Section */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-lilas" size={18} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">Playground de Extração de IA (Simulado)</span>
              <span className="text-xs text-text-tertiary">Cole o corpo de um e-mail bruto para testar a extração em tempo real com base no layout configurado</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPlaygroundEmail(DEFAULT_PLAYGROUND_EMAIL);
              setPlaygroundPrompt('Extraia os dados cadastrais e financeiros do pedido de compra de forma estruturada.');
              setPlaygroundResult(null);
            }}
            className="text-[10px] text-lilas hover:underline font-bold"
          >
            Carregar Exemplo
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary">Corpo do E-mail Bruto</label>
              <textarea
                rows={6}
                placeholder="Cole o texto do e-mail do cliente aqui..."
                className="p-3 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-medium leading-relaxed resize-none font-mono"
                value={playgroundEmail}
                onChange={(e) => setPlaygroundEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary">Instruções Adicionais do Prompt (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: Priorize a extração do CNPJ principal..."
                className="p-2 border border-border/60 bg-white/60 focus:bg-white rounded-lg focus:outline-none focus:border-lilas text-xs font-semibold"
                value={playgroundPrompt}
                onChange={(e) => setPlaygroundPrompt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-text-secondary">
                <span>Prompt Consolidado Gerado (Tokens Otimizados)</span>
                <button
                  type="button"
                  onClick={() => setShowPromptPreview(!showPromptPreview)}
                  className="text-[9px] text-lilas hover:underline font-bold"
                >
                  {showPromptPreview ? 'Ocultar Prompt' : 'Mostrar Prompt Completo'}
                </button>
              </div>
              
              {showPromptPreview && (
                <div className="p-3 bg-slate-900 text-slate-300 border border-slate-800 rounded-xl font-mono text-[9px] max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed animate-fadeIn">
                  {compiledPrompt}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleRunExtraction}
              disabled={isPlayinggroundLoading || !playgroundEmail.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-lilas to-azul hover:opacity-90 disabled:from-text-tertiary/20 disabled:to-text-tertiary/20 disabled:text-text-tertiary font-bold text-white text-[12px] flex items-center justify-center gap-2 shadow-sm transition disabled:cursor-not-allowed"
            >
              {isPlayinggroundLoading ? (
                <>
                  <RefreshCw className="animate-spin text-white" size={14} />
                  <span>Processando com IA...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Testar Extração de IA</span>
                </>
              )}
            </button>
          </div>

          {/* Results Output */}
          <div className="border border-border/40 rounded-xl bg-black/[0.02] p-4 flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 mb-3">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Resultado da Simulação JSON</span>
                {playgroundResult && (
                  <span className="px-1.5 py-0.5 rounded bg-success/15 text-success text-[9px] font-bold">Extraído com Sucesso</span>
                )}
              </div>

              {playgroundResult ? (
                <div className="space-y-3">
                  <pre className="p-3 bg-slate-900/90 text-success-light font-mono text-[10px] rounded-lg overflow-x-auto max-h-[160px] border border-slate-800">
                    {JSON.stringify(playgroundResult, null, 2)}
                  </pre>
                  
                  {/* Visual key-value view */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-border/20 pt-3">
                    {Object.entries(playgroundResult).map(([key, val]) => (
                      <div key={key} className="flex justify-between bg-white/40 border border-border/20 p-1.5 rounded">
                        <span className="font-mono text-text-secondary font-bold truncate max-w-[80px]" title={key}>{key}:</span>
                        <span className="text-text-primary font-bold truncate max-w-[100px]" title={val}>{val || <em className="text-error font-medium not-italic">Vazio</em>}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-8 text-center text-text-tertiary">
                  <Sparkles size={24} className="opacity-40 mb-2 animate-pulse" />
                  <p className="text-xs font-medium">Pronto para simulação</p>
                  <p className="text-[10px] mt-0.5">Clique em "Testar Extração de IA" para visualizar a resposta JSON.</p>
                </div>
              )}
            </div>

            <div className="text-[9px] text-text-tertiary border-t border-border/20 pt-2 mt-4 leading-normal">
              A extração estruturada utiliza o modelo local com as instruções específicas configuradas em cada campo do layout.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ErpLayoutBuilder;
