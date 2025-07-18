## File: docs/PRD.md

# ClearSpendly – Product Requirements Document (PRD)

### 1. Purpose

ClearSpendly converts any receipt (paper or digital) into structured, searchable data and actionable spend insights for small‑to‑mid‑size businesses. It speeds up bookkeeping, flags cost anomalies, and readies tax documentation – all inside a privacy‑first multi‑tenant SaaS.

### 2. Problem Statement

*Manual receipt handling is slow and error‑prone.* Bookkeepers spend hours typing line‑items, categorising expenses, and chasing employees for missing details. Existing tools stop at image‑level storage; they rarely exploit line‑item intelligence or price‑creep alerts.

### 3. Goals & Success Metrics

| Goal                           | Metric                                                 | Target (M6) |
| ------------------------------ | ------------------------------------------------------ | ----------- |
| Reduce receipt processing time | Avg. < **20 s** per receipt (upload → structured rows) |             |
| Alert price creep early        | 95 % of anomalies detected within 24 h                 |             |
| Drive conversion               | 10 % free → paid within 30 days                        |             |
| Retain users                   | <5 % monthly logo churn                                |             |

### 4. Personas

| Persona                     | Needs                             | Key Features                      |
| --------------------------- | --------------------------------- | --------------------------------- |
| *Owner* (solo entrepreneur) | Quick capture, tax deduction view | Mobile upload, Schedule C mapping |
| *Bookkeeper*                | Bulk export, search, audit trail  | CSV/PDF packs, price‑book, RLS    |
| *Accountant*                | Read‑only access, anomaly report  | Tenant impersonation, dashboards  |

### 5. Features (MVP scope)

1. **Capture** – drag‑drop, mobile photo, e‑mail forward, Gmail/Outlook connector.
2. **OCR + Parsing** – on‑device LoRA (Mistral‑7B) via Ollama; fallback to hosted.
3. **Categorise & Store** – IRS Schedule C + custom tags, Supabase row‑level security.
4. **Price‑Book & Alerting** – nightly jobs in Supabase Edge Functions.
5. **Spend Exploration** – chat layer powered by pgvector + Mistral‑7B.
6. **Exports** – CSV line‑items, PDF bundle with original images.
7. **Subscriptions & Usage Meter** – Polar integration.
8. **Privacy Mode** – tenant toggle to enforce offline OCR only.

### 6. Non‑Functional Requirements

* P99 receipt latency < 2 s (OCR excluded)
* GDPR: data export & delete within 30 days
* Multi‑tenant RLS enforced in SQL layer
* CI/CD with Vercel Preview URLs per PR

### 7. Out‑of‑Scope (MVP)

* Mileage tracking
* Vendor negotiation recommender
* Public parsing API

### 8. Enhanced User Experience Features

#### **8.1 Advanced Receipt Management** ✅ **IMPLEMENTED**
* Hybrid view system with table and card layouts
* Smart date filtering with presets (Today, This Week, This Month, etc.)
* Advanced tag filtering with visual grid interface
* Real-time search with debounced input
* Professional status badges with icons
* Enhanced empty states and filter management
* Responsive design optimized for all devices

#### **8.2 AI-Powered Features** ✅ **IMPLEMENTED**
* **AI Chat Agent**: Conversational interface for receipt queries and analysis
* **Context-Aware Responses**: Understands selected receipts and active filters
* **Natural Language Processing**: Answers questions about expenses, totals, and patterns
* **Smart Suggestions**: Provides helpful query suggestions and guidance
* **Receipt Analysis**: Detailed breakdown of individual receipts and line items
* **Expense Insights**: Spending patterns, vendor analysis, and tag-based reporting
* **Export Guidance**: Helps users understand and use Excel export features
* **Real-time Integration**: Seamlessly integrates with current receipt data and filters

