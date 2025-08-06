# Get Your Supabase Access Token

## Step 1: Get Token
1. Go to: https://supabase.com/dashboard/account/tokens
2. Click "Create new token"
3. Name: "Flowvya Migration Token"
4. Copy the token (starts with `sbp_`)

## Step 2: Update .env.local
Replace this line in your .env.local file:
```
SUPABASE_ACCESS_TOKEN=sbp_placeholder_you_need_real_token
```

With your actual token:
```
SUPABASE_ACCESS_TOKEN=sbp_your_actual_token_here
```

## Step 3: Run Migration Again
```bash
npm run deployment:migrate
```

## Alternative: Skip Local Migration
If you don't want to run migrations locally, you can:

1. **Set environment variables in Railway dashboard** (as we discussed)
2. **Deploy directly:**
   ```bash
   railway up --service Flowvya
   ```
3. **Railway will run the migrations automatically** during deployment

The migrations will be applied to your production database either way!