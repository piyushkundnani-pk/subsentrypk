import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Calendar, Layers } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscriptions } from '@/contexts/SubscriptionContext';

const filterTags = ['All', 'Personal', 'Work', 'Family', 'High-cost'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { subscriptions } = useSubscriptions();

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((sub) => sub.status === 'Active'),
    [subscriptions]
  );

  const { monthlySpend, annualSpend } = useMemo(() => {
    let monthly = 0;
    activeSubscriptions.forEach((sub) => {
      const amount = sub.amount;
      switch (sub.billingFrequency) {
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
          if (sub.customBillingIntervalDays) {
            monthly += (amount / sub.customBillingIntervalDays) * 30;
          }
          break;
      }
    });
    return { monthlySpend: monthly, annualSpend: monthly * 12 };
  }, [activeSubscriptions]);

  const upcomingRenewals = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return activeSubscriptions
      .filter((sub) => {
        const renewalDate = new Date(sub.nextRenewalDate);
        return renewalDate >= today && renewalDate <= thirtyDaysFromNow;
      })
      .sort((a, b) => new Date(a.nextRenewalDate).getTime() - new Date(b.nextRenewalDate).getTime())
      .map((sub) => {
        const renewalDate = new Date(sub.nextRenewalDate);
        const daysUntil = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...sub, daysUntil };
      });
  }, [activeSubscriptions]);

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
            <p className="text-3xl font-bold text-primary">${monthlySpend.toFixed(2)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Annual Spend</h3>
            </div>
            <p className="text-3xl font-bold text-primary">${annualSpend.toFixed(2)}</p>
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
                <Badge key={tag} variant={tag === 'All' ? 'default' : 'outline'} className="cursor-pointer">
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
                          <p className="text-sm font-medium">${sub.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="text-sm font-medium">
                          in {sub.daysUntil} day{sub.daysUntil !== 1 ? 's' : ''}
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