#### **8.3 Administration & Management** ✅ **IMPLEMENTED**
* **System Configuration Panel**: App settings, currency, timezone, feature toggles
* **Usage Analytics Dashboard**: Real-time statistics and system health monitoring
* **Data Management Interface**: Backup creation, storage monitoring, data operations
* **Integration Settings**: API key management for external services
* **Security Configuration**: Privacy settings, encryption, session management
* **System Health Monitoring**: Database, AI service, and storage status indicators
* **Backup & Restore**: Automated backup creation with downloadable JSON exports

### 9. Nice to Have (Future Contractor Features)

#### **9.1 Billable Expense Management**
* Mark expenses as billable/non-billable to clients
* Track reimbursement status (pending/approved/paid/rejected)
* Client-specific expense approval workflows
* Business vs personal expense percentage allocation
* Pre-approval request system for large expenses

#### **9.2 Mileage & Non-Receipt Expense Tracking**
* GPS-based automatic mileage logging for client visits
* Manual mileage entry with start/end locations
* IRS-compliant mileage rate tracking and updates
* Per diem and daily allowance tracking (meals, lodging)
* Public transit and parking expenses (no receipt scenarios)
* Home office deduction calculations

#### **9.3 Client Expense Policy Compliance**
* Client-specific spending limits and approval thresholds
* Automatic policy violation detection and warnings
* Custom expense categories per client
* Receipt requirement validation (amount thresholds)
* Blocked expense category enforcement
* Policy compliance reporting

#### **9.4 Contractor-Specific Templates & Workflows**
* Quick-entry templates for recurring expenses
* Monthly subscription expense automation
* Business percentage defaults for mixed-use expenses
* Contractor expense category presets
* Multi-client project expense allocation
* Time-based expense tracking integration

#### **9.5 Enhanced Contractor Reporting**
* Client-specific reimbursement reports
* Tax deduction summaries by category
* Mileage logs in IRS-compliant format
* Policy compliance audit reports
* Billable vs non-billable expense breakdowns
* Project profitability expense analysis

#### **9.6 Multi-Currency & International Contractor Support**
* Real-time currency conversion for international work
* Foreign tax handling (VAT, GST) by country
* Per-country expense category mapping
* Exchange rate tracking for audit purposes
* International per diem rate databases

---

## File: docs/Implementation\_Plan.md

# ClearSpendly – 10‑Week Implementation Plan

> **Stack:** Next.js 14 (App Router) starter‑kit, Supabase (Postgres + Edge Functions), Mistral‑7B / LoRA served locally via Ollama, Tailwind UI.

| Week | Track                | Milestones                                                                                                |
| ---- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| 0    | Kick‑off             | Project repo forked from starter‑kit; environments (Dev, Preview, Prod) provisioned in Supabase & Vercel. |
| 1    | Data                 | Implement core schema (tenant → receipt\_item). RLS policies & seed scripts.                              |
| 2    | Backend              | Edge Function **/parse‑receipt** – accept file, invoke OCR worker, return JSON.                           |
| 3    | AI                   | Dockerised Ollama worker pool; fine‑tune receipt LoRA; embed receipt items → pgvector.                    |
| 4    | Auth & Multi‑Tenancy | Supabase Auth (email + OAuth), membership roles, Polar webhook.                                           |
| 5    | Frontend             | Upload flow (dropzone, progress, error states). Table + infinite scroll of receipts.                      |
| 6    | Alerts               | Nightly cron → price\_book snapshots, edge function inserts price\_alert rows & sends e‑mail via Resend.  |
| 7    | Chat                 | `/api/chat` route: semantic search, auto‑SQL, Mistral summary; Chat UI (shadcn/ui).                       |
| 8    | Export & Privacy     | Generate PDF/ZIP bundles with images; offline OCR toggle (supabase flag).                                 |
| 9    | Hardening            | Load‑test, P99 perf, OWASP scan, GDPR flows.                                                              |
| 10   | Launch               | Beta invite, instrumentation (PostHog), release blog, support playbook.                                   |

Dependencies: Polar account, Resend e‑mail key, GPU host for Ollama workers.

---

## File: docs/Architecture.md

# ClearSpendly – System Architecture

