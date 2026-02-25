-- Remove the overpermissive policy that allows unrestricted access to all reminders
DROP POLICY IF EXISTS "Service can manage all reminders" ON public.reminders;