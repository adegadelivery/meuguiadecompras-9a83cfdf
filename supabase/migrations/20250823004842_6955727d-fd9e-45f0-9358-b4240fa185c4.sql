-- Criar tabela de cupons
CREATE TABLE public.cupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  loja_nome TEXT NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  data_compra TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  imagem_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de produtos
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cupom_id UUID NOT NULL REFERENCES public.cupons(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Create policies for cupons table
CREATE POLICY "Users can view their own cupons" 
ON public.cupons 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cupons" 
ON public.cupons 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cupons" 
ON public.cupons 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cupons" 
ON public.cupons 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for produtos table
CREATE POLICY "Users can view produtos from their cupons" 
ON public.produtos 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.cupons 
  WHERE cupons.id = produtos.cupom_id 
  AND cupons.user_id = auth.uid()
));

CREATE POLICY "Users can create produtos for their cupons" 
ON public.produtos 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cupons 
  WHERE cupons.id = produtos.cupom_id 
  AND cupons.user_id = auth.uid()
));

CREATE POLICY "Users can update produtos from their cupons" 
ON public.produtos 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.cupons 
  WHERE cupons.id = produtos.cupom_id 
  AND cupons.user_id = auth.uid()
));

CREATE POLICY "Users can delete produtos from their cupons" 
ON public.produtos 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.cupons 
  WHERE cupons.id = produtos.cupom_id 
  AND cupons.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cupons_updated_at
  BEFORE UPDATE ON public.cupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_cupons_user_id ON public.cupons(user_id);
CREATE INDEX idx_cupons_data_compra ON public.cupons(data_compra DESC);
CREATE INDEX idx_cupons_loja_nome ON public.cupons(loja_nome);
CREATE INDEX idx_produtos_cupom_id ON public.produtos(cupom_id);
CREATE INDEX idx_produtos_nome ON public.produtos(nome);