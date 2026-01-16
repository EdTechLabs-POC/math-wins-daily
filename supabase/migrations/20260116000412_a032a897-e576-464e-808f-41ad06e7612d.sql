-- Add DELETE policies for all tables that need them

-- Students table - users can delete their own students
CREATE POLICY "Users can delete their own students"
ON public.students FOR DELETE
USING (auth.uid() = user_id);

-- Diagnostics table - users can delete diagnostics for their students
CREATE POLICY "Users can delete diagnostics for their students"
ON public.diagnostics FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = diagnostics.student_id
    AND students.user_id = auth.uid()
  )
);

-- Diagnostic attempts table - users can delete diagnostic attempts for their students
CREATE POLICY "Users can delete diagnostic attempts for their students"
ON public.diagnostic_attempts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.diagnostics d
    JOIN public.students s ON s.id = d.student_id
    WHERE d.id = diagnostic_attempts.diagnostic_id
    AND s.user_id = auth.uid()
  )
);

-- Practice sessions table - users can delete practice sessions for their students
CREATE POLICY "Users can delete practice sessions for their students"
ON public.practice_sessions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = practice_sessions.student_id
    AND students.user_id = auth.uid()
  )
);

-- Daily reports table - users can delete reports for their students
CREATE POLICY "Users can delete reports for their students"
ON public.daily_reports FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = daily_reports.student_id
    AND students.user_id = auth.uid()
  )
);