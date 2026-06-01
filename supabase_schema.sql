-- Script de Configuração de Tabelas para o Supabase - Softeum Flow

-- 1. Clientes pré-cadastrados no ERP (Simulação de sincronização de cadastros)
CREATE TABLE IF NOT EXISTS erp_customers (
  id TEXT PRIMARY KEY,
  cnpj TEXT UNIQUE NOT NULL,
  razao_social TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Dicionário De-Para de Clientes (Vincula CNPJ/E-mail do email a um ID de cliente no ERP)
CREATE TABLE IF NOT EXISTS depara_clientes (
  id TEXT PRIMARY KEY,
  incoming_cnpj TEXT UNIQUE,
  incoming_email TEXT UNIQUE,
  incoming_name TEXT NOT NULL,
  erp_customer_code TEXT REFERENCES erp_customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Confirmado'::text NOT NULL, -- 'Confirmado', 'Pendente'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Catálogo Corporativo de Produtos (Sincronizado do ERP)
CREATE TABLE IF NOT EXISTS catalog_products (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  unit TEXT DEFAULT 'UN'::text NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Dicionário De-Para de Produtos (Vincula termo informal do email ao SKU do catálogo por cliente)
CREATE TABLE IF NOT EXISTS depara_mappings (
  id TEXT PRIMARY KEY,
  incoming_term TEXT NOT NULL,
  catalog_code TEXT REFERENCES catalog_products(code) ON DELETE CASCADE,
  confidence INT DEFAULT 100 NOT NULL,
  status TEXT DEFAULT 'Confirmado'::text NOT NULL, -- 'Confirmado', 'Sugerido pela IA', 'Pendente'
  client_cnpj TEXT,
  client_name TEXT,
  description TEXT,
  mapping_type TEXT DEFAULT 'Manual'::text NOT NULL, -- 'Manual', 'Automático'
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (incoming_term, client_cnpj)
);

-- 5. Configuração de Layouts de Campos do ERP
CREATE TABLE IF NOT EXISTS erp_layout_fields (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT DEFAULT 'Text'::text NOT NULL, -- 'Text', 'Number', 'Date', 'Select', 'Boolean'
  required BOOLEAN DEFAULT false NOT NULL,
  ai_instruction TEXT NOT NULL,
  default_value TEXT,
  validation_rule TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Caixa de Inbox e Pedidos Automatizados
CREATE TABLE IF NOT EXISTS emails_orders (
  id TEXT PRIMARY KEY,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  received_at TEXT NOT NULL,
  status TEXT DEFAULT 'Aguardando'::text NOT NULL, -- 'Aguardando', 'Processando', 'Enviado ao ERP', 'Erro', 'Revisão Manual'
  raw_body TEXT NOT NULL,
  extracted_fields JSONB DEFAULT '{}'::jsonb NOT NULL,
  mapped_fields JSONB DEFAULT '{}'::jsonb NOT NULL,
  items JSONB DEFAULT '[]'::jsonb NOT NULL,
  raw_items JSONB DEFAULT '[]'::jsonb NOT NULL,
  erp_target TEXT DEFAULT 'Bling'::text NOT NULL,
  error_message TEXT,
  confidence_score INT DEFAULT 100 NOT NULL,
  replies JSONB DEFAULT '[]'::jsonb NOT NULL,
  attachment_name TEXT,
  erp_payload_sent TEXT,
  erp_response_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Integrações de Entrada (Email) e Saída (ERPs)
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY, -- 'email', 'bling', 'totvs', 'omie', 'sap', 'senior', 'custom'
  name TEXT NOT NULL,
  logo TEXT,
  connected BOOLEAN DEFAULT false NOT NULL,
  api_key TEXT,
  base_url TEXT,
  last_sync_time TEXT,
  extra_config JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- 8. Configurações Globais do Sistema
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'global_settings'::text,
  company_name TEXT DEFAULT 'Softeum Logística Integrada Ltda'::text NOT NULL,
  ai_enabled BOOLEAN DEFAULT true NOT NULL,
  confidence_threshold INT DEFAULT 80 NOT NULL,
  notify_errors BOOLEAN DEFAULT true NOT NULL,
  notify_daily_summary BOOLEAN DEFAULT true NOT NULL,
  usage_count INT DEFAULT 1420 NOT NULL,
  usage_limit INT DEFAULT 5000 NOT NULL
);

-- Popula os dados iniciais dos clientes oficiais do ERP (Para testes práticos)
INSERT INTO erp_customers (id, cnpj, razao_social) VALUES
  ('CLI-001', '47960950000121', 'Magazine Luiza S/A'),
  ('CLI-002', '45543915000181', 'Carrefour Brasil S/A'),
  ('CLI-003', '60409075000152', 'Colégio Objetivo Metropolitano'),
  ('CLI-004', '01992831000199', 'Lima & Rezende Advocacia'),
  ('CLI-005', '12345678000199', 'Distribuidora Silva & Filhos Ltda')
ON CONFLICT (id) DO NOTHING;

-- Popula os dados iniciais do De-Para de Clientes cadastrados
INSERT INTO depara_clientes (id, incoming_cnpj, incoming_name, erp_customer_code, status) VALUES
  ('c-map-1', '47960950000121', 'MAGALU', 'CLI-001', 'Confirmado'),
  ('c-map-2', '45543915000181', 'Carrefour Brasil', 'CLI-002', 'Confirmado'),
  ('c-map-3', '60409075000152', 'COLÉGIO OBJETIVO', 'CLI-003', 'Confirmado')
ON CONFLICT (id) DO NOTHING;

-- Popula as configurações globais iniciais se não existirem
INSERT INTO settings (id, company_name, ai_enabled, confidence_threshold, notify_errors, notify_daily_summary, usage_count, usage_limit)
VALUES ('global_settings', 'Softeum Logística Integrada Ltda', true, 80, true, true, 1420, 5000)
ON CONFLICT (id) DO NOTHING;

-- Migração incremental (Adiciona colunas caso a tabela já exista na base de produção)
ALTER TABLE emails_orders ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE emails_orders ADD COLUMN IF NOT EXISTS erp_payload_sent TEXT;
ALTER TABLE emails_orders ADD COLUMN IF NOT EXISTS erp_response_log TEXT;
