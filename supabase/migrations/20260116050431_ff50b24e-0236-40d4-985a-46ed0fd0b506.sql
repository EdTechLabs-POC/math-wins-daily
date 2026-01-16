-- Backend allowlist check callable before login
CREATE OR REPLACE FUNCTION public.is_email_allowlisted(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE lower(trim(s.parent_email)) = lower(trim(p_email))
  );
$$;

REVOKE ALL ON FUNCTION public.is_email_allowlisted(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_email_allowlisted(TEXT) TO anon, authenticated;

-- Fix case sensitivity in the "claim by email" UPDATE policy
DROP POLICY IF EXISTS "Users can update their own students or claim by email" ON public.students;

CREATE POLICY "Users can update their own students or claim by email"
ON public.students
FOR UPDATE
USING (
  auth.uid() = user_id
  OR (
    user_id IS NULL
    AND lower(parent_email) = lower((
      SELECT users.email
      FROM auth.users
      WHERE users.id = auth.uid()
    ))
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR (
    user_id IS NULL
    AND lower(parent_email) = lower((
      SELECT users.email
      FROM auth.users
      WHERE users.id = auth.uid()
    ))
  )
);
