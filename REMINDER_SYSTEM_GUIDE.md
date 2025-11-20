# Email Reminder System - Setup & Testing Guide

## Overview
Your SubSentry app now has a complete email reminder system that automatically notifies you before subscription renewals.

## What Was Fixed

### 1. Database Triggers (Automated Reminder Creation)
- **Auto-creates reminders** when you add or update subscriptions
- **Syncs with settings** - when you change reminder preferences, all subscription reminders update automatically
- **Backfilled existing data** - created reminders for your current active subscriptions

### 2. Enhanced Reminder Logic
- **Handles past dates** - if reminder_date is in the past (for testing), it sends immediately
- **Smart filtering** - only sends reminders for active subscriptions
- **Better error handling** - logs all failures with detailed error messages

### 3. Manual Test Button
- Added "Send Test Reminder" button on the Reminders page (`/reminders`)
- Sends test emails for ALL pending reminders for your account
- Shows clear success/failure messages

## How It Works

### Reminder Creation Flow
1. When you add a subscription → Database trigger calculates reminder_date
2. reminder_date = next_renewal_date - days_before
3. Reminder stored in database with status 'planned'

### Email Sending Flow
1. **Daily Cron Job**: Runs at 8:00 AM UTC every day
   - Checks for reminders with reminder_date <= today
   - Sends emails via Resend API
   - Updates status to 'sent' or 'failed'

2. **Manual Test**: Click "Send Test Reminder" button
   - Same logic as cron job
   - Only processes YOUR reminders
   - Perfect for testing before renewals

## Your Current Reminders

From the database:
- **Amazon Prime**: Reminder date Nov 17, 2025 (14 days before renewal)
- **iCloud**: Reminder date Nov 30, 2025 (3 days before renewal)

## Testing Instructions

### Option 1: Use the Test Button (Recommended)
1. Go to `/reminders` page
2. Click "Send Test Reminder" button
3. Check your email: `piyushkundnani@outlook.com`
4. Look for subject: `[TEST] Reminder: Amazon Prime renews...`

### Option 2: Wait for Daily Cron
- Cron runs daily at 8:00 AM UTC
- Will automatically send any pending reminders

### Option 3: Trigger Cron Manually
```bash
# Call the cron job endpoint with the CRON_SECRET header
curl -X POST https://vqwfnlqmmfesifvdfeju.supabase.co/functions/v1/daily-reminder-job \
  -H "X-Cron-Secret: YOUR_CRON_SECRET"
```

## Important Email Settings

### Resend Configuration
- ✅ API Key configured: `RESEND_API_KEY`
- 📧 From address: `SubSentry <reminders@subsentry.app>`
- ⚠️ **CRITICAL**: Verify your domain in Resend dashboard
  - Go to: https://resend.com/domains
  - Add DNS records for `subsentry.app`
  - Without verification, emails may not send or go to spam

### Common Issues

**"No reminders found"**
- Ensure you have active subscriptions
- Check that email notifications are enabled in Settings
- Verify global_reminder_enabled = true in user_settings

**"Emails not arriving"**
1. Check spam folder
2. Verify domain in Resend: https://resend.com/domains
3. Check edge function logs for errors
4. Ensure RESEND_API_KEY is valid

**"Reminder sent but status still 'planned'"**
- Check database: `SELECT * FROM reminders WHERE status = 'sent'`
- Look for error_message in failed reminders

## Monitoring & Debugging

### Check Reminder Status
```sql
SELECT 
  r.id,
  s.name as subscription,
  r.reminder_date,
  r.status,
  r.sent_at,
  r.error_message
FROM reminders r
JOIN subscriptions s ON s.id = r.subscription_id
WHERE r.user_id = 'YOUR_USER_ID'
ORDER BY r.reminder_date;
```

### View Edge Function Logs
- Go to Lovable Cloud → Functions → `send-test-reminder` or `daily-reminder-job`
- Check for "Email sent successfully" or error messages

### Test Email Delivery
The test button will show:
- ✅ Success: "Test reminder sent! X email(s) sent"
- ℹ️ No reminders: "No pending reminders found"
- ⚠️ Failure: "X reminder(s) failed to send"

## Customization

### Change Email Template
Edit: `supabase/functions/daily-reminder-job/index.ts` (lines 72-102)
- Customize HTML styling
- Add your branding
- Modify email copy

### Change Reminder Timing
- Global: Settings page → "Remind me X days before"
- Per-subscription: Reminders page → Override individual subscriptions

### Change From Address
Edit both edge functions:
```typescript
from: "Your Name <your-email@your-domain.com>"
```
⚠️ Must verify domain in Resend first!

## Security Notes
- ✅ Emails only sent to authenticated users
- ✅ Cron job protected with CRON_SECRET
- ✅ Test endpoint requires authentication
- ✅ Service role key used for admin operations (secure)

## Next Steps
1. **Verify Resend Domain**: https://resend.com/domains
2. **Test**: Click "Send Test Reminder" button
3. **Wait**: First automated reminder at next 8:00 AM UTC
4. **Monitor**: Check edge function logs for any errors

---

**Support Links:**
- Resend Documentation: https://resend.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Cron Jobs: https://supabase.com/docs/guides/database/extensions/pg_cron
