import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscriptions } from '@/contexts/SubscriptionContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SubscriptionsList() {
  const navigate = useNavigate();
  const { subscriptions } = useSubscriptions();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Cancelled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Subscriptions</h1>
            <p className="text-muted-foreground">
              Manage all your subscriptions in one place.
            </p>
          </div>
          <Button onClick={() => navigate('/add-subscription')} className="mt-4 md:mt-0 gap-2">
            <Plus className="h-4 w-4" />
            Add Subscription
          </Button>
        </div>

        {/* Desktop Table View */}
        <Card className="hidden md:block overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscription</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Renewal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow
                  key={sub.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/subscription/${sub.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{sub.icon || '📦'}</span>
                      {sub.name}
                    </div>
                  </TableCell>
                  <TableCell>{sub.category}</TableCell>
                  <TableCell>
                    ${sub.amount.toFixed(2)} {sub.currency}
                  </TableCell>
                  <TableCell>{sub.billing_frequency}</TableCell>
                  <TableCell>
                    {new Date(sub.next_renewal_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(sub.status)}>{sub.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{sub.tag}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {subscriptions.map((sub) => (
            <Card
              key={sub.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/subscription/${sub.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sub.icon || '📦'}</span>
                  <div>
                    <h3 className="font-semibold text-foreground">{sub.name}</h3>
                    <p className="text-sm text-muted-foreground">{sub.category}</p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(sub.status)}>{sub.status}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">
                    ${sub.amount.toFixed(2)} / {sub.billing_frequency.toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Next Renewal</p>
                  <p className="font-medium">
                    {new Date(sub.next_renewal_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-border">
                <Badge variant="outline">{sub.tag}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
