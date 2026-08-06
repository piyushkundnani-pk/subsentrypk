-- 1. Make upcoming renewals respect RLS and validate the caller
CREATE OR REPLACE FUNCTION public.get_upcoming_renewals(p_user_id uuid, p_days_ahead integer DEFAULT 30)
 RETURNS TABLE(id uuid, name text, category text, amount numeric, currency text, billing_frequency billing_frequency, next_renewal_date date, payment_method text, tag subscription_tag, status subscription_status, days_until_renewal integer)
 LANGUAGE plpgsql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

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
$function$;

REVOKE ALL ON FUNCTION public.get_upcoming_renewals(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_upcoming_renewals(uuid, integer) TO authenticated, service_role;

-- 2. Internal helpers / trigger functions must not be callable from the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manage_subscription_reminders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_all_user_reminders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_reminder_date(date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_reminder_date(date, integer) TO authenticated, service_role;