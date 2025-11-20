# SubSentry Backend Architecture Documentation

## Overview

SubSentry's backend is built on **Supabase** (via Lovable Cloud), providing a complete backend infrastructure including PostgreSQL database, authentication, REST API endpoints, and scheduled jobs for email reminders.

---

## 1️⃣ Authentication Setup

### Auth Provider Configuration
- **Primary Method**: Google OAuth (configured in Supabase Auth)
- **Fallback Method**: Email/Password authentication
- **Auto-confirm**: Enabled for faster testing/development

### User Profile Creation
When a user signs up via any method:
1. A row is auto-created in `profiles` table via database trigger
2. Default settings are auto-created in `user_settings` table
3. The `profiles.id` matches `auth.users.id` for seamless linking

### Row-Level Security (RLS) Strategy
All user data tables (`profiles`, `subscriptions`, `user_settings`, `reminders`) have RLS enabled with policies ensuring:
- Users can only view/edit their own data
- All operations check `auth.uid() = user_id`
- Service-level functions use `SECURITY DEFINER` for system operations

**Example RLS Policy:**
```sql
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 2️⃣ Database Schema

### Tables Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profile data | id, full_name, email |
| `user_settings` | Per-user preferences | default_currency, time_zone, global_reminder_days_before |
| `subscriptions` | User's subscription records | name, amount, billing_frequency, next_renewal_date, status |
| `reminders` | Planned/sent reminder records | reminder_date, status, sent_at |

### 1. Profiles Table
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Purpose**: Stores user profile information, linked 1:1 with auth.users

### 2. User Settings Table
```sql
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_currency TEXT NOT NULL DEFAULT 'INR',
  time_zone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  global_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  global_reminder_days_before INTEGER NOT NULL DEFAULT 5 
    CHECK (global_reminder_days_before >= 1 AND global_reminder_days_before <= 30),
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_summary_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Purpose**: Stores user preferences for currency, timezone, and notification settings

### 3. Subscriptions Table
```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_frequency public.billing_frequency NOT NULL DEFAULT 'Monthly',
  custom_billing_interval_days INTEGER,
  next_renewal_date DATE NOT NULL,
  payment_method TEXT,
  tag public.subscription_tag NOT NULL DEFAULT 'Personal',
  notes TEXT,
  status public.subscription_status NOT NULL DEFAULT 'Active',
  icon TEXT,
  override_reminder_enabled BOOLEAN DEFAULT FALSE,
  override_reminder_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Enums:**
- `billing_frequency`: 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Custom'
- `subscription_status`: 'Active', 'Cancelled', 'Paused'
- `subscription_tag`: 'Personal', 'Work', 'Family'

**Indexes:**
- `idx_subscriptions_user_id` on user_id
- `idx_subscriptions_next_renewal` on next_renewal_date
- `idx_subscriptions_status` on status
- `idx_subscriptions_user_status` on (user_id, status)

### 4. Reminders Table
```sql
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  days_before INTEGER NOT NULL CHECK (days_before >= 1),
  status public.reminder_status NOT NULL DEFAULT 'planned',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Enum:**
- `reminder_status`: 'planned', 'pending', 'sent', 'failed'

**Indexes:**
- `idx_reminders_user_id` on user_id
- `idx_reminders_subscription_id` on subscription_id
- `idx_reminders_date_status` on (reminder_date, status)
- `idx_reminders_user_date` on (user_id, reminder_date)

### Database Triggers

**Auto-update timestamps:**
All tables have triggers to automatically update `updated_at` on modifications.

**Auto-create profiles:**
On user signup, a trigger automatically creates:
- Profile row with user info
- Default user_settings row

---

## 3️⃣ API Endpoints

All endpoints require authentication via Supabase JWT token in the `Authorization` header.

### Base URL
`https://vqwfnlqmmfesifvdfeju.supabase.co/functions/v1/`

### Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/subscriptions` | GET | List user's subscriptions | ✅ |
| `/subscriptions` | POST | Create new subscription | ✅ |
| `/subscriptions/:id` | GET | Get single subscription | ✅ |
| `/subscriptions/:id` | PUT | Update subscription | ✅ |
| `/subscriptions/:id` | DELETE | Delete subscription | ✅ |
| `/upcoming-renewals` | GET | Get upcoming renewals | ✅ |
| `/settings` | GET | Get user settings | ✅ |
| `/settings` | PUT | Update user settings | ✅ |
| `/reminders` | GET | List user's reminders | ✅ |
| `/daily-reminder-job` | POST | Trigger daily reminder job | ❌ (Service) |

### Example Request/Response Payloads

#### POST /subscriptions
**Request:**
```json
{
  "name": "Netflix Premium",
  "category": "Entertainment",
  "amount": 19.99,
  "currency": "USD",
  "billing_frequency": "Monthly",
  "next_renewal_date": "2025-02-05",
  "payment_method": "Visa •••• 4242",
  "tag": "Family",
  "notes": "Family plan shared with parents",
  "status": "Active",
  "icon": "🎬"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Netflix Premium",
  "category": "Entertainment",
  "amount": 19.99,
  "currency": "USD",
  "billing_frequency": "Monthly",
  "next_renewal_date": "2025-02-05",
  "payment_method": "Visa •••• 4242",
  "tag": "Family",
  "notes": "Family plan shared with parents",
  "status": "Active",
  "icon": "🎬",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

#### PUT /subscriptions/:id
**Request:**
```json
{
  "status": "Cancelled",
  "notes": "Cancelled due to budget cuts"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "Cancelled",
  "notes": "Cancelled due to budget cuts",
  "updated_at": "2025-01-15T11:00:00Z",
  ...
}
```

#### GET /upcoming-renewals?days=30
**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Netflix Premium",
    "category": "Entertainment",
    "amount": 19.99,
    "currency": "USD",
    "billing_frequency": "Monthly",
    "next_renewal_date": "2025-02-05",
    "payment_method": "Visa •••• 4242",
    "tag": "Family",
    "status": "Active",
    "days_until_renewal": 21
  },
  ...
]
```

#### PUT /settings
**Request:**
```json
{
  "default_currency": "USD",
  "global_reminder_days_before": 7,
  "email_notifications_enabled": true
}
```

**Response:**
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "default_currency": "USD",
  "time_zone": "Asia/Kolkata",
  "global_reminder_enabled": true,
  "global_reminder_days_before": 7,
  "email_notifications_enabled": true,
  "monthly_summary_enabled": false,
  "updated_at": "2025-01-15T11:30:00Z"
}
```

### Authentication Integration

All authenticated endpoints:
1. Extract JWT from `Authorization: Bearer <token>` header
2. Validate user via `supabaseClient.auth.getUser()`
3. Use `user.id` to filter queries and enforce ownership
4. Return `401 Unauthorized` if token is missing/invalid

**Frontend Integration Example:**
```typescript
const { data } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('user_id', user.id);
```

---

## 4️⃣ Daily Reminder Job

### Overview
A scheduled function that runs daily to:
1. Check for reminders due today
2. Send email notifications
3. Update reminder status

### Logic Flow

**Pseudocode:**
```
1. Get current date (YYYY-MM-DD)

2. Query reminders table:
   - WHERE reminder_date = today
   - AND status IN ('planned', 'pending')
   - JOIN with subscriptions and profiles

3. FOR EACH reminder:
   a. Calculate days until renewal
   b. Generate email content with subscription details
   c. Send email via Resend API
   d. IF success:
      - Update reminder.status = 'sent'
      - Set reminder.sent_at = NOW()
   e. IF failure:
      - Update reminder.status = 'failed'
      - Store error_message

4. Return summary:
   {
     total: count,
     sent: success_count,
     failed: failure_count,
     errors: [error_messages]
   }
```

### Email Content Generation

**Sample Gemini Prompt (for AI-generated emails):**
```
Write a friendly subscription renewal reminder email for [user_name]. 
The subscription is [subscription_name] for [amount] [currency], 
renewing on [renewal_date] in [days_until] days.

