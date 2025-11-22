import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          id: string;
          next_renewal_date: string;
          billing_frequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom';
          custom_billing_interval_days: number | null;
          status: string;
        };
      };
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all active subscriptions with past renewal dates
    const { data: staleSubscriptions, error: fetchError } = await supabaseClient
      .from('subscriptions')
      .select('id, next_renewal_date, billing_frequency, custom_billing_interval_days')
      .eq('status', 'Active')
      .lt('next_renewal_date', today.toISOString().split('T')[0]);

    if (fetchError) {
      throw fetchError;
    }

    if (!staleSubscriptions || staleSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No stale subscriptions found', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Calculate new renewal dates based on billing frequency
    const updates = staleSubscriptions.map((sub) => {
      const oldDate = new Date(sub.next_renewal_date);
      let newDate = new Date(oldDate);
      
      // Calculate days to add based on billing frequency
      let daysToAdd = 0;
      switch (sub.billing_frequency) {
        case 'Weekly':
          daysToAdd = 7;
          break;
        case 'Monthly':
          daysToAdd = 30;
          break;
        case 'Quarterly':
          daysToAdd = 90;
          break;
        case 'Yearly':
          daysToAdd = 365;
          break;
        case 'Custom':
          daysToAdd = sub.custom_billing_interval_days || 30;
          break;
      }

      // Keep adding billing periods until we're in the future
      while (newDate < today) {
        newDate = new Date(newDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      }

      return {
        id: sub.id,
        next_renewal_date: newDate.toISOString().split('T')[0],
      };
    });

    // Update all stale subscriptions
    const updatePromises = updates.map((update) =>
      supabaseClient
        .from('subscriptions')
        .update({ next_renewal_date: update.next_renewal_date })
        .eq('id', update.id)
    );

    await Promise.all(updatePromises);

    return new Response(
      JSON.stringify({
        message: 'Stale renewal dates cleaned up successfully',
        updated: updates.length,
        subscriptions: updates,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error cleaning up stale renewals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

