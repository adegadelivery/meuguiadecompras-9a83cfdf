-- Adicionar novas colunas à tabela produtos para melhor extração
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS preco_unitario DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS unidade TEXT DEFAULT 'un',
ADD COLUMN IF NOT EXISTS palavras_chave TEXT[];

-- Criar índice para busca por palavras-chave
CREATE INDEX IF NOT EXISTS idx_produtos_palavras_chave ON public.produtos USING GIN(palavras_chave);

-- Atualizar produtos existentes que não têm preco_unitario definido
UPDATE public.produtos 
SET preco_unitario = CASE 
  WHEN quantidade > 0 THEN preco / quantidade 
  ELSE preco 
END
WHERE preco_unitario IS NULL;