import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function CleanupRenewals() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCleanup = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to perform cleanup');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-stale-renewals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cleanup renewals');
      }

      const data = await response.json();
      setResult(data);
      toast.success(`Successfully updated ${data.updated} subscriptions`);
    } catch (error) {
      console.error('Error cleaning up renewals:', error);
      toast.error('Failed to cleanup renewals');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Cleanup Stale Renewal Dates
          </h1>
          <p className="text-muted-foreground">
            This tool updates all active subscriptions with past renewal dates to their next future renewal.
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the button below to find and update all subscriptions with renewal dates in the past.
              The system will calculate the next appropriate renewal date based on each subscription's billing frequency.
            </p>

            <Button
              onClick={handleCleanup}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Cleaning up...' : 'Run Cleanup'}
            </Button>

            {result && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Cleanup Results</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {result.message}
                </p>
                <p className="text-sm">
                  <strong>Subscriptions updated:</strong> {result.updated}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
