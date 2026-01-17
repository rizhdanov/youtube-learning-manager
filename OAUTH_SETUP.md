# OAuth 2.0 Setup Instructions

## Overview
The YouTube Learning Manager uses OAuth 2.0 to securely access your private Watch Later playlist. Follow these steps to set up authentication.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or select an existing project
3. Give your project a name (e.g., "YouTube Learning Manager")
4. Click **"Create"**

## Step 2: Enable YouTube Data API v3

1. In your Google Cloud Console, go to **"APIs & Services" > "Library"**
2. Search for **"YouTube Data API v3"**
3. Click on it and press **"Enable"**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen:
   - Choose **"External"** user type (unless you have a Google Workspace)
   - Fill in:
     - App name: `YouTube Learning Manager`
     - User support email: Your email
     - Developer contact information: Your email
   - Click **"Save and Continue"**
   - On the "Scopes" page, click **"Add or Remove Scopes"**
     - Search and add: `https://www.googleapis.com/auth/youtube.readonly`
     - Click **"Update"** then **"Save and Continue"**
   - On "Test users", add your Google account email
   - Click **"Save and Continue"**

4. Back in **"Credentials"**, click **"Create Credentials"** > **"OAuth client ID"** again
5. Select **"Web application"**
6. Give it a name (e.g., "YouTube Learning Manager Web")
7. Under **"Authorized redirect URIs"**, click **"Add URI"** and enter:
   ```
   http://localhost:5173/oauth/callback
   ```
8. Click **"Create"**

## Step 4: Save Your Credentials

After creating, you'll see a dialog with:
- **Client ID** (looks like: `123456789-abc...xyz.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-abc...xyz`)

**IMPORTANT**: Copy both of these - you'll need them in the app!

## Step 5: Configure the App

1. Open the YouTube Learning Manager at `http://localhost:5173`
2. Go to the **"Settings"** tab
3. Under "YouTube OAuth 2.0 Configuration":
   - Paste your **Client ID**
   - Paste your **Client Secret**
4. Click **"Save OAuth Credentials"**
5. Click **"Sign In with Google"**
6. You'll be redirected to Google's sign-in page
7. Sign in with your Google account
8. Grant permission to access your YouTube data
9. You'll be redirected back to the app

## Step 6: Sync Your Videos

1. Go to the **"Videos"** tab
2. Click **"Sync Videos"**
3. Your Watch Later videos will be fetched!

## Troubleshooting

### "OAuth credentials not configured" error
- Make sure you saved your Client ID and Client Secret in Settings
- Try clicking "Save OAuth Credentials" again

### "Access blocked: This app's request is invalid"
- Verify your redirect URI is exactly: `http://localhost:5173/oauth/callback`
- No trailing slashes, no typos
- Make sure you're accessing the app at `localhost:5173`, not `127.0.0.1`

### "This app hasn't been verified by Google"
- This is normal for apps in testing mode
- Click **"Advanced"** > **"Go to YouTube Learning Manager (unsafe)"**
- This is safe - it's your own app accessing your own data

### "Invalid grant" or "Token expired" errors
- Sign out in Settings and sign in again
- Your refresh token may have expired

### Still having issues?
- Double-check that YouTube Data API v3 is enabled
- Make sure you added your email as a test user in OAuth consent screen
- Verify your app is in "Testing" mode (not "Production")

## Security Notes

- **Never share your Client Secret publicly**
- OAuth tokens are stored only in your browser's localStorage
- Tokens are NOT included in data exports for security
- You can revoke access anytime at: https://myaccount.google.com/permissions

## API Quotas

YouTube Data API has a free quota of **10,000 units per day**. Typical usage:
- Fetching 50 videos: ~150-200 units
- You can sync multiple times per day without hitting the limit

If you hit the quota limit, wait 24 hours for it to reset.
