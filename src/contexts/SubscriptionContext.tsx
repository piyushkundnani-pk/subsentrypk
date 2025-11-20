import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Subscription {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  billingFrequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom';
  customBillingIntervalDays?: number;
  nextRenewalDate: string;
  paymentMethod: string;
  tag: 'Personal' | 'Work' | 'Family';
  notes: string;
  status: 'Active' | 'Cancelled' | 'Paused';
  createdAt: string;
  overrideReminderEnabled?: boolean;
  overrideReminderDays?: number;
  icon?: string;
}

export interface Settings {
  defaultCurrency: string;
  timeZone: string;
  globalReminderEnabled: boolean;
  globalReminderDays: number;
  notificationEmailEnabled: boolean;
  monthlySummaryEnabled: boolean;
}

interface SubscriptionContextType {
  subscriptions: Subscription[];
  settings: Settings;
  addSubscription: (subscription: Omit<Subscription, 'id' | 'createdAt'>) => void;
  updateSubscription: (id: string, subscription: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const mockSubscriptions: Subscription[] = [
  {
    id: '1',
    name: 'Netflix Premium',
    category: 'Entertainment',
    amount: 19.99,
    currency: 'USD',
    billingFrequency: 'Monthly',
    nextRenewalDate: '2025-01-05',
    paymentMethod: 'Visa •••• 4242',
    tag: 'Family',
    notes: 'This is the family plan, shared with Mom and Dad.',
    status: 'Active',
    createdAt: '2024-01-01',
    icon: '🎬',
  },
  {
    id: '2',
    name: 'Spotify Family',
    category: 'Entertainment',
    amount: 9.99,
    currency: 'USD',
    billingFrequency: 'Monthly',
    nextRenewalDate: '2025-01-12',
    paymentMethod: 'Visa •••• 1234',
    tag: 'Personal',
    notes: '',
    status: 'Active',
    createdAt: '2024-02-15',
    icon: '🎵',
    overrideReminderEnabled: true,
    overrideReminderDays: 7,
  },
  {
    id: '3',
    name: 'Adobe Creative Cloud',
    category: 'Software',
    amount: 52.99,
    currency: 'USD',
    billingFrequency: 'Monthly',
    nextRenewalDate: '2025-02-15',
    paymentMethod: 'Visa •••• 1234',
    tag: 'Work',
    notes: '',
    status: 'Active',
    createdAt: '2024-03-10',
    icon: '🎨',
  },
];

const defaultSettings: Settings = {
  defaultCurrency: 'USD',
  timeZone: '(GMT-05:00) Eastern Time',
  globalReminderEnabled: true,
  globalReminderDays: 5,
  notificationEmailEnabled: true,
  monthlySummaryEnabled: false,
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    // Load from localStorage or use mock data
    const stored = localStorage.getItem('subsentry_subscriptions');
    if (stored) {
      setSubscriptions(JSON.parse(stored));
    } else {
      setSubscriptions(mockSubscriptions);
    }

    const storedSettings = localStorage.getItem('subsentry_settings');
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings));
    }
  }, []);

  const addSubscription = (subscription: Omit<Subscription, 'id' | 'createdAt'>) => {
    const newSub: Subscription = {
      ...subscription,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...subscriptions, newSub];
    setSubscriptions(updated);
    localStorage.setItem('subsentry_subscriptions', JSON.stringify(updated));
  };

  const updateSubscription = (id: string, updates: Partial<Subscription>) => {
    const updated = subscriptions.map(sub =>
      sub.id === id ? { ...sub, ...updates } : sub
    );
    setSubscriptions(updated);
    localStorage.setItem('subsentry_subscriptions', JSON.stringify(updated));
  };

  const deleteSubscription = (id: string) => {
    const updated = subscriptions.filter(sub => sub.id !== id);
    setSubscriptions(updated);
    localStorage.setItem('subsentry_subscriptions', JSON.stringify(updated));
  };

  const updateSettings = (updates: Partial<Settings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    localStorage.setItem('subsentry_settings', JSON.stringify(updated));
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        settings,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        updateSettings,
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
