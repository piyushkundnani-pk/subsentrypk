import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useSubscriptions, Subscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';

const popularServices = [
  { name: 'Netflix', icon: '🎬', category: 'Entertainment' },
  { name: 'Spotify', icon: '🎵', category: 'Entertainment' },
  { name: 'Amazon Prime', icon: '📦', category: 'Shopping' },
  { name: 'iCloud', icon: '☁️', category: 'Storage' },
  { name: 'Gym', icon: '💪', category: 'Health & Fitness' },
  { name: 'Hotstar', icon: '⭐', category: 'Entertainment' },
];

const categories = ['Entertainment', 'Shopping', 'Storage', 'Health & Fitness', 'Software', 'Utilities', 'Other'];
const billingFrequencies = ['Monthly', 'Yearly', 'Weekly', 'Quarterly'];

const ONBOARDING_GOAL = 3;

export default function Setup() {
  const navigate = useNavigate();
  const { addSubscription, subscriptions } = useSubscriptions();
  const [addedSubs, setAddedSubs] = useState<Partial<Subscription>[]>([]);
  
  // Track total count including existing subscriptions
  const activeSubsCount = subscriptions.filter(s => s.status === 'Active').length;
  const totalCount = activeSubsCount + addedSubs.length;
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Entertainment',
    amount: '',
    currency: 'USD',
    billing_frequency: 'Monthly' as Subscription['billing_frequency'],
    next_renewal_date: '',
    payment_method: '',
    tag: 'Personal' as Subscription['tag'],
    notes: '',
  });

  const handlePopularServiceClick = (service: typeof popularServices[0]) => {
    setFormData({
      ...formData,
      name: service.name,
      category: service.category,
    });
  };

  const handleAddSubscription = async () => {
    if (!formData.name || !formData.amount || !formData.next_renewal_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newSub = {
      ...formData,
      amount: parseFloat(formData.amount),
      status: 'Active' as const,
    };

    // Save to backend immediately
    try {
      await addSubscription(newSub as Omit<Subscription, 'id' | 'createdAt'>);
      
      // Reset form
      setFormData({
        name: '',
        category: 'Entertainment',
        amount: '',
        currency: 'USD',
        billing_frequency: 'Monthly',
        next_renewal_date: '',
        payment_method: '',
        tag: 'Personal',
        notes: '',
      });

      toast.success(`${newSub.name} added!`);
      
      // Check if we've reached the goal (account for newly added sub)
      const newTotalCount = subscriptions.filter(s => s.status === 'Active').length + 1;
      if (newTotalCount >= ONBOARDING_GOAL) {
        toast.success('Great! You\'ve added your first subscriptions. Redirecting to dashboard...');
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (error) {
      toast.error('Failed to add subscription. Please try again.');
    }
  };

  const handleContinue = () => {
    // All subs are already saved, just navigate
    toast.success('Your subscriptions have been saved!');
    navigate('/dashboard');
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Add your first {ONBOARDING_GOAL} active subscriptions
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">
              Start by logging the subscriptions you care about most. You can add more later from the dashboard.
            </p>
            <Badge variant="secondary" className="text-sm font-semibold">
              {totalCount} of {ONBOARDING_GOAL} added
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Add from popular services</h2>
              <div className="flex flex-wrap gap-3">
                {popularServices.map((service) => (
                  <Button
                    key={service.name}
                    variant="outline"
                    onClick={() => handlePopularServiceClick(service)}
                    className="gap-2"
                  >
                    <span>{service.icon}</span>
                    {service.name}
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6">Or add one manually</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Spotify"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="9.99"
                        className="rounded-l-none"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estimate is okay if you're not sure.
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Billing Frequency</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {billingFrequencies.map((freq) => (
                      <Button
                        key={freq}
                        type="button"
                        variant={formData.billing_frequency === freq ? 'default' : 'outline'}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            billing_frequency: freq as Subscription['billing_frequency'],
                          })
                        }
                      >
                        {freq}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="renewalDate">Next Renewal Date</Label>
                    <Input
                      id="renewalDate"
                      type="date"
                      value={formData.next_renewal_date}
                      onChange={(e) =>
                        setFormData({ ...formData, next_renewal_date: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Input
                      id="paymentMethod"
                      value={formData.payment_method}
                      onChange={(e) =>
                        setFormData({ ...formData, payment_method: e.target.value })
                      }
                      placeholder="Visa •••• 1234"
                    />
                  </div>
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 mt-2">
                    {(['Personal', 'Work', 'Family'] as const).map((tag) => (
                      <Button
                        key={tag}
                        type="button"
                        variant={formData.tag === tag ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, tag })}
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any notes about this subscription..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleAddSubscription} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add Subscription
                </Button>
              </div>
            </Card>
          </div>

          <div className="md:col-span-1">
            <Card className="p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Your subscriptions</h3>
                <Badge variant={totalCount >= ONBOARDING_GOAL ? 'default' : 'secondary'}>
                  {totalCount}/{ONBOARDING_GOAL}
                </Badge>
              </div>
              
              {totalCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subscriptions added yet. Start by selecting a popular service or adding one manually.
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Show existing active subscriptions first */}
                  {subscriptions
                    .filter(s => s.status === 'Active')
                    .map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ${sub.amount} / {sub.billing_frequency?.toLowerCase()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {new Date(sub.next_renewal_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
              
              {totalCount >= ONBOARDING_GOAL && (
                <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-primary font-medium">
                    ✓ Goal reached! You can add more or continue to dashboard.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button
            onClick={handleContinue}
            disabled={totalCount === 0}
            size="lg"
          >
            Continue to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
