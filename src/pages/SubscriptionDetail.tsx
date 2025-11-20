import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscriptions } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';

export default function SubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { subscriptions, updateSubscription } = useSubscriptions();

  const subscription = useMemo(
    () => subscriptions.find((sub) => sub.id === id),
    [subscriptions, id]
  );

  if (!subscription) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Subscription Not Found</h1>
            <Button onClick={() => navigate('/subscriptions')}>Back to Subscriptions</Button>
          </div>
        </div>
      </div>
    );
  }

  const annualizedCost = useMemo(() => {
    const amount = subscription.amount;
    switch (subscription.billing_frequency) {
      case 'Weekly':
        return amount * 52;
      case 'Monthly':
        return amount * 12;
      case 'Quarterly':
        return amount * 4;
      case 'Yearly':
        return amount;
      case 'Custom':
        if (subscription.custom_billing_interval_days) {
          return (amount / subscription.custom_billing_interval_days) * 365;
        }
        return 0;
      default:
        return 0;
    }
  }, [subscription]);

  const handleStatusToggle = () => {
    const newStatus = subscription.status === 'Active' ? 'Cancelled' : 'Active';
    updateSubscription(subscription.id, { status: newStatus });
    toast.success(`Subscription marked as ${newStatus.toLowerCase()}`);
  };

  // Mock renewal history
  const renewalHistory = [
    { date: 'September 25, 2024', amount: subscription.amount },
    { date: 'August 25, 2024', amount: subscription.amount },
    { date: 'July 25, 2024', amount: subscription.amount },
  ];

  const daysUntilRenewal = Math.ceil(
    (new Date(subscription.next_renewal_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-card border border-border rounded-xl flex items-center justify-center text-3xl">
              {subscription.icon || '📦'}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                    {subscription.name}
                  </h1>
                  <Badge
                    variant={subscription.status === 'Active' ? 'default' : 'secondary'}
                    className={
                      subscription.status === 'Active'
                        ? 'bg-success text-success-foreground'
                        : ''
                    }
                  >
                    {subscription.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase">
                Cost Summary
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    ${subscription.amount.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {' '}
                      / {subscription.billing_frequency.toLowerCase()}
                    </span>
                  </p>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Annualized cost</p>
                  <p className="text-xl font-semibold">${annualizedCost.toFixed(2)}</p>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Paid with</p>
                  <p className="text-sm font-medium">{subscription.payment_method || 'Not set'}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-warning-muted border-warning">
              <h3 className="text-sm font-semibold mb-2 text-warning-foreground">
                Renews on{' '}
                {new Date(subscription.next_renewal_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
              <p className="text-sm text-warning-foreground">
                We'll remind you {daysUntilRenewal} days before this renews.
              </p>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Category</h3>
                  <p className="text-foreground">{subscription.category}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline">{subscription.tag}</Badge>
                  </div>
                </div>

                {subscription.notes && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                    <p className="text-foreground">{subscription.notes}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground uppercase text-sm">
                Renewal History
              </h3>
              <div className="space-y-3">
                {renewalHistory.map((renewal, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <p className="text-foreground">{renewal.date}</p>
                    <p className="font-semibold">${renewal.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-muted/50">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="text-2xl">🔔</span>
                </div>
                <div className="flex-1">
                  <p className="text-foreground mb-1">
                    You receive email notifications for this subscription.
                  </p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-primary"
                    onClick={() => navigate('/reminders')}
                  >
                    Adjust reminders
                  </Button>
                </div>
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant={subscription.status === 'Active' ? 'destructive' : 'default'}
                onClick={handleStatusToggle}
                className="flex-1"
              >
                {subscription.status === 'Active' ? 'Mark as Cancelled' : 'Mark as Active'}
              </Button>
              <Button onClick={() => navigate(`/edit-subscription/${subscription.id}`)} className="flex-1">
                Edit Subscription
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
