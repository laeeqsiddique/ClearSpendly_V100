# 🔍 How to Verify AI Integration is Working

## Quick Verification Steps:

### 1. **Start Your Servers:**
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start Next.js (if not running)
npm run dev
```

### 2. **Check AI Status:**
```bash
# Run this debug script
node debug-ai-status.js
```
**Expected Output:**
```
✅ Ollama is running
✅ llama3.2:3b is available  
✅ AI responded successfully
✅ Next.js API responding
✅ All tests passed!
```

### 3. **Visual Indicators in Upload Page:**

Visit: `http://localhost:3000/dashboard/upload`

**Look for:**
- 🟢 **AI Status Badge**: "Active (llama3.2:3b)" in top-right
- 🤖 **Upload Toast**: "Using AI-enhanced OCR for better accuracy"
- ✨ **Success Message**: "AI-enhanced processing complete! Confidence: X%"

### 4. **Console Debugging:**

Open Developer Tools (F12) and look for:
```
🔍 Processing receipt with enhanced OCR...
🤖 AI Parser enabled: true
⚙️ AI Config: llama3.2:3b
📝 Base OCR completed in XXXms  
📊 Base OCR confidence: XX%
🤖 Attempting AI enhancement...
✨ AI enhancement completed in XXXms
🎯 AI confidence: XX%
🔄 Using AI-enhanced data
```

### 5. **Compare Results:**

**Without AI:** Processing time ~1-2 seconds, confidence 60-75%
**With AI:** Processing time ~20-60 seconds, confidence 80-95%

## 🚨 Troubleshooting:

### If AI Status shows "Disabled":
1. Check `.env.local` has: `ENABLE_AI_OCR_ENHANCEMENT=true`
2. Restart Next.js server: `Ctrl+C` then `npm run dev`

### If AI Status shows "Unhealthy":
1. Make sure Ollama is running: `ollama serve`
2. Check model is downloaded: `ollama list`
3. Test direct connection: `node debug-ai-status.js`

### If Upload Page Doesn't Show AI Badge:
1. Refresh the page
2. Check browser console for errors
3. Verify the API endpoint works: `curl http://localhost:3000/api/test-ai-ocr`

## 🎯 Success Indicators:

✅ **AI Status Badge** shows "Active"  
✅ **Console logs** show AI processing  
✅ **Processing time** is longer (20-60s vs 1-2s)  
✅ **Confidence scores** are higher (80-95% vs 60-75%)  
✅ **Better accuracy** on messy receipts  

---

**Next Steps:** Once verified, test with real receipt images to see the accuracy improvement!