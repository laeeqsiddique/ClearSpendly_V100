# Multi-User Implementation Plan
*Flowvya Team Management & User Attribution System*

## 🎯 Overview

Implement full multi-user support for Flowvya tenants, allowing business owners to invite team members with role-based access and proper user attribution throughout the system.

## 📊 Current State Analysis

### ✅ **What's Already Built**
- **Database schema** with `tenant` → `membership` → `user` relationships
- **Role system** with owner/admin/member/viewer roles  
- **Row Level Security (RLS)** for tenant isolation
- **Multi-tenant authentication** via Supabase
- **User tracking fields** (`created_by`, `updated_by`) in database schema

### ❌ **What's Missing**
- User attribution in API calls (`created_by: null` everywhere)
- User management UI for inviting/managing team members
- Role-based permission enforcement
- User-filtered reporting and data views

## 🏗️ Implementation Phases

### **Phase 1: Foundation (Week 1-2)**
**Goal:** Fix user attribution and basic role enforcement

#### 1.1 Fix User Attribution in APIs
Update all creation APIs to populate `created_by` field:

**Files to modify:**
- `app/api/tags/route.ts` - Tag creation
- `app/api/tags/categories/route.ts` - Category creation  
- `app/api/receipts/route.ts` - Receipt creation
- `app/api/invoices/route.ts` - Invoice creation
- `app/api/payments/route.ts` - Payment creation
- `app/api/mileage/route.ts` - Mileage entry creation

**Example implementation:**
```typescript
// Before
created_by: null // TODO: Add user ID when auth is implemented

// After  
const user = await getUser();
created_by: user.id
```

#### 1.2 Create User Context Helper
Create `lib/user-context.ts`:
```typescript
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUserWithTenant(tenantId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const membership = await getUserMembership(user.id, tenantId);
  return { user, membership };
}
```

### **Phase 2: User Management UI (Week 3-4)**
**Goal:** Build admin interface for managing team members

#### 2.1 Team Management Dashboard
Create `app/dashboard/team/page.tsx`:

**Features:**
- List current team members with roles
- Invite new users via email
- Change user roles (owner/admin only)
- Remove users from tenant
- Pending invitation status

**UI Components needed:**
- `components/team/member-list.tsx`
- `components/team/invite-dialog.tsx` 
- `components/team/role-selector.tsx`
- `components/team/member-actions.tsx`

#### 2.2 Team Member Invitation System
Create invitation flow:

**Database additions:**
```sql
-- Add to membership table
ALTER TABLE membership ADD COLUMN invitation_token UUID;
ALTER TABLE membership ADD COLUMN invitation_expires_at TIMESTAMPTZ;
ALTER TABLE membership ADD COLUMN invitation_status VARCHAR(20) DEFAULT 'pending';
```

**API endpoints:**
- `POST /api/team/invite` - Send invitation email
- `POST /api/team/accept-invite` - Accept invitation via token
- `DELETE /api/team/[userId]` - Remove team member
- `PUT /api/team/[userId]/role` - Update member role

#### 2.3 Email Invitation Templates
Extend existing email template system for team invitations:
- Welcome email for new team members
- Role change notifications
- Invitation expiry reminders

### **Phase 3: Permission System (Week 5-6)**
**Goal:** Implement role-based access control

#### 3.1 Permission Matrix
Define what each role can do:

```typescript
const PERMISSIONS = {
  owner: ['*'], // All permissions
  admin: [
    'receipts:create', 'receipts:edit', 'receipts:delete',
    'invoices:create', 'invoices:edit', 'invoices:delete', 
    'payments:create', 'payments:edit',
    'team:invite', 'team:manage',
    'reports:view', 'exports:create'
  ],
  member: [
    'receipts:create', 'receipts:edit:own',
    'invoices:create', 'invoices:edit:own',
    'payments:create', 'payments:edit:own',
    'reports:view:own'
  ],
  viewer: [
    'receipts:view', 'invoices:view', 'reports:view'
  ]
};
```

#### 3.2 Permission Middleware
Create `lib/permissions.ts`:
```typescript
export async function hasPermission(
  userId: string, 
  tenantId: string, 
  permission: string
): Promise<boolean> {
  const membership = await getUserMembership(userId, tenantId);
  return checkPermission(membership.role, permission);
}

export function requirePermission(permission: string) {
  return async (req: NextRequest, context: any) => {
    const hasAccess = await hasPermission(userId, tenantId, permission);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return context.next();
  };
}
```

#### 3.3 Protect API Routes
Add permission checks to sensitive operations:
```typescript
// Example: Only admins can delete invoices
export async function DELETE(req: NextRequest, { params }) {
  const allowed = await hasPermission(userId, tenantId, 'invoices:delete');
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... deletion logic
}
```

### **Phase 4: User-Filtered Views (Week 7-8)**
**Goal:** Add "Show only my data" filtering options