```mermaid
flowchart TD
  subgraph Client
    A1(Web & Mobile) -- uploads/queries --> Edge(API)
  end
  subgraph Vercel
    Edge(API)[Next.js API Routes] --> SB(Supabase Postgres)
    Edge --> EF[Supabase Edge Functions]
  end
  EF -->|OCR call| OW[Ollama Workers]
  EF -->|Polar webhook| SB
  SB <-->|RLS queries| Edge
  SB -->|Realtime| A1
  SB -->|Price cron| EF
  EF -->|Alert e‑mail| SES[Resend]
```

* **Multi‑Tenant Isolation** – Postgres RLS + JWT claims.
* **AI Pipelines** – Ollama runs local LoRA (Mistral‑Receipt‑7B) via HTTP; container auto‑scales on GPU node pool.
* **Chat Layer** – Vector search (Supabase pgvector extension) + Mistral‑7B GPT‑style prompt.
* **Offline Mode** – When `tenant.privacy_mode = true`, OCR call routed to tenant‑dedicated Ollama node inside VPC.

---

## File: docs/Project\_Structure.md

```text
apps/
  web/                # Next.js starter‑kit fork
    app/
      (routes)
      api/
        chat/route.ts
        parse‑receipt/route.ts
    components/
      ui/             # shadcn/ui re‑exports
      ReceiptTable.tsx
      ChatPanel.tsx
    lib/
      supabase.ts
      ocr.ts
      polar.ts
  workers/
    ocr‑worker/       # Node script calling Ollama
    nightly‑cron/     # price_book snapshot job
packages/
  db/                 # Kysely schema, migrations
  prompts/            # central prompt templates
  ui‑kit/             # shared Tailwind components
scripts/
  seed.ts             # dev seed data
supabase/
  init.sql            # schema + RLS
  functions/
    polar‑webhook.ts
    nightly‑price‑cron.ts
```

---

## File: docs/UI\_Guide.md

### Design Language

* Tailwind CSS (starter‑kit defaults) + shadcn/ui components.
* Colour palette: neutral background, accent `#4F46E5` (indigo‑600).
* Typography: Inter, 14/16/18 px scale.

### Key Screens

1. **Dashboard** – quick stats (monthly spend, alerts), recent receipts table.
2. **Upload** – drag‑drop area, file queue, status chips.
3. **Receipts List** – searchable, filter by vendor/date, row expands to line‑items.
4. **Chat** – right‑side drawer; natural‑language Q\&A.
5. **Settings**

   * *Workspace* – name, tax year, privacy toggle.
   * *Members* – invite, role change.
   * *Billing* – plan, usage bar, payment method.
6. **Mobile PWA** – compressed flow: Camera → Preview → Submit.

### UX Guidelines

* Actions top‑right, primary button accent.
* Toasts for async ops (<4 s). Longer tasks show progress bar.
* Preserve search params in URL for shareable views.

---

## File: docs/Prompt\_Library.md

### 1. System Prompts

```json
{
  "chat.system": "You are ClearSpendly AI Assistant. You have access to SQL receipts data via {{tool}}. Answer user questions in plain English, show totals in USD, and suggest follow‑up queries. If you’re not sure, ask for clarification."
}
```

### 2. Receipt Parsing (LoRA‑OCR)

```text
<inst>
You are a JSON generator. Extract every line‑item from the receipt text. Output schema:
{
  "vendor": string,
  "receipt_date": ISO8601,
  "currency_code": string,
  "items": [
    {"description": string, "sku": string|null, "quantity": number, "unit_price": number, "total_price": number}
  ],
  "tax_amount": number,
  "total_amount": number
}
</inst>
```

### 3. Price‑Alert Summary

```text
You are a finance assistant. Given JSON with sku, vendor, prev_price, new_price, pct_change, craft a concise alert e‑mail (max 120 words). Tone: informative, neutral.
```

### 4. Data‑Exploration Q\&A

```text
User: {{prompt}}

Assistant process:
1. Embed query → pgvector similarity search (top 200 line‑items)
2. Auto‑generate SQL aggregate (sum, avg, count) on those IDs
3. Return natural‑language answer with numeric highlights
```

---

