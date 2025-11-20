import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client to verify the JWT and get user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Extract JWT token from header
    const jwt = authHeader.replace('Bearer ', '');
    
    // Verify the JWT and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    console.log('User verification result:', { hasUser: !!user, userId: user?.id, error: userError });

    if (userError || !user) {
      console.error('Failed to verify user:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Test reminder requested by user: ${user.id}`);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    // Continue using admin client for database operations
    // (supabaseAdmin is already created above with service role key)

    const today = new Date().toISOString().split('T')[0];

    // Get all pending reminders for this user (including past ones)
    const { data: dueReminders, error: remindersError } = await supabaseAdmin
      .from('reminders')
      .select('*, subscriptions(*), profiles(*)')
      .eq('user_id', user.id)
      .lte('reminder_date', today)
      .in('status', ['planned', 'pending']);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`Found ${dueReminders?.length || 0} reminders to send for user ${user.id}`);

    const results = {
      total: dueReminders?.length || 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const reminder of dueReminders || []) {
      try {
        const subscription = reminder.subscriptions;
        const profile = reminder.profiles;

        if (!subscription || !profile) {
          console.error(`Missing data for reminder ${reminder.id}`);
          results.errors.push(`Reminder ${reminder.id}: Missing subscription or profile data`);
          continue;
        }

        // Calculate days until renewal
        const renewalDate = new Date(subscription.next_renewal_date);
        const daysUntil = Math.ceil((renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        // Generate email content
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0d9488; font-size: 24px; margin-bottom: 24px;">Upcoming Renewal Reminder</h1>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.5;">
              Hi ${profile.full_name || 'there'},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.5;">
              This is a friendly reminder that your <strong>${subscription.name}</strong> subscription is renewing ${daysUntil === 0 ? 'today' : daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : `in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`}.
            </p>
            
            <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <h2 style="color: #0d9488; font-size: 18px; margin: 0 0 12px 0;">Subscription Details</h2>
              <p style="margin: 8px 0; color: #374151;"><strong>Name:</strong> ${subscription.name}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Amount:</strong> ${subscription.currency} ${subscription.amount}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Renewal Date:</strong> ${new Date(subscription.next_renewal_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Payment Method:</strong> ${subscription.payment_method || 'Not specified'}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 24px;">
              You can manage this subscription and all your others in SubSentry. We're here to help you stay on top of your subscriptions — no surprises, no stress.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            
            <p style="color: #9ca3af; font-size: 12px;">
              This is a test reminder from SubSentry. You can adjust your reminder settings in the app.
            </p>
          </div>
        `;

        console.log(`Sending test email to ${profile.email} for subscription ${subscription.name}`);

        // Send email via Resend API
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: [profile.email],
            subject: `[TEST] Reminder: ${subscription.name} renews ${daysUntil === 0 ? 'today' : daysUntil < 0 ? 'soon' : `in ${daysUntil} days`}`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`Resend API error for reminder ${reminder.id}:`, errorText);
          throw new Error(`Resend API error: ${errorText}`);
        }

        const emailData = await emailResponse.json();
        console.log(`Email sent successfully for reminder ${reminder.id}:`, emailData);

        // Update reminder status to sent
        await supabaseAdmin
          .from('reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);

        results.sent++;
      } catch (error: unknown) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
        
        // Update reminder status to failed
        await supabaseAdmin
          .from('reminders')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', reminder.id);

        results.failed++;
        results.errors.push(`Reminder ${reminder.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('Test reminder job completed:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in send-test-reminder function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
