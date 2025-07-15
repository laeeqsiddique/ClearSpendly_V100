# ClearSpendly Starter Kit Integration Plan

## Overview
This document outlines how to integrate the Next.js starter kit with ClearSpendly's specific requirements while maintaining Supabase as the database choice.

## Phase 1: Initial Setup (Week 1)

### 1.1 Fork and Initialize
```bash
# Clone the starter kit
git clone https://github.com/michaelshimeles/nextjs-starter-kit clearspendly
cd clearspendly

# Remove existing database and auth dependencies
npm uninstall drizzle-orm @neondatabase/serverless better-auth
For
# Install Supabase dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 1.2 Environment Configuration
Create `.env.local` with Supabase credentials:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Keep Polar configuration
POLAR_API_KEY=your_polar_api_key
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret

# Add Ollama configuration
OLLAMA_API_URL=http://localhost:11434
NEXT_PUBLIC_PRIVACY_MODE_ENABLED=true

# Keep PostHog
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=your_posthog_host
```

### 1.3 Database Migration
1. Remove all Drizzle-related files from `/lib/db/`
2. Create new Supabase client configuration
3. Implement our database schema using Supabase migrations

## Phase 2: Core Replacements (Week 1-2)

### 2.1 Replace Authentication System

**Remove Better Auth:**
- Delete `/lib/auth/` directory
- Remove auth-related API routes

**Implement Supabase Auth:**
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Update Authentication Components:**
- Modify `/app/(auth)/` pages to use Supabase Auth
- Keep the UI components but change the logic
- Add multi-tenant context to auth flow

### 2.2 Replace File Storage

**Remove Cloudflare R2:**
- Delete R2-specific upload handlers
- Remove R2 configuration

**Implement Supabase Storage:**
```typescript
// lib/storage/receipt-storage.ts
export async function uploadReceipt(file: File, tenantId: string) {
  const supabase = createClient()
  const fileName = `${tenantId}/${Date.now()}-${file.name}`
  
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(fileName, file)
    
  return { data, error }
}
```

### 2.3 Database Schema Implementation

**Create Supabase migrations for:**
- Multi-tenant tables with RLS
- Receipt and receipt_item tables
- Price tracking tables
- User preferences

**Migration example:**
```sql
-- migrations/001_create_tenant_table.sql
CREATE TABLE tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  -- ... rest of schema
);

-- Enable RLS
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY tenant_select ON tenant
  FOR SELECT USING (
    id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid()
    )
  );
```

## Phase 3: Feature Additions (Week 2-3)

### 3.1 OCR Integration

**Add Ollama Service:**
```typescript
// lib/ocr/ollama-service.ts
export class OllamaService {
  async processReceipt(imageUrl: string, privacyMode: boolean) {
    if (privacyMode) {
      // Local processing with Ollama
      return await this.localOCR(imageUrl)
    } else {
      // Cloud fallback
      return await this.cloudOCR(imageUrl)
    }
  }
  
  private async localOCR(imageUrl: string) {
    // Implement Mistral-7B LoRA processing
  }
}
```

### 3.2 Receipt Management UI

**Create new components:**
- `/components/receipts/receipt-upload.tsx`
- `/components/receipts/receipt-list.tsx`
- `/components/receipts/receipt-detail.tsx`
- `/components/receipts/line-item-editor.tsx`

**Add receipt pages:**
- `/app/(dashboard)/receipts/page.tsx`
- `/app/(dashboard)/receipts/[id]/page.tsx`
- `/app/(dashboard)/receipts/upload/page.tsx`

### 3.3 Multi-Tenant Context

**Create tenant provider:**
```typescript
// providers/tenant-provider.tsx
export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  
  // Load tenant based on user's membership
  useEffect(() => {
    loadUserTenant()
  }, [])
  
  return (
    <TenantContext.Provider value={{ tenant, setTenant }}>
      {children}
    </TenantContext.Provider>
  )
}
```

### 3.4 Analytics Dashboard

**Create analytics components:**
- Spend overview charts
- Category breakdowns
- Price anomaly alerts
- Vendor analytics

**Integrate with existing dashboard:**
- Replace/modify `/app/(dashboard)/page.tsx`
- Add analytics widgets
- Create custom reports section

## Phase 4: ClearSpendly-Specific Features (Week 3-4)

### 4.1 Email Integration
- Create email forwarding endpoint
- Implement Gmail/Outlook OAuth flows
- Add email parsing logic

### 4.2 Price Book & Alerts
- Implement price tracking logic
- Create anomaly detection algorithms
- Build alert notification system

### 4.3 Privacy Mode
- Add privacy toggle to settings
- Implement local-only processing
- Create offline mode indicators

### 4.4 Chat Interface
- Adapt existing chat UI for receipt queries
- Integrate pgvector for semantic search
- Connect to Mistral-7B for responses

## File Structure After Integration

```
clearspendly/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Modified for Supabase
│   │   └── signup/         # Modified for Supabase
│   ├── (dashboard)/
│   │   ├── receipts/       # NEW
│   │   ├── analytics/      # NEW
│   │   ├── vendors/        # NEW
│   │   ├── settings/       # Modified
│   │   └── chat/          # Modified for Mistral
│   └── api/
│       ├── webhooks/       # Keep Polar webhooks
│       ├── ocr/           # NEW
│       └── email/         # NEW
├── components/
│   ├── ui/                # Keep shadcn/ui
│   ├── receipts/          # NEW
│   ├── analytics/         # NEW
│   └── chat/             # Modified
├── lib/
│   ├── supabase/         # NEW (replaces db/)
│   ├── ocr/              # NEW
│   ├── email/            # NEW
│   └── polar/            # Keep
└── providers/
    ├── theme-provider.tsx  # Keep
    ├── tenant-provider.tsx # NEW
    └── supabase-provider.tsx # NEW
```

## Development Workflow

### 1. Initial Setup Tasks
- [ ] Fork starter kit repository
- [ ] Remove Neon/Drizzle dependencies
- [ ] Install Supabase dependencies
- [ ] Create Supabase project
- [ ] Run database migrations

### 2. Core Integration Tasks
- [ ] Replace authentication system
- [ ] Replace file storage
- [ ] Implement multi-tenant context
- [ ] Update API routes for Supabase

### 3. Feature Development Tasks
- [ ] Build receipt management UI
- [ ] Integrate OCR processing
- [ ] Create analytics dashboard
- [ ] Implement email connectors
- [ ] Add privacy mode features

### 4. Testing & Validation
- [ ] Test multi-tenant isolation
- [ ] Validate OCR accuracy
- [ ] Performance testing
- [ ] Security audit

## Key Considerations

### 1. Preserve What Works
- Keep the excellent UI/UX patterns
- Maintain the component structure
- Use existing Polar integration
- Leverage chat interface design

### 2. Gradual Migration
- Replace one system at a time
- Test extensively after each change
- Maintain working state throughout

### 3. Performance Optimization
- Implement proper caching
- Use Supabase real-time features
- Optimize image processing
- Consider edge functions

### 4. Security First
- Implement RLS from the start
- Test tenant isolation thoroughly
- Secure file upload handling
- Validate all user inputs

## Conclusion

This integration plan allows us to leverage the starter kit's excellent foundation while implementing ClearSpendly's specific requirements. The key is to maintain the UI/UX quality while replacing the backend systems with Supabase and adding our domain-specific features.