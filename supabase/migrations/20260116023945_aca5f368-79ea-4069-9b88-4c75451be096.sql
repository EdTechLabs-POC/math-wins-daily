-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own students" ON public.students;

-- Create a new UPDATE policy that allows:
-- 1. Users to update students they own (user_id = auth.uid())
-- 2. New users to claim unclaimed students with matching email
CREATE POLICY "Users can update their own students or claim by email"
ON public.students
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR (
    user_id IS NULL 
    AND parent_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = user_id 
  OR (
    user_id IS NULL 
    AND parent_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);