# Environment Variables Documentation

This document lists all environment variables needed for the WhatsApp Admin Panel dashboard.

## Required Environment Variables

These environment variables **must** be set for the dashboard to function:

### `ADMIN_PASSWORD`
- **Description**: Password required to access the admin panel
- **Security**: Use a strong, unique password
- **Used in**: `api/auth/login.js` for authentication
- **Example**: `MySecurePassword123!`
- **Important**: This password protects your entire admin panel. Keep it secret!

### `JWT_SECRET` (Optional but Recommended)
- **Description**: Secret key for signing JWT tokens. If not set, `ADMIN_PASSWORD` will be used as fallback
- **Security**: Use a long, random string (at least 32 characters)
- **Used in**: `api/auth/login.js` and `api/auth/verify.js`
- **Example**: `your-super-secret-jwt-key-at-least-32-characters-long`
- **Note**: Generate a random string: `openssl rand -base64 32`

### `WHATSAPP_ACCESS_TOKEN`
- **Description**: Your Meta (Facebook) access token for WhatsApp Business API
- **How to get**: 
  - Go to [Meta Business Suite](https://business.facebook.com/)
  - Navigate to System Users or Access Tokens
  - Generate a token with `whatsapp_business_messaging` permissions
- **Used in**: All API endpoints (`api/config.js`, `api/send-message.js`, `api/verify-phone.js`)
- **Example**: `EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### `WHATSAPP_PHONE_ID`
- **Description**: Your WhatsApp Business phone number ID
- **How to get**: 
  - In Meta Business Suite, go to WhatsApp > API Setup
  - Your Phone Number ID is displayed there
- **Used in**: All API endpoints (`api/config.js`, `api/send-message.js`, `api/verify-phone.js`)
- **Example**: `123456789012345`

## Optional Environment Variables

These are only needed if you want to fetch stored messages from a database:

### `SUPABASE_URL` (Optional - Recommended)
- **Description**: Your Supabase project URL for storing/fetching messages
- **How to get**: 
  - Go to your Supabase project dashboard
  - Navigate to Settings → API
  - Copy the "Project URL"
- **Used in**: `api/messages.js` (if using Supabase)
- **Example**: `https://xxxxx.supabase.co`

### `SUPABASE_KEY` (Optional - Recommended)
- **Description**: Your Supabase anon/service role key (use service role key for server-side)
- **How to get**: 
  - Go to your Supabase project dashboard
  - Navigate to Settings → API
  - Copy the "service_role" key (for server-side) or "anon" key
- **Used in**: `api/messages.js` (if using Supabase)
- **Example**: `sb_secret_XXXXXXXXXXXXXXXX` or `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Note**: For production, use the service role key. For development, anon key works but has RLS restrictions.

### `MONGODB_URI` (Optional)
- **Description**: MongoDB connection string for storing/fetching messages
- **Used in**: `api/messages.js` (if using MongoDB)
- **Example**: `mongodb+srv://user:password@cluster.mongodb.net/dbname`

### `POSTGRES_URL` (Optional)
- **Description**: PostgreSQL connection string for storing/fetching messages
- **Used in**: `api/messages.js` (if using PostgreSQL)
- **Example**: `postgresql://user:password@host:5432/dbname`

### `N8N_API_URL` (Optional)
- **Description**: URL of your n8n API endpoint for fetching messages
- **Used in**: `api/messages.js` (if fetching from n8n API)
- **Example**: `https://your-n8n-instance.com/api/v1`

## Setting Environment Variables

### For Local Development

Create a `.env.local` file in the project root:

```bash
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_ID=your_phone_id_here
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=sb_secret_XXXXXXXXXXXXXXXX
```

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - Key: `ADMIN_PASSWORD`
   - Value: Your secure password (keep this secret!)
   - Environment: Production, Preview, Development (select all)
4. Add `JWT_SECRET` (optional but recommended - use a random 32+ character string)
5. Add `WHATSAPP_ACCESS_TOKEN` - Your WhatsApp access token
6. Add `WHATSAPP_PHONE_ID` - Your WhatsApp phone number ID
7. Add `SUPABASE_URL` - Your Supabase project URL
8. Add `SUPABASE_KEY` - Your Supabase service role key
9. Click **Save** after each addition

### For Other Platforms

Set environment variables according to your hosting platform's documentation:
- **Netlify**: Site settings → Environment variables
- **Railway**: Project settings → Variables
- **Heroku**: `heroku config:set WHATSAPP_ACCESS_TOKEN=xxx`

## Verification

After setting environment variables, you can verify they're working by:

1. Deploying your application
2. Opening the admin panel
3. Clicking the "Check API" or "Verify Connection" button
4. You should see a success message with your verified business name

## Security Notes

⚠️ **Important Security Considerations:**

- Never commit `.env.local` or `.env` files to Git
- Access tokens should be kept secret
- Use different tokens for development and production
- Rotate tokens regularly for security
- Tokens expire - you may need to regenerate them periodically

## Troubleshooting

### Error: "WHATSAPP_ACCESS_TOKEN environment variable is not set"
- Make sure you've set the environment variable in your hosting platform
- For local development, ensure `.env.local` exists and is in the project root
- Restart your development server after adding environment variables

### Error: "WHATSAPP_PHONE_ID environment variable is not set"
- Verify the variable name is exactly `WHATSAPP_PHONE_ID` (case-sensitive)
- Check that the variable is set in all environments (Production, Preview, Development)

### API Connection Fails
- Verify your access token is valid and not expired
- Check that your token has the required permissions
- Ensure your phone number ID is correct

### Cannot Login / Authentication Fails
- Verify `ADMIN_PASSWORD` is set in your environment variables
- Check that you're using the correct password
- Ensure the environment variable is set in all environments (Production, Preview, Development)
- Try clearing browser cookies and logging in again
- Check browser console for any errors

