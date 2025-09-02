-- Update the quantidade column from integer to numeric to support decimal quantities
ALTER TABLE public.produtos 
ALTER COLUMN quantidade TYPE numeric(10,3);