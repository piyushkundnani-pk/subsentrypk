import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HTML escape helper to prevent XSS in email templates
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$', JPY: '¥', SGD: 'S$', AED: 'د.إ',
};

function formatAmount(amount: number | string, currency: string): string {
  const code = (currency || 'INR').split(' ')[0].trim().toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] ?? '';
  return `${symbol}${amount} ${code}`.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret for security
  const cronSecret = req.headers.get('X-Cron-Secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    console.error('Unauthorized access attempt to daily-reminder-job');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('Starting daily reminder job...');

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date().toISOString().split('T')[0];

    // Get all reminders due today OR in the past that haven't been sent
    // This allows testing with reminder_dates that have already passed
    const { data: dueReminders, error: remindersError } = await supabaseAdmin
      .from('reminders')
      .select('*, subscriptions(*), profiles(*)')
      .lte('reminder_date', today) // Changed to lte (less than or equal)
      .in('status', ['planned', 'pending']);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`Found ${dueReminders?.length || 0} reminders to send`);

    // Load each user's preferred display currency from their settings
    const userIds = [...new Set((dueReminders || []).map((r) => r.user_id))];
    const currencyByUser: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: settingsRows } = await supabaseAdmin
        .from('user_settings')
        .select('user_id, default_currency')
        .in('user_id', userIds);
      for (const row of settingsRows || []) currencyByUser[row.user_id] = row.default_currency;
    }

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
              Hi ${escapeHtml(profile.full_name || 'there')},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.5;">
              This is a friendly reminder that your <strong>${escapeHtml(subscription.name)}</strong> subscription is renewing ${daysUntil === 0 ? 'today' : `in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`}.
            </p>
            
            <div style="background-color: #f0fdfa; border-left: 4px solid: #0d9488; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <h2 style="color: #0d9488; font-size: 18px; margin: 0 0 12px 0;">Subscription Details</h2>
              <p style="margin: 8px 0; color: #374151;"><strong>Name:</strong> ${escapeHtml(subscription.name)}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Amount:</strong> ${escapeHtml(formatAmount(subscription.amount, currencyByUser[reminder.user_id] || subscription.currency))}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Renewal Date:</strong> ${escapeHtml(new Date(subscription.next_renewal_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Payment Method:</strong> ${escapeHtml(subscription.payment_method || 'Not specified')}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 24px;">
              You can manage this subscription and all your others in SubSentry. We're here to help you stay on top of your subscriptions — no surprises, no stress.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            
            <p style="color: #9ca3af; font-size: 12px;">
              This is an automated reminder from SubSentry. You can adjust your reminder settings in the app.
            </p>
          </div>
        `;

        // Send email via Resend API
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "SubSentry <onboarding@resend.dev>",
            to: [profile.email],
            subject: `Reminder: ${subscription.name} renews ${daysUntil === 0 ? 'today' : `in ${daysUntil} days`}`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        console.log(`Email sent for reminder ${reminder.id}:`, emailResponse);

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
        results.errors.push(`Reminder ${reminder.id}: send failed`);
      }
    }

    console.log('Daily reminder job completed:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in daily reminder job:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.', code: 'ERR_INTERNAL' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
