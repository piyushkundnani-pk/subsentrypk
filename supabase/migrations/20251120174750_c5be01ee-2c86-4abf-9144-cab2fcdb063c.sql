-- Create or replace function to manage reminders for subscriptions
CREATE OR REPLACE FUNCTION public.manage_subscription_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days_before INTEGER;
  v_reminder_date DATE;
  v_user_settings RECORD;
BEGIN
  -- Only process active subscriptions
  IF NEW.status != 'Active' THEN
    -- Delete any existing reminders for non-active subscriptions
    DELETE FROM public.reminders WHERE subscription_id = NEW.id;
    RETURN NEW;
  END IF;

  -- Get user settings
  SELECT * INTO v_user_settings
  FROM public.user_settings
  WHERE user_id = NEW.user_id;

  -- Determine days_before to use
  IF NEW.override_reminder_enabled THEN
    v_days_before := COALESCE(NEW.override_reminder_days, v_user_settings.global_reminder_days_before);
  ELSE
    v_days_before := v_user_settings.global_reminder_days_before;
  END IF;

  -- Calculate reminder date
  v_reminder_date := NEW.next_renewal_date - (v_days_before || ' days')::INTERVAL;

  -- Check if notifications are enabled
  IF v_user_settings.email_notifications_enabled AND v_user_settings.global_reminder_enabled THEN
    -- Delete existing reminders for this subscription
    DELETE FROM public.reminders WHERE subscription_id = NEW.id;
    
    -- Create new reminder
    INSERT INTO public.reminders (
      user_id,
      subscription_id,
      days_before,
      reminder_date,
      status
    ) VALUES (
      NEW.user_id,
      NEW.id,
      v_days_before,
      v_reminder_date,
      'planned'
    );
  ELSE
    -- If notifications disabled, remove any existing reminders
    DELETE FROM public.reminders WHERE subscription_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS manage_subscription_reminders_trigger ON public.subscriptions;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER manage_subscription_reminders_trigger
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.manage_subscription_reminders();

-- Trigger to refresh reminders when user settings change
CREATE OR REPLACE FUNCTION public.refresh_all_user_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresh reminders for all active subscriptions when settings change
  IF OLD.email_notifications_enabled != NEW.email_notifications_enabled
     OR OLD.global_reminder_enabled != NEW.global_reminder_enabled
     OR OLD.global_reminder_days_before != NEW.global_reminder_days_before THEN
    
    -- Update existing subscriptions to trigger reminder recalculation
    UPDATE public.subscriptions 
    SET updated_at = NOW()
    WHERE user_id = NEW.user_id AND status = 'Active';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS refresh_user_reminders_on_settings_change ON public.user_settings;

-- Create trigger on user_settings
CREATE TRIGGER refresh_user_reminders_on_settings_change
AFTER UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.refresh_all_user_reminders();

-- Backfill reminders for existing active subscriptions
DO $$
DECLARE
  sub RECORD;
  v_days_before INTEGER;
  v_reminder_date DATE;
  v_user_settings RECORD;
BEGIN
  FOR sub IN 
    SELECT * FROM public.subscriptions WHERE status = 'Active'
  LOOP
    -- Get user settings
    SELECT * INTO v_user_settings
    FROM public.user_settings
    WHERE user_id = sub.user_id;
    
    -- Skip if user has notifications disabled
    IF NOT v_user_settings.email_notifications_enabled OR NOT v_user_settings.global_reminder_enabled THEN
      CONTINUE;
    END IF;

    -- Determine days_before
    IF sub.override_reminder_enabled THEN
      v_days_before := COALESCE(sub.override_reminder_days, v_user_settings.global_reminder_days_before);
    ELSE
      v_days_before := v_user_settings.global_reminder_days_before;
    END IF;

    -- Calculate reminder date
    v_reminder_date := sub.next_renewal_date - (v_days_before || ' days')::INTERVAL;

    -- Delete existing reminders for this subscription
    DELETE FROM public.reminders WHERE subscription_id = sub.id;
    
    -- Create reminder
    INSERT INTO public.reminders (
      user_id,
      subscription_id,
      days_before,
      reminder_date,
      status
    ) VALUES (
      sub.user_id,
      sub.id,
      v_days_before,
      v_reminder_date,
      'planned'
    );
  END LOOP;
END $$;