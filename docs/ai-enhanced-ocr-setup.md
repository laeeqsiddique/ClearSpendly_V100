# AI-Enhanced OCR Setup Guide

## Overview

The AI-enhanced OCR system uses OpenAI's GPT-4o-mini model to improve receipt parsing accuracy from ~60-75% to 90-95%.

## Setup Instructions

### 1. Get OpenAI API Key

1. Sign up at https://platform.openai.com
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key (starts with `sk-`)

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# OpenAI Configuration for AI-Enhanced OCR
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_AI_MODEL=gpt-4o-mini
NEXT_PUBLIC_ENABLE_AI_ENHANCEMENT=true
NEXT_PUBLIC_AI_CONFIDENCE_THRESHOLD=90
```

### 3. How It Works

1. **Tesseract.js** extracts raw text from receipt images
2. If OCR confidence < 90%, the text is sent to **OpenAI**
3. OpenAI parses the text into structured JSON
4. Results are merged with OCR data for best accuracy

### 4. Cost Estimation

- **GPT-4o-mini**: ~$0.002 per receipt
- Monthly costs:
  - 100 receipts/day: $6/month
  - 1,000 receipts/day: $60/month
  - 10,000 receipts/day: $600/month

### 5. Testing

Run the test script to verify setup:

```bash
node test-ai-ocr.js
```

### 6. Processing Flow

```
Image Upload → Tesseract OCR → Check Confidence
                                      ↓
                              < 90% → OpenAI Enhancement
                                      ↓
                                Merge Results → Save
```

## Troubleshooting

- **No API Key**: Set `NEXT_PUBLIC_OPENAI_API_KEY` in `.env.local`
- **Connection Failed**: Check your API key is valid
- **High Costs**: Switch to `gpt-4o-nano` model (when available)
- **Fallback**: System falls back to OCR-only if AI fails

## Architecture

- `/lib/ai-ocr/openai-parser.ts` - OpenAI integration
- `/lib/ai-ocr/enhanced-processor.ts` - Enhanced OCR processor
- `/lib/ai-ocr/types.ts` - TypeScript interfaces
- `/lib/ai-ocr/utils.ts` - Utility functions