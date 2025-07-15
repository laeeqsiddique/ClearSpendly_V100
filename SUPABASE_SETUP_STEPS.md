# Supabase Setup Steps

## Step 1: Create Supabase Project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Choose your organization or create one
4. Fill in project details:
   - **Name**: ClearSpendly
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you
5. Click "Create new project"
6. Wait for project to be created (2-3 minutes)

## Step 2: Get Project Credentials
After project is created, go to Settings > API:

1. **Project URL**: Copy the "Project URL" 
   - Example: `https://your-project-id.supabase.co`
   
2. **API Keys**: Copy the "anon public" key
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   
3. **Service Role Key**: Copy the "service_role" key (keep secret!)
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 3: Update Environment Variables
Update your `.env.local` file with the actual values:

```env
# Replace these with your actual Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Test Connection
After updating the environment variables, we can test the connection with:

```bash
npm run supabase status
```

## Step 5: Run Database Migrations
Once connected, we'll run our migration:

```bash
npm run supabase db push
```

## Step 6: Enable Authentication Providers
In Supabase Dashboard:
1. Go to Authentication > Settings
2. Enable Email authentication
3. (Optional) Enable Google OAuth
4. Set Site URL to: `http://localhost:3000`
5. Set Redirect URLs to: `http://localhost:3000/auth/callback`

---

**🔥 Once you complete these steps, let me know and I'll help you run the migrations and test everything!**