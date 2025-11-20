# Google OAuth Setup Guide for SubSentry

## ✅ Frontend Setup Complete

The SubSentry frontend is now configured to support Google OAuth sign-in alongside email/password authentication. Users will see a "Continue with Google" button on both the login and signup screens.

## 🔧 Backend Configuration Required

To enable Google OAuth, you need to configure the Google provider in your backend:

### Step 1: Access Your Backend

1. Click the **Cloud** tab in the Lovable interface (top navigation)
2. Navigate to **Authentication** settings
3. Look for the **Auth Providers** or **Social Providers** section

### Step 2: Enable Google Provider

In the Authentication settings:
1. Find and enable the **Google** provider
2. You'll need to add:
   - **Google Client ID**
   - **Google Client Secret**

### Step 3: Get Google OAuth Credentials

You need to create OAuth credentials in the Google Cloud Console:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or select a project**
3. **Navigate to**: APIs & Services → Credentials
4. **Click**: Create Credentials → OAuth Client ID
5. **Application type**: Web application
6. **Add Authorized JavaScript origins**:
   - `http://localhost:5173` (for local development)
   - Your deployed app URL (e.g., `https://yourapp.lovable.app`)
7. **Add Authorized redirect URIs**:
   - `https://vqwfnlqmmfesifvdfeju.supabase.co/auth/v1/callback`
   - Your custom domain callback if you have one
8. **Save** and copy the Client ID and Client Secret

### Step 4: Configure OAuth Consent Screen

Before creating credentials, you need to set up the consent screen:

1. Go to **OAuth consent screen** in Google Cloud Console
2. Choose **External** (unless you have a Google Workspace account)
3. Fill in required fields:
   - **App name**: SubSentry
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
5. Add test users (for testing phase)
6. Save and continue

### Step 5: Add Credentials to Backend

Back in your Lovable Cloud backend:
1. Paste the **Client ID** into the Google provider settings
2. Paste the **Client Secret**
3. **Save** the configuration

### Step 6: Configure Redirect URLs

Make sure these redirect URLs are configured in your backend:

**Site URL**: Your main app URL
- Development: `http://localhost:5173`
- Production: `https://yourapp.lovable.app`

**Redirect URLs** (should include):
- `http://localhost:5173/**`
- `https://yourapp.lovable.app/**`
- `https://vqwfnlqmmfesifvdfeju.supabase.co/**`

## 🧪 Testing the Flow

After configuration:

1. **Test Sign Up with Google**:
   - Go to `/auth` (login page)
   - Click "Continue with Google"
   - Select your Google account
   - Consent to permissions
   - Should redirect to `/dashboard` or `/setup`

2. **Test Sign In with Google**:
   - Log out if logged in
   - Go to `/auth`
   - Click "Continue with Google"
   - Select the same Google account
   - Should redirect directly to `/dashboard`

3. **Verify Profile Creation**:
   - After first Google sign-in, check the backend database
   - Should see new profile in `profiles` table
   - Should see default settings in `user_settings` table

## 🔒 Security Checklist

- ✅ OAuth consent screen configured
- ✅ Authorized origins include your app domains
- ✅ Redirect URIs include backend callback URL
- ✅ Client ID and Secret stored securely in backend
- ✅ Auto-confirm enabled (for faster testing)

## 🐛 Troubleshooting

**"Error 400: redirect_uri_mismatch"**
- Make sure the redirect URI in Google Cloud Console exactly matches:  
  `https://vqwfnlqmmfesifvdfeju.supabase.co/auth/v1/callback`

**"Access blocked: This app's request is invalid"**
- Check that OAuth consent screen is properly configured
- Make sure email scopes are added

**User sees consent screen every time**
- This is normal for apps in "Testing" mode
- To remove this, publish your OAuth consent screen (requires verification)

**"Unauthorized client"**
- Client ID or Secret is incorrect
- Re-copy from Google Cloud Console and paste into backend

**User created but no profile**
- Check database trigger is working
- Check `handle_new_user()` function in database

## 📝 Important Notes

1. **Development vs Production**: Remember to add both local and production URLs to Google OAuth settings

2. **Email Verification**: Users signing in with Google have their email pre-verified, so they bypass email confirmation

3. **Profile Data**: Google provides `full_name`, `email`, and optionally `avatar_url` which gets stored in user metadata

4. **First Sign-In**: On first Google sign-in, the database trigger automatically creates the profile and default settings

## 🎯 What Happens During OAuth Flow

1. User clicks "Continue with Google"
2. Redirect to Google consent screen
3. User selects account and grants permissions
4. Google redirects back to backend callback URL
5. Backend validates OAuth token
6. Backend creates session for user
7. Database trigger creates profile + settings (if first time)
8. Frontend redirects to `/dashboard` or `/setup`

---

**Next Step**: Go to your backend Cloud settings and enable the Google auth provider with the credentials from Google Cloud Console!
