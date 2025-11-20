-- ============================================
-- SUBSENTRY BACKEND SCHEMA
-- ============================================

-- Create enum types for better data integrity
CREATE TYPE public.billing_frequency AS ENUM ('Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Custom');
CREATE TYPE public.subscription_status AS ENUM ('Active', 'Cancelled', 'Paused');
CREATE TYPE public.subscription_tag AS ENUM ('Personal', 'Work', 'Family');
CREATE TYPE public.reminder_status AS ENUM ('planned', 'pending', 'sent', 'failed');

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. USER_SETTINGS TABLE
-- ============================================
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_currency TEXT NOT NULL DEFAULT 'INR',
  time_zone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  global_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  global_reminder_days_before INTEGER NOT NULL DEFAULT 5 CHECK (global_reminder_days_before >= 1 AND global_reminder_days_before <= 30),
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_summary_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_frequency public.billing_frequency NOT NULL DEFAULT 'Monthly',
  custom_billing_interval_days INTEGER CHECK (custom_billing_interval_days IS NULL OR custom_billing_interval_days > 0),
  next_renewal_date DATE NOT NULL,
  payment_method TEXT,
  tag public.subscription_tag NOT NULL DEFAULT 'Personal',
  notes TEXT,
  status public.subscription_status NOT NULL DEFAULT 'Active',
  icon TEXT,
  override_reminder_enabled BOOLEAN DEFAULT FALSE,
  override_reminder_days INTEGER CHECK (override_reminder_days IS NULL OR (override_reminder_days >= 1 AND override_reminder_days <= 30)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_next_renewal ON public.subscriptions(next_renewal_date);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. REMINDERS TABLE
-- ============================================
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  days_before INTEGER NOT NULL CHECK (days_before >= 1),
  status public.reminder_status NOT NULL DEFAULT 'planned',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for reminder queries
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_subscription_id ON public.reminders(subscription_id);
CREATE INDEX idx_reminders_date_status ON public.reminders(reminder_date, status);
CREATE INDEX idx_reminders_user_date ON public.reminders(user_id, reminder_date);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminders
CREATE POLICY "Users can view own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage all reminders"
  ON public.reminders FOR ALL
  USING (true);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  
  -- Create default settings for new user
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate next reminder dates for a subscription
CREATE OR REPLACE FUNCTION public.calculate_reminder_date(
  p_next_renewal_date DATE,
  p_days_before INTEGER
)
RETURNS DATE AS $$
BEGIN
  RETURN p_next_renewal_date - (p_days_before || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get upcoming renewals for a user
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_upcoming_renewals(UUID, INTEGER) TO authenticated;