#### 4.1 User Attribution Display
Show who created each record:
- Add "Created by" column to data tables
- User avatars/initials in record lists
- "My Items" vs "All Items" toggle switches

#### 4.2 User-Filtered Reports
Extend reporting to support user filtering:
- P&L reports with user breakdown
- "My invoices vs team invoices" 
- User activity summaries
- Team performance analytics

#### 4.3 Dashboard Personalization
Allow users to customize their dashboard:
- Personal vs team metrics toggle
- Role-appropriate widget visibility
- User-specific quick actions

## 🔧 Technical Requirements

### Database Changes
```sql
-- Ensure all tables have user attribution
ALTER TABLE receipt ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);
ALTER TABLE invoice ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);  
ALTER TABLE payment ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);
ALTER TABLE mileage_entry ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);

-- Add invitation system
ALTER TABLE membership ADD COLUMN IF NOT EXISTS invitation_token UUID;
ALTER TABLE membership ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;
ALTER TABLE membership ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(20) DEFAULT 'accepted';
```

### Environment Variables
```env
# Email service for invitations (already configured for invoices)
RESEND_API_KEY=your_key
RESEND_FROM_EMAIL=team@flowvya.com

# App URL for invitation links  
NEXT_PUBLIC_APP_URL=https://app.flowvya.com
```

## 🚀 Pricing Integration

### Free Tier
- **1 user only** (tenant owner)
- No team management features

### Pro Tier ($39/month)
- **Up to 5 team members**
- Full role management (owner/admin/member)
- User attribution and filtering
- Team activity reports

### Premium Tier ($99/month)  
- **Unlimited team members**
- Advanced permission controls
- Department/entity-level access
- Advanced team analytics

### Implementation:
```typescript
const PLAN_LIMITS = {
  free: { maxUsers: 1 },
  pro: { maxUsers: 5 },
  premium: { maxUsers: -1 } // Unlimited
};

export async function canAddUser(tenantId: string): Promise<boolean> {
  const tenant = await getTenant(tenantId);
  const currentUserCount = await getUserCount(tenantId);
  const limit = PLAN_LIMITS[tenant.subscription_plan].maxUsers;
  
  return limit === -1 || currentUserCount < limit;
}
```

## 📋 Testing Checklist

### Phase 1 Testing
- [ ] All APIs populate `created_by` field correctly
- [ ] User context is properly retrieved in all endpoints
- [ ] RLS policies work with user attribution

### Phase 2 Testing  
- [ ] Team invitation emails send successfully
- [ ] Invitation tokens work and expire properly
- [ ] Role changes reflect immediately in UI
- [ ] User removal works without data loss

### Phase 3 Testing
- [ ] Permission matrix enforced correctly
- [ ] API routes properly protected by role
- [ ] UI elements hide/show based on permissions
- [ ] Error messages clear for forbidden actions

### Phase 4 Testing
- [ ] User filtering works in all data views
- [ ] Reports show correct user attribution
- [ ] Dashboard adapts to user permissions
- [ ] Performance acceptable with user-filtered queries

## 🎯 Success Metrics

### Technical Metrics
- **Zero** records with `created_by: null` after Phase 1
- **<200ms** response time for user-filtered queries  
- **100%** API coverage for permission checks
- **Zero** unauthorized data access incidents

### Business Metrics
- **Increased** average revenue per tenant (teams = higher tier plans)
- **Improved** user retention (team collaboration stickiness)
- **Reduced** support tickets about data attribution
- **Higher** conversion from Free to Pro (team collaboration needs)

## 🔄 Migration Strategy

### Existing Data
For existing records with `created_by: null`:
```sql
-- Set owner as creator for historical data
UPDATE receipt SET created_by = (
  SELECT user_id FROM membership 
  WHERE tenant_id = receipt.tenant_id AND role = 'owner'
  LIMIT 1
) WHERE created_by IS NULL;
```

### Rollout Plan
1. **Phase 1** - Deploy user attribution fixes (low risk)
2. **Phase 2** - Beta test team management with select customers
3. **Phase 3** - Gradual permission rollout with feature flags
4. **Phase 4** - Full rollout with user filtering options

## 📝 Documentation Updates

### User Documentation
- [ ] Team management guide for business owners
- [ ] Role permissions reference
- [ ] Invitation workflow for new team members
- [ ] User filtering guide for reports

### Developer Documentation  
- [ ] API authentication with user context
- [ ] Permission system architecture
- [ ] User attribution best practices
- [ ] Multi-tenant testing guidelines

---

## 🎯 Next Steps

1. **Review this plan** with the development team
2. **Create detailed tickets** for Phase 1 work
3. **Set up development environment** for multi-user testing
4. **Design mockups** for team management UI
5. **Plan user testing** with existing customers who need teams

**Estimated Timeline: 8 weeks for full implementation**
**Estimated Effort: 1-2 developers full-time**
**Risk Level: Medium (well-architected foundation exists)**