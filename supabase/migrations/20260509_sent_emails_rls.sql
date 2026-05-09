-- Enable RLS and add policies for sent_emails
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

-- Policy for viewing emails (own company's emails)
CREATE POLICY "Users can view own company emails" ON public.sent_emails
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Policy for inserting emails
CREATE POLICY "Users can insert emails" ON public.sent_emails
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Policy for updating emails (e.g. starring, snoozing)
CREATE POLICY "Users can update own company emails" ON public.sent_emails
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Policy for deleting emails
CREATE POLICY "Users can delete own company emails" ON public.sent_emails
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );
