import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface Subscription {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  billing_frequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom';
  custom_billing_interval_days?: number | null;
  next_renewal_date: string;
  status: 'Active' | 'Cancelled' | 'Paused';
  tag: 'Personal' | 'Work' | 'Family';
  payment_method?: string | null;
  icon?: string | null;
  notes?: string | null;
  override_reminder_enabled?: boolean | null;
  override_reminder_days?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Settings {
  default_currency: string;
  time_zone: string;
  email_notifications_enabled: boolean;
  global_reminder_enabled: boolean;
  global_reminder_days_before: number;
  monthly_summary_enabled: boolean;
}

interface SubscriptionContextType {
  subscriptions: Subscription[];
  settings: Settings;
  isLoading: boolean;
  addSubscription: (subscription: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateSubscription: (id: string, subscription: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  refreshSubscriptions: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<Settings>({
    default_currency: 'INR',
    time_zone: 'Asia/Kolkata',
    email_notifications_enabled: true,
    global_reminder_enabled: true,
    global_reminder_days_before: 5,
    monthly_summary_enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscriptions = async () => {
    if (!isAuthenticated || !user) {
      setSubscriptions([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log('No settings found, using defaults');
        return;
      }

      if (data) {
        setSettings({
          default_currency: data.default_currency,
          time_zone: data.time_zone,
          email_notifications_enabled: data.email_notifications_enabled,
          global_reminder_enabled: data.global_reminder_enabled,
          global_reminder_days_before: data.global_reminder_days_before,
          monthly_summary_enabled: data.monthly_summary_enabled,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      refreshSubscriptions();
      fetchSettings();
    } else {
      setSubscriptions([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const addSubscription = async (subscription: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast.error('You must be logged in to add subscriptions');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([{ ...subscription, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setSubscriptions(prev => [data, ...prev]);
      toast.success('Subscription added successfully');
    } catch (error) {
      console.error('Error adding subscription:', error);
      toast.error('Failed to add subscription');
      throw error;
    }
  };

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    if (!user) {
      toast.error('You must be logged in to update subscriptions');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSubscriptions(prev => prev.map(sub => sub.id === id ? data : sub));
      toast.success('Subscription updated successfully');
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
      throw error;
    }
  };

  const deleteSubscription = async (id: string) => {
    if (!user) {
      toast.error('You must be logged in to delete subscriptions');
      return;
    }

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
      toast.success('Subscription deleted successfully');
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('Failed to delete subscription');
      throw error;
    }
  };

  const updateSettings = async (updates: Partial<Settings>) => {
    if (!user) {
      toast.error('You must be logged in to update settings');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          default_currency: data.default_currency,
          time_zone: data.time_zone,
          email_notifications_enabled: data.email_notifications_enabled,
          global_reminder_enabled: data.global_reminder_enabled,
          global_reminder_days_before: data.global_reminder_days_before,
          monthly_summary_enabled: data.monthly_summary_enabled,
        });
      }
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
      throw error;
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        settings,
        isLoading,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        updateSettings,
        refreshSubscriptions,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscriptions = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptions must be used within a SubscriptionProvider');
  }
  return context;
};