Keep it under 120 words, calm and supportive tone following SubSentry's 
brand values: calm, clear, trustworthy. Avoid guilt or shame. 
Sign off as 'SubSentry'.
```

### Email Template Structure
```html
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #0d9488;">Upcoming Renewal Reminder</h1>
  
  <p>Hi {user_name},</p>
  
  <p>Your <strong>{subscription_name}</strong> subscription is renewing in {days} days.</p>
  
  <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px;">
    <h2>Subscription Details</h2>
    <p><strong>Amount:</strong> {currency} {amount}</p>
    <p><strong>Renewal Date:</strong> {formatted_date}</p>
    <p><strong>Payment Method:</strong> {payment_method}</p>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">
    Manage this subscription in SubSentry. No surprises, no stress.
  </p>
</div>
```

### Scheduling
The function can be scheduled using:
1. **Supabase Cron** (pg_cron extension)
2. **External scheduler** (e.g., GitHub Actions, cron job)

**Cron Example (run daily at 9 AM):**
```sql
SELECT cron.schedule(
  'daily-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://vqwfnlqmmfesifvdfeju.supabase.co/functions/v1/daily-reminder-job',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  ) as request_id;
  $$
);
```

---

## 5️⃣ Implementation Setup

### Supabase Project Setup

1. **Create Supabase Project** (already done via Lovable Cloud)
2. **Configure Auth Providers**:
   - Enable Google OAuth in Supabase Auth settings
   - Add authorized redirect URLs
   - Enable email/password auth
   - Enable auto-confirm for development

3. **Set Environment Variables**:
   ```
   SUPABASE_URL=<your-project-url>
   SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   RESEND_API_KEY=<resend-api-key>
   ```

### Deploy Edge Functions

Edge functions are automatically deployed via Lovable Cloud. 

**Config (supabase/config.toml):**
```toml
project_id = "vqwfnlqmmfesifvdfeju"

[functions.subscriptions]
verify_jwt = true

[functions.upcoming-renewals]
verify_jwt = true

[functions.settings]
verify_jwt = true

[functions.reminders]
verify_jwt = true

[functions.daily-reminder-job]
verify_jwt = false  # Service function, no user JWT
```

### Frontend Integration

**Initialize Supabase Client:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
```

**Make Authenticated Requests:**
```typescript
// Get subscriptions
const { data, error } = await supabase.functions.invoke('subscriptions', {
  method: 'GET'
});

// Create subscription
const { data, error } = await supabase.functions.invoke('subscriptions', {
  method: 'POST',
  body: { name: 'Netflix', amount: 19.99, ... }
});

// Update subscription
const { data, error } = await supabase.functions.invoke('subscriptions', {
  method: 'PUT',
  body: { status: 'Cancelled' }
});
```

**Handle 401/403 Responses:**
```typescript
if (error?.status === 401 || error?.status === 403) {
  // Redirect to login
  navigate('/auth');
}
```

---

## 6️⃣ Backend Deliverable Summary

**✅ Database Tables Created:**
- `profiles` - User profile storage linked to auth.users
- `subscriptions` - Subscription records with full metadata
- `user_settings` - Per-user preferences and notification config
- `reminders` - Reminder scheduling and tracking

**✅ Authentication Setup:**
- Google OAuth + Email/Password via Supabase Auth
- Auto-create profiles on signup via database trigger
- Row-Level Security (RLS) on all user tables
- JWT-based API authentication

**✅ API Endpoints:**
- Full CRUD for subscriptions
- Settings management
- Upcoming renewals calculation
- Reminders listing

**✅ Daily Reminder Job:**
- Scheduled function to send pre-renewal email reminders
- Resend integration for email delivery
- Status tracking (planned → sent/failed)
- Detailed logging and error handling

**✅ Production-Ready Features:**
- Comprehensive RLS policies for data security
- Indexed queries for performance
- Auto-updating timestamps
- Helper functions for complex queries
- Type-safe enums for data integrity

This backend architecture fully supports the SubSentry MVP, providing secure, scalable infrastructure for user authentication, subscription management, and automated email reminders.

---

## Next Steps

1. **Configure Google OAuth** in Supabase Auth dashboard
2. **Add Resend domain** and verify email sending
3. **Set up cron job** for daily reminder execution
4. **Test end-to-end flow** from signup to receiving reminders
5. **Monitor logs** in Supabase dashboard for debugging

