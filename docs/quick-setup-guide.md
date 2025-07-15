# ClearSpendly Quick Setup Guide

## Prerequisites

### Required Software
- **Node.js** (v18.17.0 or higher)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify: `node --version` and `npm --version`

- **Git** (latest version)
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify: `git --version`

- **Ollama** (for local AI processing)
  - Download from [ollama.ai](https://ollama.ai/)
  - Install Mistral-7B model: `ollama pull mistral`
  - Verify: `ollama --version`

### Recommended Tools
- **VS Code** with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - Prettier - Code formatter
  - ESLint
  - Supabase snippets

## Account Setup

### 1. Supabase Account
1. Sign up at [supabase.com](https://supabase.com/)
2. Create a new project
3. Note down your project URL and anon key
4. Enable the following extensions in SQL Editor:
   ```sql
   -- Enable required extensions
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   CREATE EXTENSION IF NOT EXISTS "vector";
   ```

### 2. Polar Account (Payment Processing)
1. Sign up at [polar.sh](https://polar.sh/)
2. Create a new organization
3. Get your API keys from settings
4. Set up webhook endpoint (we'll configure this later)

### 3. PostHog Account (Analytics)
1. Sign up at [posthog.com](https://posthog.com/)
2. Create a new project
3. Get your project API key

### 4. Resend Account (Email)
1. Sign up at [resend.com](https://resend.com/)
2. Verify your sending domain
3. Get your API key

## Project Setup

### Step 1: Clone and Initialize
```bash
# Clone the starter kit
git clone https://github.com/michaelshimeles/nextjs-starter-kit ClearSpendly_V100
cd ClearSpendly_V100

# Install dependencies
npm install

# Remove existing database and auth dependencies
npm uninstall drizzle-orm @neondatabase/serverless better-auth

# Install Supabase dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/ssr

# Install additional dependencies for ClearSpendly
npm install @ai-sdk/openai ai date-fns recharts lucide-react react-dropzone
```

### Step 2: Environment Configuration
Create `.env.local` in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Polar Configuration (Keep from starter kit)
POLAR_API_KEY=your_polar_api_key
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret
NEXT_PUBLIC_POLAR_ORGANIZATION_ID=your_polar_org_id

# PostHog Configuration (Keep from starter kit)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Resend Configuration (For email notifications)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Ollama Configuration (Local AI)
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=mistral:latest

# OpenAI Configuration (Fallback for OCR)
OPENAI_API_KEY=your_openai_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PRIVACY_MODE_ENABLED=true
```

### Step 3: Database Setup
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Create migrations directory
mkdir -p supabase/migrations

# We'll add migration files in the next steps
```

### Step 4: Start Ollama Service
```bash
# Start Ollama service
ollama serve

# In another terminal, pull and run Mistral
ollama pull mistral
ollama run mistral
```

### Step 5: Development Server
```bash
# Start the development server
npm run dev

# Open your browser to http://localhost:3000
```

## File Structure After Setup

```
ClearSpendly_V100/
├── .env.local                 # Environment variables
├── .gitignore                 # Git ignore file
├── package.json               # Dependencies
├── tailwind.config.js         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
├── next.config.js             # Next.js configuration
├── app/                       # Next.js app directory
│   ├── (auth)/               # Authentication pages
│   ├── (dashboard)/          # Dashboard pages
│   ├── api/                  # API routes
│   ├── globals.css           # Global styles
│   └── layout.tsx            # Root layout
├── components/               # React components
│   ├── ui/                   # shadcn/ui components
│   └── ...                   # Other components
├── lib/                      # Utility functions
│   ├── supabase/            # Supabase client
│   ├── utils.ts             # Utility functions
│   └── ...                   # Other utilities
├── docs/                     # Documentation
│   ├── ClearSpendly PRD.md
│   ├── implementation-plan.md
│   ├── database-structure.md
│   ├── starter-kit-integration-plan.md
│   └── quick-setup-guide.md
└── supabase/                 # Supabase configuration
    ├── migrations/           # Database migrations
    └── config.toml          # Supabase config
```

## Next Steps

### 1. Database Schema Setup
Run the database migrations to create all required tables:
```bash
# Create migration files based on our database structure
supabase migration new create_tenant_table
supabase migration new create_user_table
supabase migration new create_receipt_tables
# ... etc

# Apply migrations
supabase db push
```

### 2. Authentication Setup
Configure Supabase Auth providers:
1. Go to Authentication > Settings in Supabase dashboard
2. Enable Email authentication
3. Enable Google OAuth (optional)
4. Enable Microsoft OAuth (optional)
5. Configure redirect URLs

### 3. Storage Setup
Create storage buckets:
```sql
-- Run in Supabase SQL editor
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
```

### 4. Row Level Security (RLS)
Enable RLS on all tables and create policies as defined in `database-structure.md`

## Development Workflow

### Daily Development
1. Start Ollama service: `ollama serve`
2. Start development server: `npm run dev`
3. Make changes and test
4. Commit and push changes

### Testing
```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests (when we add them)
npm test
```

### Database Changes
```bash
# Create new migration
supabase migration new your_migration_name

# Apply migrations
supabase db push

# Reset database (development only)
supabase db reset
```

## Common Issues & Solutions

### 1. Ollama Connection Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama service
pkill ollama
ollama serve
```

### 2. Supabase Connection Issues
- Verify environment variables are correct
- Check if project is properly linked: `supabase status`
- Ensure RLS policies allow access

### 3. Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### 4. TypeScript Errors
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Update TypeScript
npm update typescript
```

## Development Tips

### 1. Use the Supabase Studio
- Access at your project URL + `/studio`
- Great for debugging SQL queries
- Monitor real-time database changes

### 2. Environment Variables
- Never commit `.env.local` to git
- Use `.env.example` for team reference
- Restart dev server after env changes

### 3. Database Debugging
```bash
# View database logs
supabase logs

# Access database directly
supabase db connect
```

### 4. Performance Monitoring
- Use PostHog for user analytics
- Monitor Supabase performance metrics
- Use Next.js built-in analytics

## Security Checklist

- [ ] Environment variables secured
- [ ] RLS policies implemented
- [ ] API routes protected
- [ ] File uploads validated
- [ ] Input sanitization enabled
- [ ] HTTPS in production
- [ ] Regular dependency updates

## Deployment Preparation

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Configure build settings
4. Set up preview deployments

### Production Environment
- Use production Supabase instance
- Configure proper domain for auth redirects
- Set up monitoring and logging
- Configure backup strategies

## Support Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

### Community
- ClearSpendly Team Chat (internal)
- Supabase Discord
- Next.js GitHub Discussions
- Stack Overflow (tag: nextjs, supabase)

## Troubleshooting Commands

```bash
# Check all service status
npm run dev &
ollama serve &
supabase status

# View logs
npm run dev --verbose
tail -f ~/.ollama/logs/server.log

# Database health check
supabase db ping

# Clear all caches
rm -rf .next node_modules/.cache
npm install
```

This guide should get any developer up and running with ClearSpendly in under 30 minutes. Update this document as we add new features or change the development workflow.