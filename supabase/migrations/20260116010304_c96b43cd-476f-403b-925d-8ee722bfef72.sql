-- Fix question_bank_safe view security
-- Drop and recreate view with security_barrier to prevent information leakage
DROP VIEW IF EXISTS public.question_bank_safe;

-- Create view that only works when accessed via service role
-- The security_invoker=on means RLS policies of the base table apply
CREATE VIEW public.question_bank_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  topic,
  question_text,
  difficulty,
  question_type,
  question_data,
  options,
  usage_count,
  created_at
FROM public.question_bank;

-- The base table question_bank already has service_role only RLS policy,
-- so with security_invoker=on, the view inherits that restriction