import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptions } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

const currencies = [
  { code: 'USD', label: 'USD - United States Dollar' },
  { code: 'INR', label: 'INR - Indian Rupee' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
];
const timeZones = [
  '(GMT-05:00) Eastern Time',
  '(GMT-06:00) Central Time',
  '(GMT-07:00) Mountain Time',
  '(GMT-08:00) Pacific Time',
  '(GMT+05:30) India Standard Time',
];

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, updateSettings, subscriptions } = useSubscriptions();
  
  // Extract currency code if it's in "CODE - Name" format
  const extractCurrencyCode = (currency: string) => {
    return currency?.split(' ')[0]?.trim() || 'USD';
  };

  const [formData, setFormData] = useState({
    name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    default_currency: extractCurrencyCode(settings.default_currency),
    time_zone: settings.time_zone,
    email_notifications_enabled: settings.email_notifications_enabled,
    monthly_summary_enabled: settings.monthly_summary_enabled,
  });

  useEffect(() => {
    setFormData({
      name: user?.user_metadata?.full_name || '',
      email: user?.email || '',
      default_currency: extractCurrencyCode(settings.default_currency),
      time_zone: settings.time_zone,
      email_notifications_enabled: settings.email_notifications_enabled,
      monthly_summary_enabled: settings.monthly_summary_enabled,
    });
  }, [user, settings]);

  const handleSave = () => {
    updateSettings({
      default_currency: formData.default_currency,
      time_zone: formData.time_zone,
      email_notifications_enabled: formData.email_notifications_enabled,
      monthly_summary_enabled: formData.monthly_summary_enabled,
    });

    toast.success('Settings saved successfully');
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Category', 'Amount', 'Currency', 'Billing Frequency', 'Next Renewal', 'Status', 'Tag'],
      ...subscriptions.map((sub) => [
        sub.name,
        sub.category,
        sub.amount,
        sub.currency,
        sub.billing_frequency,
        sub.next_renewal_date,
        sub.status,
        sub.tag,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subsentry-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Subscriptions exported successfully');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile and preferences.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Profile</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="mt-4">
              <Button variant="link" className="h-auto p-0 text-primary">
                Change password
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Preferences</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="currency">Default Currency</Label>
                <Select
                  value={formData.default_currency}
                  onValueChange={(value) => setFormData({ ...formData, default_currency: value })}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timezone">Time Zone</Label>
                <Select
                  value={formData.time_zone}
                  onValueChange={(value) => setFormData({ ...formData, time_zone: value })}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeZones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-reminders" className="text-base cursor-pointer">
                    Email reminders for upcoming payments
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get notified before your subscriptions renew
                  </p>
                </div>
                <Switch
                  id="email-reminders"
                  checked={formData.email_notifications_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, email_notifications_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="monthly-summary"
                    className="text-base cursor-pointer flex items-center gap-2"
                  >
                    Monthly summary email
                    <span className="text-xs text-muted-foreground">(coming soon)</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receive a monthly overview of your subscriptions
                  </p>
                </div>
                <Switch
                  id="monthly-summary"
                  checked={formData.monthly_summary_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, monthly_summary_enabled: checked })
                  }
                  disabled
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Data & Export</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">Export your subscription data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You can download a copy of your subscription list anytime.
                </p>
                <Button variant="outline" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export subscriptions as CSV
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end mt-8">
          <Button onClick={handleSave} size="lg">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
