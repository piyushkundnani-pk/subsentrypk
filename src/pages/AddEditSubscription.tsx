import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useSubscriptions, Subscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';
import { getCurrencySymbol } from '@/lib/currency';

const categories = ['Entertainment', 'Shopping', 'Storage', 'Health & Fitness', 'Software', 'Utilities', 'Other'];
const billingFrequencies = ['Monthly', 'Yearly', 'Weekly', 'Quarterly', 'Custom'];

export default function AddEditSubscription() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { subscriptions, addSubscription, updateSubscription, settings } = useSubscriptions();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    category: 'Entertainment',
    amount: '',
    currency: 'USD',
    billing_frequency: 'Monthly' as Subscription['billing_frequency'],
    custom_billing_interval_days: '',
    next_renewal_date: '',
    payment_method: '',
    tag: 'Personal' as Subscription['tag'],
    notes: '',
    status: 'Active' as Subscription['status'],
    icon: '📦',
  });

  useEffect(() => {
    if (isEdit && id) {
      const sub = subscriptions.find((s) => s.id === id);
      if (sub) {
        setFormData({
          name: sub.name,
          category: sub.category,
          amount: sub.amount.toString(),
          currency: sub.currency,
          billing_frequency: sub.billing_frequency,
          custom_billing_interval_days: sub.custom_billing_interval_days?.toString() || '',
          next_renewal_date: sub.next_renewal_date,
          payment_method: sub.payment_method || '',
          tag: sub.tag,
          notes: sub.notes || '',
          status: sub.status,
          icon: sub.icon || '📦',
        });
      }
    }
  }, [isEdit, id, subscriptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.amount || !formData.next_renewal_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const subData = {
      name: formData.name,
      category: formData.category,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      billing_frequency: formData.billing_frequency,
      custom_billing_interval_days: formData.custom_billing_interval_days
        ? parseInt(formData.custom_billing_interval_days)
        : null,
      next_renewal_date: formData.next_renewal_date,
      payment_method: formData.payment_method || null,
      tag: formData.tag,
      notes: formData.notes || null,
      status: formData.status,
      icon: formData.icon,
    };

    if (isEdit && id) {
      updateSubscription(id, subData);
      toast.success('Subscription updated successfully');
    } else {
      addSubscription(subData);
      toast.success('Subscription added successfully');
    }

    navigate('/subscriptions');
  };

  const handleStatusToggle = () => {
    const newStatus = formData.status === 'Active' ? 'Cancelled' : 'Active';
    if (isEdit && id) {
      updateSubscription(id, { status: newStatus });
      setFormData({ ...formData, status: newStatus });
      toast.success(`Subscription marked as ${newStatus.toLowerCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {isEdit ? 'Edit Subscription' : 'Add Subscription'}
          </h1>
          <p className="text-primary">
            {isEdit
              ? 'Update the details for your existing subscription.'
              : 'Add a new subscription to track.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Core Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Subscription Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Spotify Premium"
                    required
                  />
                </div>

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
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-muted-foreground">
                        {getCurrencySymbol(settings.default_currency)}
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="10.99"
                        className="rounded-l-none"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      An estimate is okay if you're not sure.
                    </p>
                  </div>

                  <div>
                    <Label>Billing Frequency</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
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
                          className="text-xs"
                        >
                          {freq}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {formData.billing_frequency === 'Custom' && (
                  <div>
                    <Label htmlFor="customDays">Custom Billing Interval (days)</Label>
                    <Input
                      id="customDays"
                      type="number"
                      value={formData.custom_billing_interval_days}
                      onChange={(e) =>
                        setFormData({ ...formData, custom_billing_interval_days: e.target.value })
                      }
                      placeholder="e.g., 45"
                    />
                  </div>
                )}

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
                      required
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
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Organization & Notes</h3>
              <div className="space-y-4">
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
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any relevant notes here..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
            <div>
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleStatusToggle}
                >
                  {formData.status === 'Active' ? 'Mark as Cancelled' : 'Mark as Active'}
                </Button>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/subscriptions')}>
                Cancel
              </Button>
              <Button type="submit">Save Subscription</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