## File: docs/Data\_Model.md

### 1. Core Tables

| Table         | Key Columns (PK unless noted)                                                                                                                | Purpose                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| tenant        | id **uuid**                                                                                                                                  | One business / workspace (multi‑tenant root)     |
| user          | id **uuid**                                                                                                                                  | End‑user account – links to Supabase Auth record |
| membership    | **tenant\_id**, **user\_id** (composite PK), role *(owner / member / accountant)*                                                            | Many‑to‑many mapping + role per workspace        |
| vendor        | id **uuid**, tenant\_id FK                                                                                                                   | Unique vendor per tenant (e.g. *Costco*)         |
| receipt       | id **uuid**, tenant\_id FK, vendor\_id FK, receipt\_date, currency\_code *(CHAR 3)*, total\_amount, tax\_amount, image\_url, ocr\_confidence | Header for each receipt document                 |
| receipt\_item | id **uuid**, receipt\_id FK, sku, description, quantity, unit\_price, total\_price, category, tax\_deductible, embedding **vector(384)**     | Line‑items belonging to a receipt                |

### 2. Analytical & Alert Tables

| Table        | Key Columns                                                                                        | Purpose                                    |
| ------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| price\_book  | id **uuid**, tenant\_id FK, vendor\_id FK, sku, price, captured\_at timestamptz                    | Time‑series snapshots of SKU prices        |
| price\_alert | id **uuid**, tenant\_id FK, vendor\_id FK, sku, prev\_price, new\_price, pct\_change, alert\_state | Each price‑creep anomaly + dismissal state |

### 3. Subscription & Preference Tables

| Table                | Key Columns                                                                                             | Purpose                              |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| subscription\_mirror | user\_id **uuid** (PK), polar\_account\_id, polar\_subscription\_id, tier, status, current\_period\_end | Local Polar state for metering & RLS |
| subscription\_usage  | **user\_id**, **scan\_month** (YYYY‑MM), scans\_used                                                    | Monthly scan meter (free 40 cap)     |
| user\_pref           | user\_id **uuid** (PK), price\_alert\_threshold numeric, local\_ocr bool, email\_alerts bool            | Per‑user settings                    |

### 4. Integrations & Support

| Table            | Key Columns                                                                                                | Purpose                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| email\_connector | id **uuid**, tenant\_id FK, provider, access\_token\_enc, refresh\_token\_enc, last\_sync                  | OAuth tokens for Gmail/Outlook pulls                |
| support\_ticket  | id **uuid**, tenant\_id FK, user\_id FK, subject, message, status *(open/closed)*, created\_at, closed\_at | In‑app help‑desk threads                            |
| support\_user    | user\_id **uuid** (PK)                                                                                     | Marks auth.users allowed to impersonate tenants     |
| training\_queue  | id **uuid**, tenant\_id FK, receipt\_id FK, status *(unlabelled/labelled)*                                 | Collects low‑confidence receipts for LoRA fine‑tune |
| model\_registry  | model\_id **uuid** (PK), engine, version, train\_date, eval\_f1, storage\_path                             | Tracks every LoRA artefact & metrics                |

### 5. Relationships Overview

```text
 tenant 1─* membership *─1 user
     │
     ├─1 vendor *─∞ receipt
     │                  │
     │                  └─∞ receipt_item
     │
     ├─∞ price_book
     ├─∞ price_alert
     └─∞ support_ticket
```

### 6. Row‑Level Security (RLS)

All tables containing `tenant_id` share the base policy:

```sql
CREATE POLICY tenant_isolation ON <table_name>
USING ( tenant_id = current_setting('request.jwt.claims'::json)->>'tenant_id' );
```

`support_ticket` also grants read‑only access to staff accounts:

```sql
CREATE POLICY support_staff ON support_ticket
FOR SELECT USING ( current_setting('request.jwt.claims'::jsonb)->>'is_support' = 'true' );
```

*Every table automatically inherits `created_at` and `updated_at` timestamptz columns via a shared Postgres trigger.*

---

*End of ClearSpendly documentation package.*
