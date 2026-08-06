import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Calendar, Layers } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscriptions } from '@/contexts/SubscriptionContext';
import { formatCurrency } from '@/lib/currency';
import { daysUntil as daysUntilTz } from '@/lib/dates';

const filterTags = ['All', 'Personal', 'Work', 'Family', 'High-cost'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { subscriptions, settings } = useSubscriptions();
  const [activeTag, setActiveTag] = useState('All');

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((sub) => sub.status === 'Active'),
    [subscriptions]
  );

  const { monthlySpend, annualSpend } = useMemo(() => {
    let monthly = 0;
    activeSubscriptions.forEach((sub) => {
      const amount = sub.amount;
      switch (sub.billing_frequency) {
        case 'Weekly':
          monthly += amount * 4.33;
          break;
        case 'Monthly':
          monthly += amount;
          break;
        case 'Quarterly':
          monthly += amount / 3;
          break;
        case 'Yearly':
          monthly += amount / 12;
          break;
        case 'Custom':
          if (sub.custom_billing_interval_days) {
            monthly += (amount / sub.custom_billing_interval_days) * 30;
          }
          break;
      }
    });
    return { monthlySpend: monthly, annualSpend: monthly * 12 };
  }, [activeSubscriptions]);

  const upcomingRenewals = useMemo(() => {
    let filtered = activeSubscriptions.filter((sub) => {
      const d = daysUntilTz(sub.next_renewal_date, settings.time_zone);
      return d >= 0 && d <= 30;
    });

    // Apply tag filter
    if (activeTag !== 'All') {
      if (activeTag === 'High-cost') {
        // Filter for subscriptions with amount > 50 (in their currency)
        filtered = filtered.filter((sub) => sub.amount > 50);
      } else {
        // Filter by tag (Personal, Work, Family)
        filtered = filtered.filter((sub) => sub.tag === activeTag);
      }
    }

    return filtered
      .sort((a, b) => new Date(a.next_renewal_date).getTime() - new Date(b.next_renewal_date).getTime())
      .map((sub) => ({
        ...sub,
        daysUntil: daysUntilTz(sub.next_renewal_date, settings.time_zone),
      }));
  }, [activeSubscriptions, activeTag, settings.time_zone]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, let's manage your subscriptions.
            </p>
          </div>
          <Button onClick={() => navigate('/add-subscription')} className="mt-4 md:mt-0 gap-2">
            <Plus className="h-4 w-4" />
            Add Subscription
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Monthly Spend</h3>
            </div>
            <p className="text-3xl font-bold text-primary">{formatCurrency(monthlySpend, settings.default_currency)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Annual Spend</h3>
            </div>
            <p className="text-3xl font-bold text-primary">{formatCurrency(annualSpend, settings.default_currency)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-success/10 rounded-lg">
                <Layers className="h-5 w-5 text-success" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Active Subscriptions</h3>
            </div>
            <p className="text-3xl font-bold text-success">{activeSubscriptions.length}</p>
          </Card>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Upcoming Renewals</h2>
            <div className="flex flex-wrap gap-2">
              {filterTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={tag === activeTag ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors hover:bg-primary/80"
                  onClick={() => setActiveTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {upcomingRenewals.length === 0 ? (
            <Card className="border-dashed bg-muted/30 p-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Renewals Due Soon</h3>
                <p className="text-muted-foreground mb-4">
                  You're all caught up! Any subscriptions renewing in the next 30 days will appear here.
                </p>
                <Button onClick={() => navigate('/add-subscription')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add a Subscription
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingRenewals.map((sub) => (
                <Card
                  key={sub.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/subscription/${sub.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-2xl">
                        {sub.icon || '📦'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{sub.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">Amount</p>
                          <p className="text-sm font-medium">{formatCurrency(sub.amount, settings.default_currency)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="text-sm font-medium">
                          {sub.daysUntil === 0
                            ? 'today'
                            : `in ${sub.daysUntil} day${sub.daysUntil !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <Badge
                        className={
                          sub.daysUntil <= 7
                            ? 'bg-warning text-warning-foreground'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {sub.daysUntil <= 7 ? 'Due Soon' : 'Upcoming'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
