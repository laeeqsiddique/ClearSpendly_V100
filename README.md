# ClearSpendly V100

A comprehensive expense tracking and invoice management platform for freelancers, contractors, and small businesses. Built with Next.js 15, featuring OCR receipt processing, invoice management, payment tracking, and Schedule C tax preparation.

## ✨ Features

### 🔐 Authentication & User Management
- **Supabase Auth** - Modern authentication system
- Multi-tenant architecture with Row Level Security (RLS)
- User profile management and session persistence
- Team membership and role management
- Secure tenant isolation

### 🧾 Receipt & Expense Management
- **OCR Receipt Processing** - Extract data from receipt images
- Smart categorization with IRS Schedule C compliance
- Drag & drop receipt uploads with progress tracking
- AI-powered receipt analysis and insights
- Advanced filtering and search capabilities
- Real-time expense tracking and analytics

### 💰 Invoice Management
- **Professional Invoice Creation** - Multiple customizable templates
- Client management with contact details
- Invoice status tracking (draft, sent, viewed, paid, overdue)
- PDF generation with custom branding
- Email sending with status notifications
- Invoice templates with extensive customization options

### 💳 Payment Tracking System
- **Comprehensive Payment Management** - Record and track all payments
- Partial payment support with smart allocation
- Payment method tracking (bank transfer, check, cash, etc.)
- Invoice-to-payment allocation system
- Payment history and document flow visualization
- Over-allocation prevention with database constraints

### 🎨 Modern UI/UX
- **Tailwind CSS** - Modern utility-first styling
- **shadcn/ui** components - Accessible, customizable
- **Radix UI** primitives - Unstyled, accessible components
- Responsive design with mobile-first approach
- Loading skeletons and optimistic UI updates
- Real-time status updates and notifications

### 🗄️ Database & Storage
- **Supabase PostgreSQL** - Serverless database with RLS
- Real-time subscriptions and updates
- Secure file storage for receipts and documents
- Database triggers for automatic calculations
- Multi-tenant data isolation
- Automated backup and recovery

## 🚀 Tech Stack

- **Framework**: Next.js 15.3.1 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime subscriptions
- **PDF Generation**: React-PDF
- **Date Handling**: date-fns
- **UI Components**: Radix UI primitives
- **Deployment**: Vercel (recommended)

## 📁 Project Structure

```
├── app/
│   ├── (auth)/                    # Authentication pages
│   ├── dashboard/                 # Protected dashboard area
│   │   ├── _components/           # Shared dashboard components
│   │   ├── receipts/              # Receipt management
│   │   │   ├── _components/       # Receipt-specific components
│   │   │   └── upload/            # Receipt upload interface
│   │   ├── invoices/              # Invoice management
│   │   │   ├── _components/       # Invoice-specific components
│   │   │   ├── create/            # Invoice creation
│   │   │   ├── [id]/edit/         # Invoice editing
│   │   │   └── templates/         # Invoice templates
│   │   ├── payments/              # Payment management
│   │   │   ├── record/            # Payment recording
│   │   │   └── [id]/edit/         # Payment editing
│   │   ├── clients/               # Client management
│   │   └── settings/              # Application settings
│   └── api/                       # API routes
├── components/
│   ├── ui/                        # shadcn/ui components
│   └── layout/                    # Layout components
├── lib/
│   ├── supabase/                  # Supabase client config
│   └── utils.ts                   # Utility functions
└── docs/
    ├── ClearSpendly PRD.md        # Product requirements
    ├── database-structure.md      # Database documentation
    └── implementation-plan.md     # Implementation guide
```

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- Supabase account for database and authentication
- Modern web browser with JavaScript enabled

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ClearSpendly_V100
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env.local` file with:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Application Configuration
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Optional: AI Features (if implementing OCR)
OPENAI_API_KEY="your-openai-api-key"
```

4. **Database Setup**
- Create a new Supabase project
- Run the SQL migrations in your Supabase SQL editor:
  - Execute `PAYMENT_MIGRATION_FINAL.sql` for payment system tables
  - Execute `FIX_PAYMENT_STATUS_FINAL.sql` for payment triggers
- Enable Row Level Security (RLS) for all tables

5. **Authentication Setup**
- Configure authentication providers in Supabase Auth settings
- Set up email templates and redirect URLs
- Enable the auth providers you want to use

6. **Start Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

### First Time Setup
1. Create your account via the authentication flow
2. Complete your tenant setup
3. Add your first client
4. Create your first invoice template
5. Start tracking expenses and managing invoices!

## 🎯 Key Features Explained

### Invoice Management System
- **Professional Templates** - Multiple customizable invoice templates with extensive styling options
- **Client Management** - Comprehensive client database with contact information and history
- **Status Tracking** - Real-time invoice status updates (draft, sent, viewed, paid, overdue)
- **PDF Generation** - Professional PDF invoices with custom branding
- **Email Integration** - Send invoices directly with delivery tracking

### Payment Tracking System
- **Smart Payment Allocation** - Automatically allocate payments to specific invoices
- **Partial Payment Support** - Handle partial payments with remaining balance tracking
- **Payment History** - Complete document flow and timeline visualization
- **Multiple Payment Methods** - Support for bank transfer, check, cash, credit card, PayPal
- **Over-allocation Prevention** - Database constraints prevent payment overages

### Receipt & Expense Management
- **OCR Processing** - Extract data from receipt images (future feature)
- **Smart Categorization** - IRS Schedule C compliant expense categories
- **Real-time Search** - Advanced filtering and search capabilities
- **Drag & Drop Upload** - Easy receipt upload with progress tracking
- **Multi-tenant Security** - Secure data isolation between organizations

### Multi-Tenant Architecture
- **Row Level Security** - Database-level tenant isolation
- **Team Management** - Role-based access control
- **Real-time Updates** - Live data synchronization across sessions
- **Secure Authentication** - Supabase Auth with session management

## 🔧 Customization

### Adding New Features
1. Create components in `components/` or `app/dashboard/_components/`
2. Add database tables via Supabase SQL editor
3. Update TypeScript interfaces for new data structures
4. Implement Row Level Security policies for new tables
5. Add API routes in `app/api/` if needed

### Styling & Branding
- Modify `app/globals.css` for global styles
- Use Tailwind classes for component styling
- Customize theme in `tailwind.config.js`
- Update invoice templates in `app/dashboard/invoices/_components/`

### Database Schema
- All schema changes should be made in Supabase SQL editor
- Enable RLS for all new tables
- Add appropriate indexes for performance
- Use database triggers for calculated fields

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Supabase Documentation](https://supabase.com/docs) - Database, Auth, and Real-time features
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Utility-first CSS framework
- [shadcn/ui Documentation](https://ui.shadcn.com/) - Reusable UI components
- [React PDF Documentation](https://react-pdf.org/) - PDF generation for invoices

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
3. Deploy automatically on every push

### Manual Deployment
```bash
npm run build
npm start
```

### Database Migration for Production
1. Run the SQL migrations in your production Supabase instance
2. Enable RLS policies for all tables
3. Set up proper database backups
4. Configure monitoring and alerting

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
- Follow TypeScript best practices
- Maintain multi-tenant security (RLS) for all data operations
- Write comprehensive tests for new features
- Update documentation for any new functionality
- Ensure responsive design for all components

---

Built with ❤️ for freelancers and contractors using Next.js and Supabase.
# Auto-deployment test Wed, Jul 30, 2025 10:39:41 AM
