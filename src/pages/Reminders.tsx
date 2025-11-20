import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSubscriptions } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function Reminders() {
  const navigate = useNavigate();
  const { subscriptions, settings, updateSettings, updateSubscription } = useSubscriptions();
  
  const [globalEnabled, setGlobalEnabled] = useState(settings.global_reminder_enabled);
  const [globalDays, setGlobalDays] = useState(settings.global_reminder_days_before.toString());
  
  const [overrides, setOverrides] = useState<Record<string, { enabled: boolean; days: string }>>(
    {}
  );

  useEffect(() => {
    const initialOverrides: Record<string, { enabled: boolean; days: string }> = {};
    subscriptions.forEach((sub) => {
      if (sub.status === 'Active') {
        initialOverrides[sub.id] = {
          enabled: sub.override_reminder_enabled || false,
          days: sub.override_reminder_days?.toString() || globalDays,
        };
      }
    });
    setOverrides(initialOverrides);
  }, [subscriptions, globalDays]);

  const handleSave = () => {
    updateSettings({
      global_reminder_enabled: globalEnabled,
      global_reminder_days_before: parseInt(globalDays),
    });

    Object.entries(overrides).forEach(([subId, override]) => {
      updateSubscription(subId, {
        override_reminder_enabled: override.enabled,
        override_reminder_days: override.enabled ? parseInt(override.days) : null,
      });
    });

    toast.success('Reminder settings saved successfully');
    navigate('/dashboard');
  };

  const activeSubscriptions = subscriptions.filter((sub) => sub.status === 'Active');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Reminder & Alert Settings
          </h1>
          <p className="text-primary">
            We'll remind you before renewals so there are no surprises.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Global Reminder Settings</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <span className="text-2xl">🔔</span>
                  </div>
                  <Label htmlFor="global-enabled" className="text-base font-medium cursor-pointer">
                    Send renewal reminders
                  </Label>
                </div>
                <Switch
                  id="global-enabled"
                  checked={globalEnabled}
                  onCheckedChange={setGlobalEnabled}
                />
              </div>

              {globalEnabled && (
                <div>
                  <Label htmlFor="global-days" className="mb-2 block">
                    Remind me
                  </Label>
                  <Select value={globalDays} onValueChange={setGlobalDays}>
                    <SelectTrigger id="global-days" className="w-full md:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days before renewal</SelectItem>
                      <SelectItem value="5">5 days before renewal</SelectItem>
                      <SelectItem value="7">7 days before renewal</SelectItem>
                      <SelectItem value="14">14 days before renewal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </Card>

          {globalEnabled && activeSubscriptions.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-2">Per-Subscription Overrides</h2>
              <p className="text-sm text-muted-foreground mb-6">
                These settings will override your global reminder preference for specific subscriptions.
              </p>
              
              <div className="space-y-4">
                {activeSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{sub.icon || '📦'}</span>
                      <div>
                        <p className="font-medium text-foreground">{sub.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Renews on{' '}
                          {new Date(sub.next_renewal_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {overrides[sub.id]?.enabled ? (
                        <>
                          <Badge className="bg-warning text-warning-foreground">
                            Override active
                          </Badge>
                          <Select
                            value={overrides[sub.id]?.days || globalDays}
                            onValueChange={(value) =>
                              setOverrides({
                                ...overrides,
                                [sub.id]: { ...overrides[sub.id], days: value },
                              })
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">3 days before</SelectItem>
                              <SelectItem value="5">5 days before</SelectItem>
                              <SelectItem value="7">7 days before</SelectItem>
                              <SelectItem value="14">14 days before</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setOverrides({
                                ...overrides,
                                [sub.id]: { enabled: false, days: globalDays },
                              })
                            }
                          >
                            Use Global
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-muted-foreground">
                            Use Global ({globalDays} days)
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setOverrides({
                                ...overrides,
                                [sub.id]: { enabled: true, days: globalDays },
                              })
                            }
                          >
                            Override
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Reminder Settings</Button>
        </div>
      </div>
    </div>
  );
}
