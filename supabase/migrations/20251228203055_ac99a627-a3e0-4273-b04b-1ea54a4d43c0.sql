-- Create table for suppliers
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, nome)
);

-- Enable RLS for fornecedores
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- RLS policies for fornecedores
CREATE POLICY "Users can view their own fornecedores"
ON public.fornecedores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fornecedores"
ON public.fornecedores FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fornecedores"
ON public.fornecedores FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fornecedores"
ON public.fornecedores FOR DELETE
USING (auth.uid() = user_id);

-- Create table for financial categories
CREATE TABLE public.categorias_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, nome)
);

-- Enable RLS for categorias_financeiras
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;

-- RLS policies for categorias_financeiras
CREATE POLICY "Users can view their own categorias"
ON public.categorias_financeiras FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categorias"
ON public.categorias_financeiras FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categorias"
ON public.categorias_financeiras FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categorias"
ON public.categorias_financeiras FOR DELETE
USING (auth.uid() = user_id);

-- Create table for bills to pay
CREATE TABLE public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_competencia DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  historico TEXT,
  forma_pagamento TEXT DEFAULT 'Dinheiro',
  conta_financeira TEXT DEFAULT 'Caixa',
  categoria_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
  categoria_nome TEXT DEFAULT 'Sem categoria',
  numero_documento TEXT,
  status TEXT NOT NULL DEFAULT 'em_aberto',
  data_pagamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for contas_pagar
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

-- RLS policies for contas_pagar
CREATE POLICY "Users can view their own contas_pagar"
ON public.contas_pagar FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contas_pagar"
ON public.contas_pagar FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contas_pagar"
ON public.contas_pagar FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contas_pagar"
ON public.contas_pagar FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contas_pagar_updated_at
BEFORE UPDATE ON public.contas_pagar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();