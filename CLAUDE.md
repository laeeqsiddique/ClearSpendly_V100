## AI/LLM Hosting Strategy

- Explored Mistral LLM hosting options with focus on minimizing cost
- Need to evaluate free/low-cost hosting solutions for AI-enhanced OCR implementation
- Potential strategies include:
  * Hugging Face inference endpoints
  * Google Colab free tier
  * Serverless cloud functions (AWS Lambda, Google Cloud Functions)
  * Open-source model self-hosting on minimal compute resources

## Deployment Safety Practices

CRITICAL: All code must be deployment-safe and follow these patterns:

### Environment Variable Safety
- NEVER use non-null assertions (!) on process.env variables
- ALWAYS provide fallbacks: process.env.VAR || 'fallback'
- ALWAYS use build-time detection for external services
- ALWAYS implement mock clients for services during build

### Static Generation Protection
- Use `export const dynamic = 'force-dynamic'` for pages with database operations
- Guard client-side code with `typeof window !== 'undefined'`
- Wrap dynamic imports with `.catch(() => ({ default: () => null }))`
- NEVER call server operations during static generation

### Service Integration Patterns
- Implement graceful degradation when services are unavailable
- Use build-time detection: `const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT`
- Create mock clients that match the real API structure
- Always return safe fallback responses

### Before Every Deployment
- Run `npm run validate-deployment` to ensure deployment safety
- Test build without environment variables
- Verify all critical flows work with mock services
- Check that build completes successfully

These practices prevent deployment failures and ensure the application works even when external services are unavailable.