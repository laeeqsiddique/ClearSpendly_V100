# Enhanced Onboarding Flow

This directory contains the enhanced onboarding experience for ClearSpendly with comprehensive components for user setup, plan selection, and business information collection.

## Components Overview

### 1. Enhanced Onboarding (`enhanced-onboarding.tsx`)
The main orchestrator component that manages the multi-step onboarding flow with:
- Progress tracking across multiple steps
- State management for user selections
- Integration with backend APIs
- Welcome email functionality

### 2. Progress Tracker (`progress-tracker.tsx`)
Visual progress components including:
- `ProgressTracker`: Detailed step-by-step progress with completion status
- `ProgressBar`: Simple progress bar showing overall completion
- Support for required/optional steps and skip functionality

### 3. Plan Selection (`plan-selection.tsx`)
Interactive plan selection with:
- Monthly/yearly billing toggle
- Feature comparison matrix
- Trial period support
- Test mode indicators
- Responsive pricing cards

### 4. Business Setup Form (`business-setup-form.tsx`)
Comprehensive business information collection with:
- Multi-section form with validation
- Business type and industry selection
- Contact and tax information
- Accounting software preferences
- Legal agreements and consent

### 5. Test Mode Components (`test-mode-banner.tsx`)
Development and testing utilities:
- `TestModeBanner`: Visual indicator for test environment
- `TestCreditCardHelper`: Pre-filled test credit card data
- `QuickFillTestData`: One-click form population
- `WebhookTestingInterface`: Webhook testing tools

## Features

### User Experience
- **Progressive Disclosure**: Information is revealed step-by-step to avoid overwhelming users
- **Smart Defaults**: Pre-filled data for common scenarios
- **Flexible Flow**: Required vs optional steps with skip functionality
- **Save and Resume**: Form data persistence across sessions
- **Responsive Design**: Works on all device sizes

### Business Logic
- **Plan Recommendations**: Based on business size and expected usage
- **Trial Management**: Free trial setup with payment method collection
- **Email Integration**: Welcome emails with personalized content
- **Form Validation**: Comprehensive client-side validation with server-side verification

### Development Features
- **Test Mode**: Special UI elements and test data for development
- **Mock Payment**: Simulated payment flows for testing
- **Quick Fill**: Pre-populated forms for rapid testing
- **Webhook Testing**: Built-in webhook testing interface

## Usage

```tsx
import EnhancedOnboarding from './app/onboarding/_components/enhanced-onboarding';

// Basic usage
<EnhancedOnboarding />

// With test mode
<EnhancedOnboarding isTestMode={true} />
```

## Configuration

The components are configured through:
- Environment variables for test mode detection
- Props for customization
- Supabase integration for data persistence
- API routes for backend operations

## Integration Points

- **Authentication**: Supabase auth for user management
- **Database**: User metadata and business information storage
- **Payment**: Stripe/PayPal integration (placeholder)
- **Email**: Welcome email template system
- **Analytics**: User onboarding tracking

## Development

In development mode, additional features are available:
- Toggle between legacy and enhanced flows
- Test data quick-fill buttons
- Payment simulation
- Enhanced logging and error messages