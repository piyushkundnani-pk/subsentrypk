-- Fix security warnings by setting search_path on functions

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix calculate_reminder_date function
CREATE OR REPLACE FUNCTION public.calculate_reminder_date(
  p_next_renewal_date DATE,
  p_days_before INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN p_next_renewal_date - (p_days_before || ' days')::INTERVAL;
END;
$$;

-- Fix get_upcoming_renewals function (already has SET search_path, but recreating for consistency)
CREATE OR REPLACE FUNCTION public.get_upcoming_renewals(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  amount NUMERIC,
  currency TEXT,
  billing_frequency public.billing_frequency,
  next_renewal_date DATE,
  payment_method TEXT,
  tag public.subscription_tag,
  status public.subscription_status,
  days_until_renewal INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.category,
    s.amount,
    s.currency,
    s.billing_frequency,
    s.next_renewal_date,
    s.payment_method,
    s.tag,
    s.status,
    (s.next_renewal_date - CURRENT_DATE)::INTEGER AS days_until_renewal
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'Active'
    AND s.next_renewal_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + (p_days_ahead || ' days')::INTERVAL)
  ORDER BY s.next_renewal_date ASC;
END;
$$;