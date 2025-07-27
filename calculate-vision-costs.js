// Calculate OpenAI Vision API costs for receipt processing

// OpenAI Vision API Pricing (as of 2024)
const PRICING = {
  // GPT-4o pricing per 1M tokens
  INPUT_TOKENS: 2.50,   // $2.50 per 1M input tokens
  OUTPUT_TOKENS: 10.00, // $10.00 per 1M output tokens
  
  // Image processing costs (additional)
  IMAGE_LOW_DETAIL: 85,     // 85 tokens per image (low detail)
  IMAGE_HIGH_DETAIL_BASE: 85, // Base cost + tiles
  IMAGE_HIGH_DETAIL_TILE: 170 // 170 tokens per 512x512 tile
};

function calculateImageTokens(width, height, detail = 'high') {
  if (detail === 'low') {
    return PRICING.IMAGE_LOW_DETAIL;
  }
  
  // High detail: resize to fit 2048x2048, then count 512x512 tiles
  const maxDimension = 2048;
  const scale = Math.min(maxDimension / width, maxDimension / height, 1);
  const scaledWidth = Math.floor(width * scale);
  const scaledHeight = Math.floor(height * scale);
  
  const tilesX = Math.ceil(scaledWidth / 512);
  const tilesY = Math.ceil(scaledHeight / 512);
  const totalTiles = tilesX * tilesY;
  
  return PRICING.IMAGE_HIGH_DETAIL_BASE + (totalTiles * PRICING.IMAGE_HIGH_DETAIL_TILE);
}

function calculateReceiptCost(textTokens = 200, outputTokens = 150, imageWidth = 1200, imageHeight = 1600) {
  // Calculate image tokens
  const imageTokens = calculateImageTokens(imageWidth, imageHeight, 'high');
  
  // Total input tokens = text prompt + image tokens
  const totalInputTokens = textTokens + imageTokens;
  
  // Calculate costs
  const inputCost = (totalInputTokens / 1000000) * PRICING.INPUT_TOKENS;
  const outputCost = (outputTokens / 1000000) * PRICING.OUTPUT_TOKENS;
  const totalCost = inputCost + outputCost;
  
  return {
    imageTokens,
    textTokens,
    totalInputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost,
    breakdown: {
      image: `${imageTokens} tokens ($${(imageTokens / 1000000 * PRICING.INPUT_TOKENS).toFixed(4)})`,
      text: `${textTokens} tokens ($${(textTokens / 1000000 * PRICING.INPUT_TOKENS).toFixed(4)})`,
      output: `${outputTokens} tokens ($${outputCost.toFixed(4)})`
    }
  };
}

// Example calculations
console.log('📊 OpenAI Vision API Cost Calculator for Receipts\n');
console.log('='.repeat(50));

// Typical receipt image scenarios
const scenarios = [
  { name: 'Small Receipt (800x1000)', width: 800, height: 1000 },
  { name: 'Standard Receipt (1200x1600)', width: 1200, height: 1600 },
  { name: 'Large Receipt (2000x2500)', width: 2000, height: 2500 },
  { name: 'Phone Photo (3000x4000)', width: 3000, height: 4000 }
];

scenarios.forEach(scenario => {
  const cost = calculateReceiptCost(200, 150, scenario.width, scenario.height);
  
  console.log(`\n📄 ${scenario.name}:`);
  console.log(`   Image: ${cost.breakdown.image}`);
  console.log(`   Text:  ${cost.breakdown.text}`);
  console.log(`   Output: ${cost.breakdown.output}`);
  console.log(`   💰 Total: $${cost.totalCost.toFixed(4)} per receipt`);
  console.log(`   📈 Monthly (1000 receipts): $${(cost.totalCost * 1000).toFixed(2)}`);
});

// Comparison with our text-based AI enhancement
console.log('\n' + '='.repeat(50));
console.log('📊 Cost Comparison:');
console.log('='.repeat(50));

const textOnlyCost = (350 / 1000000) * (PRICING.INPUT_TOKENS + PRICING.OUTPUT_TOKENS * 0.5);
const visionCost = calculateReceiptCost().totalCost;

console.log(`💬 Text-only AI Enhancement: $${textOnlyCost.toFixed(4)} per receipt`);
console.log(`👁️  Vision API: $${visionCost.toFixed(4)} per receipt`);
console.log(`📊 Vision is ${(visionCost / textOnlyCost).toFixed(1)}x more expensive`);

console.log('\n💡 Recommendation:');
console.log('Use hybrid approach - text AI first, Vision API for complex receipts only');