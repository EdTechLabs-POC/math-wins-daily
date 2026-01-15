-- Recreate view with security_invoker to prevent privilege escalation
DROP VIEW IF EXISTS public.question_bank_safe;

CREATE VIEW public.question_bank_safe
WITH (security_invoker=on) AS
SELECT id, topic, difficulty, question_type, question_text, question_data, options, usage_count, created_at
FROM public.question_bank;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.question_bank_safe TO authenticated;