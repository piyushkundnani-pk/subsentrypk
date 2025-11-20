import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const subscriptionSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  amount: z.number().positive(),
  currency: z.string().length(3),
  billing_frequency: z.enum(['Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Custom']),
  custom_billing_interval_days: z.number().int().positive().optional().nullable(),
  next_renewal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['Active', 'Cancelled', 'Paused']).optional(),
  tag: z.enum(['Personal', 'Work', 'Family']).optional(),
  payment_method: z.string().max(50).optional().nullable(),
  icon: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  override_reminder_enabled: z.boolean().optional().nullable(),
  override_reminder_days: z.number().int().min(1).max(90).optional().nullable(),
});

const subscriptionUpdateSchema = subscriptionSchema.partial();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const subscriptionId = pathParts[pathParts.length - 1];

    // GET /subscriptions - List all subscriptions
    if (req.method === 'GET' && !subscriptionId) {
      const status = url.searchParams.get('status');
      const tag = url.searchParams.get('tag');

      // Validate enum values
      const validStatuses = ['Active', 'Cancelled', 'Paused'];
      const validTags = ['Personal', 'Work', 'Family'];

      if (status && !validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid status parameter. Must be one of: Active, Cancelled, Paused' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (tag && !validTags.includes(tag)) {
        return new Response(
          JSON.stringify({ error: 'Invalid tag parameter. Must be one of: Personal, Work, Family' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let query = supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }
      if (tag) {
        query = query.eq('tag', tag);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /subscriptions/:id - Get single subscription
    if (req.method === 'GET' && subscriptionId) {
      const { data, error } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /subscriptions - Create new subscription
    if (req.method === 'POST') {
      const body = await req.json();
      
      // Validate input
      try {
        subscriptionSchema.parse(body);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return new Response(JSON.stringify({ error: 'Invalid input', details: validationError.errors }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      const { data, error } = await supabaseClient
        .from('subscriptions')
        .insert([{ ...body, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /subscriptions/:id - Update subscription
    if (req.method === 'PUT' && subscriptionId) {
      const body = await req.json();
      
      // Validate input
      try {
        subscriptionUpdateSchema.parse(body);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return new Response(JSON.stringify({ error: 'Invalid input', details: validationError.errors }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      const { data, error } = await supabaseClient
        .from('subscriptions')
        .update(body)
        .eq('id', subscriptionId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /subscriptions/:id - Delete subscription
    if (req.method === 'DELETE' && subscriptionId) {
      const { error } = await supabaseClient
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId)
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in subscriptions function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
