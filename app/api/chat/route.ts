import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AIClient, SYSTEM_PROMPTS } from '@/lib/ai-utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatRequest {
  message: string;
  conversationId?: string;
  context?: {
    selectedReceipt?: string;
    filters?: {
      startDate?: string;
      endDate?: string;
      tags?: string[];
      search?: string;
    };
    previousMessage?: ChatMessage;
    lastContext?: any;
  };
}

// AI Chat Agent for Receipt Management
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationId, context } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Default tenant ID (replace with actual auth later)
    const tenantId = '00000000-0000-0000-0000-000000000001';
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Store user message if conversation persistence is enabled (disabled for now to avoid hanging)
    let finalConversationId = conversationId;
    // Temporarily disabled conversation persistence to debug spinning issue
    /*
    if (conversationId || process.env.ENABLE_CONVERSATION_PERSISTENCE === 'true') {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            conversationId,
            message,
            role: 'user',
            metadata: { context }
          })
        });

        const result = await response.json();
        if (result.success) {
          finalConversationId = result.conversationId;
        }
      } catch (error) {
        console.log('Failed to store user message, continuing without persistence:', error);
      }
    }
    */

    // Get relevant receipt data using semantic search and context
    const searchResults = await performSemanticSearch(supabase, message, tenantId, context);
    
    // Generate AI response using enhanced context and semantic search results
    const aiResponse = await generateEnhancedAIResponse(
      message, 
      searchResults, 
      context,
      supabase,
      tenantId
    );

    // Store AI response if conversation persistence is enabled (disabled for now)
    /*
    if (finalConversationId && (conversationId || process.env.ENABLE_CONVERSATION_PERSISTENCE === 'true')) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            conversationId: finalConversationId,
            message: aiResponse,
            role: 'assistant',
            metadata: { 
              searchResults: searchResults?.summary,
              searchType: searchResults?.searchType || 'basic'
            }
          })
        });
      } catch (error) {
        console.log('Failed to store AI response, continuing without persistence:', error);
      }
    }
    */

    // Create response message
    const responseMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      message: responseMessage,
      conversationId: finalConversationId || `conv_${Date.now()}`,
      context: {
        searchResults: searchResults?.summary || null,
        relevantReceipts: searchResults?.receipts || [], // Send all receipts, not just 3
        searchType: searchResults?.searchType || 'basic'
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Enhanced AI Response Generation with Semantic Search
async function generateEnhancedAIResponse(
  message: string,
  searchResults: any,
  context: any,
  supabase: any,
  tenantId: string
): Promise<string> {
  try {
    // Use unified AI client (Ollama preferred, OpenAI fallback)
    const aiClient = new AIClient();
    const provider = await aiClient.getAvailableProvider();
    
    if (provider) {
      return await generateAIResponse(aiClient, message, searchResults, context);
    }
    
    // Fallback to enhanced pattern matching with search results
    return generatePatternBasedResponse(message, searchResults, context);
  } catch (error) {
    console.error('AI response generation error:', error);
    return generatePatternBasedResponse(message, searchResults, context);
  }
}

// AI-powered response using unified client
async function generateAIResponse(
  aiClient: AIClient,
  message: string,
  searchResults: any,
  context: any
): Promise<string> {
  const contextText = searchResults?.receipts?.slice(0, 5).map((r: any) => 
    `- ${r.vendor_name}: $${r.total_amount} on ${r.receipt_date}`
  ).join('\n') || 'No specific receipts found.';

  const systemPrompt = `${SYSTEM_PROMPTS.RECEIPT_ASSISTANT}

Current context:
- Total receipts found: ${searchResults?.receipts?.length || 0}
- Total amount: $${searchResults?.totalAmount?.toFixed(2) || '0.00'}
- Date range: ${searchResults?.dateRange || 'All time'}`;

  const completion = await aiClient.generateCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${message}\n\nRelevant receipts:\n${contextText}` }
    ],
    maxTokens: 500,
    temperature: 0.7
  });

  return completion || 'I apologize, but I encountered an issue generating a response. Please try rephrasing your question.';
}


// Enhanced pattern-based response with search results
function generatePatternBasedResponse(
  message: string,
  searchResults: any,
  context: any
): string {
  const lowerMessage = message.toLowerCase().trim();
  const receipts = searchResults?.receipts || [];
  const totalAmount = searchResults?.totalAmount || 0;
  const receiptCount = receipts.length;

  // Handle short contextual responses (yes, no, please, etc.)
  if (isShortContextualResponse(lowerMessage)) {
    return handleContextualResponse(lowerMessage, receipts, totalAmount);
  }

  // Handle contextual commands like "list them", "show them"
  if (isContextualCommand(lowerMessage) && searchResults?.searchType === 'contextual') {
    if (receiptCount === 0) {
      return "I don't have any previous results to show. Please ask a specific question first.";
    }
    
    const receiptList = receipts
      .map((r: any, index: number) => 
        `${index + 1}. ${r.vendor_name}: $${r.total_amount.toFixed(2)} - ${new Date(r.receipt_date).toLocaleDateString()}`
      )
      .join('\n');
    
    return `Here are the ${receiptCount} receipts:\n\n${receiptList}\n\nTotal: $${totalAmount.toFixed(2)}`;
  }

  // Show all receipts or debug mode
  if (lowerMessage.includes('all receipts') || lowerMessage.includes('show me all') || lowerMessage === 'all' || 
      lowerMessage.includes('debug receipts') || lowerMessage.includes('all dates')) {
    if (receiptCount === 0) {
      return "No receipts found in the system. Try uploading some receipts first!";
    }
    
    const allReceipts = receipts
      .sort((a: any, b: any) => new Date(b.receipt_date).getTime() - new Date(a.receipt_date).getTime())
      .slice(0, 10)
      .map((r: any) => `• ${r.vendor_name}: $${r.total_amount} (${r.receipt_date})`)
      .join('\n');
    
    const systemDate = new Date();
    const debugInfo = lowerMessage.includes('debug') ? 
      `\n\n🔍 DEBUG INFO:\nSystem date: ${systemDate.toLocaleDateString()} (${systemDate.toISOString()})\nReceipt dates found: ${receipts.slice(0, 3).map((r: any) => r.receipt_date).join(', ')}` : '';
    
    return `Found ${receiptCount} total receipts worth $${totalAmount.toFixed(2)}. Here are the most recent:\n\n${allReceipts}\n\n${receiptCount > 10 ? `...and ${receiptCount - 10} more receipts` : ''}${debugInfo}`;
  }
  
  // Spending totals and analysis
  if (lowerMessage.includes('total') || lowerMessage.includes('sum') || lowerMessage.includes('spent')) {
    if (receiptCount === 0) {
      return "I didn't find any receipts matching your query. Try adjusting your search terms or date range.";
    }
    
    const summary = `You've spent $${totalAmount.toFixed(2)} across ${receiptCount} receipts.`;
    
    if (receiptCount <= 5) {
      const breakdown = receipts.map((r: any) => 
        `• ${r.vendor_name}: $${r.total_amount} (${r.receipt_date})`
      ).join('\n');
      return `${summary}\n\nBreakdown:\n${breakdown}`;
    }
    
    return `${summary} Would you like me to break this down by vendor, category, or time period?`;
  }

  // Vendor analysis
  if (lowerMessage.includes('vendor') || lowerMessage.includes('merchant') || lowerMessage.includes('store')) {
    if (receiptCount === 0) {
      return "I didn't find any receipts from that vendor. Try checking the spelling or looking for similar vendor names.";
    }

    const vendorMap = new Map();
    receipts.forEach((r: any) => {
      const vendor = r.vendor_name;
      vendorMap.set(vendor, (vendorMap.get(vendor) || 0) + r.total_amount);
    });

    const vendorBreakdown = Array.from(vendorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([vendor, amount]) => `• ${vendor}: $${amount.toFixed(2)}`)
      .join('\n');

    return `Found ${receiptCount} receipts totaling $${totalAmount.toFixed(2)}.\n\nTop vendors:\n${vendorBreakdown}`;
  }

  // Date/time queries
  if (lowerMessage.includes('recent') || lowerMessage.includes('latest') || lowerMessage.includes('today') || 
      lowerMessage.includes('this month') || lowerMessage.includes('last week') || lowerMessage.includes('yesterday') ||
      lowerMessage.includes('this week') || lowerMessage.includes('last month') || lowerMessage.includes('this year') ||
      lowerMessage.includes('current month') || lowerMessage.includes('current week') || lowerMessage.includes('current year')) {
    
    if (receiptCount === 0) {
      // Try to parse what date range they asked for
      const dateRange = parseDateRange(lowerMessage);
      return `No receipts found ${dateRange ? `for ${dateRange.description}` : 'for that time period'}. Try uploading some receipts or asking about a different date range.`;
    }

    const recentReceipts = receipts
      .sort((a: any, b: any) => new Date(b.receipt_date).getTime() - new Date(a.receipt_date).getTime())
      .slice(0, 5)
      .map((r: any) => `• ${r.vendor_name}: $${r.total_amount} (${r.receipt_date})`)
      .join('\n');

    // Include date range in response if available
    const dateRange = parseDateRange(lowerMessage);
    const dateDescription = dateRange ? ` ${dateRange.description}` : '';
    
    return `Your spending${dateDescription} totals $${totalAmount.toFixed(2)} across ${receiptCount} receipt${receiptCount === 1 ? '' : 's'}:\n\n${recentReceipts}`;
  }

  // Category and tag analysis
  if (lowerMessage.includes('category') || lowerMessage.includes('tag')) {
    return `Found ${receiptCount} receipts totaling $${totalAmount.toFixed(2)}. To see category breakdowns, make sure your receipts are properly tagged. You can add tags by clicking on any receipt in the table.`;
  }

  // Help and capabilities
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return `I'm your ClearSpendly AI assistant! I can help you:

💰 **Analyze spending**: "What's my total spending this month?"
🔍 **Find receipts**: "Show me all Starbucks receipts"
📊 **Vendor analysis**: "Which vendor do I spend the most with?"
📅 **Time-based queries**: "What did I spend last week?"
🏷️ **Category insights**: "Show me travel expenses"
📤 **Export guidance**: "How do I export my data?"

Just ask me anything about your receipts!`;
  }

  // Debug command to check system date
  if (lowerMessage.includes('what date') || lowerMessage.includes('current date') || lowerMessage.includes('system date')) {
    const today = new Date();
    return `System date is: ${today.toLocaleDateString()} (${today.toISOString()})\n\nIf your receipts are from a different time period, try:\n• "show me all receipts" to see what dates are available\n• Ask for specific months like "July 2025" or "last month"`;
  }

  // Default contextual response
  if (receiptCount > 0) {
    const topVendor = receipts[0]?.vendor_name;
    
    // Check if this was a vendor-specific query
    const vendorQuery = lowerMessage.includes('walmart') || lowerMessage.includes('target') || 
                       lowerMessage.includes('amazon') || lowerMessage.includes('starbucks');
    
    if (vendorQuery) {
      // Extract the vendor name from the query
      const queryVendor = lowerMessage.match(/(walmart|target|amazon|starbucks|mcdonalds|costco)/)?.[1];
      if (queryVendor) {
        const matchingReceipts = receipts.filter(r => 
          r.vendor_name.toLowerCase().includes(queryVendor)
        );
        
        if (matchingReceipts.length > 0) {
          const vendorTotal = matchingReceipts.reduce((sum, r) => sum + r.total_amount, 0);
          return `You spent $${vendorTotal.toFixed(2)} at ${queryVendor.charAt(0).toUpperCase() + queryVendor.slice(1)} across ${matchingReceipts.length} receipt${matchingReceipts.length === 1 ? '' : 's'}.`;
        } else {
          return `I couldn't find any receipts from ${queryVendor.charAt(0).toUpperCase() + queryVendor.slice(1)}. You have ${receiptCount} other receipts totaling $${totalAmount.toFixed(2)}.`;
        }
      }
    }
    
    return `I found ${receiptCount} receipts totaling $${totalAmount.toFixed(2)}. ${topVendor ? `Your largest expense was from ${topVendor}.` : ''} What would you like to know about these expenses?`;
  } else {
    // Check if this was a date-specific query and no results found
    const dateRange = parseDateRange(lowerMessage);
    if (dateRange) {
      return `No receipts found for ${dateRange.description}. Your receipts might be from a different time period. Try asking "show me all receipts" to see what's available.`;
    }
    
    return `I didn't find any receipts matching your query. Try:
• Using different keywords
• Adjusting your date range
• Checking vendor names
• Or ask "help" to see what I can do!`;
  }
}

// Helper function to detect short contextual responses
function isShortContextualResponse(message: string): boolean {
  const shortResponses = [
    'yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'please', 'go ahead',
    'no', 'nope', 'nah', 'stop', 'cancel',
    'more', 'continue', 'next', 'details', 'breakdown'
  ];
  
  return message.length <= 10 && shortResponses.some(response => 
    message === response || message.includes(response)
  );
}

// Check if this is a contextual command referring to previous results
function isContextualCommand(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const contextualPhrases = [
    'list them',
    'show them',
    'show me them',
    'what are they',
    'which ones',
    'tell me more',
    'break it down',
    'breakdown',
    'details about those',
    'more about those',
    'those receipts'
  ];
  
  return contextualPhrases.some(phrase => lowerMessage.includes(phrase));
}

// Handle contextual follow-up responses
function handleContextualResponse(message: string, receipts: any[], totalAmount: number): string {
  const lowerMessage = message.toLowerCase();
  
  // Positive responses - provide more details
  if (['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'please', 'go ahead', 'more', 'continue'].includes(lowerMessage)) {
    if (receipts.length === 0) {
      return "I don't have any receipt data to show you more details about. Try uploading some receipts first!";
    }
    
    // Provide breakdown by vendor
    const vendorBreakdown = new Map<string, number>();
    receipts.forEach(receipt => {
      const vendor = receipt.vendor_name || 'Unknown';
      vendorBreakdown.set(vendor, (vendorBreakdown.get(vendor) || 0) + receipt.total_amount);
    });
    
    const sortedVendors = Array.from(vendorBreakdown.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    let response = `Here's your spending breakdown:\n\n`;
    sortedVendors.forEach(([vendor, amount], index) => {
      response += `${index + 1}. ${vendor}: $${amount.toFixed(2)}\n`;
    });
    
    response += `\nTotal: $${totalAmount.toFixed(2)} across ${receipts.length} receipts`;
    
    if (receipts.length > 0) {
      const dateRange = getDateRange(receipts);
      response += `\nDate range: ${dateRange}`;
    }
    
    return response;
  }
  
  // Negative responses - offer help
  if (['no', 'nope', 'nah', 'stop', 'cancel'].includes(lowerMessage)) {
    return "No problem! Feel free to ask me anything else about your receipts. I can help you:\n• Find specific expenses\n• Analyze spending by vendor\n• Look at spending over time\n• Export your data\n\nWhat would you like to explore?";
  }
  
  // Detail requests
  if (['details', 'breakdown', 'more info'].includes(lowerMessage)) {
    return handleContextualResponse('yes', receipts, totalAmount);
  }
  
  // Default for unrecognized short responses
  return "I'm not sure what you'd like me to do. Could you be more specific? For example:\n• \"Show me vendor breakdown\"\n• \"What did I spend on groceries?\"\n• \"Find receipts from last week\"\n• \"Help\" to see what I can do";
}

// Helper to get date range from receipts
function getDateRange(receipts: any[]): string {
  if (receipts.length === 0) return 'No dates available';
  
  const dates = receipts.map(r => new Date(r.receipt_date)).filter(d => !isNaN(d.getTime()));
  if (dates.length === 0) return 'No valid dates';
  
  const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
  const latest = new Date(Math.max(...dates.map(d => d.getTime())));
  
  if (earliest.getTime() === latest.getTime()) {
    return earliest.toLocaleDateString();
  }
  
  return `${earliest.toLocaleDateString()} to ${latest.toLocaleDateString()}`;
}

// Parse natural language date ranges
function parseDateRange(message: string): { startDate: string; endDate: string; description: string } | null {
  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  // Today
  if (message.includes('today')) {
    return {
      startDate: formatDate(today),
      endDate: formatDate(today),
      description: 'today'
    };
  }
  
  // Yesterday
  if (message.includes('yesterday')) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      startDate: formatDate(yesterday),
      endDate: formatDate(yesterday),
      description: 'yesterday'
    };
  }
  
  // This week
  if (message.includes('this week')) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    return {
      startDate: formatDate(weekStart),
      endDate: formatDate(today),
      description: 'this week'
    };
  }
  
  // Last week
  if (message.includes('last week')) {
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - today.getDay() - 1); // End of last week (Saturday)
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // Start of last week (Sunday)
    return {
      startDate: formatDate(lastWeekStart),
      endDate: formatDate(lastWeekEnd),
      description: 'last week'
    };
  }
  
  // This month / current month
  if (message.includes('this month') || message.includes('current month')) {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    console.log('Parsing "this/current month":', {
      today: today.toISOString(),
      monthStart: monthStart.toISOString(),
      endDate: today.toISOString(),
      formatted: {
        start: formatDate(monthStart),
        end: formatDate(today)
      }
    });
    return {
      startDate: formatDate(monthStart),
      endDate: formatDate(today),
      description: 'this month'
    };
  }
  
  // Last month
  if (message.includes('last month')) {
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    return {
      startDate: formatDate(lastMonthStart),
      endDate: formatDate(lastMonthEnd),
      description: 'last month'
    };
  }
  
  // This year
  if (message.includes('this year')) {
    const yearStart = new Date(today.getFullYear(), 0, 1);
    return {
      startDate: formatDate(yearStart),
      endDate: formatDate(today),
      description: 'this year'
    };
  }
  
  // Last year
  if (message.includes('last year')) {
    const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
    return {
      startDate: formatDate(lastYearStart),
      endDate: formatDate(lastYearEnd),
      description: 'last year'
    };
  }
  
  // Last X days
  const daysMatch = message.match(/last (\d+) days?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    return {
      startDate: formatDate(startDate),
      endDate: formatDate(today),
      description: `last ${days} days`
    };
  }
  
  // Past week (last 7 days)
  if (message.includes('past week')) {
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    return {
      startDate: formatDate(weekAgo),
      endDate: formatDate(today),
      description: 'past week'
    };
  }
  
  // Specific month names with optional year
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthMatch = message.match(new RegExp(`(${monthNames.join('|')})\\s*(\\d{4})?`, 'i'));
  
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase();
    const monthIndex = monthNames.indexOf(monthName);
    const year = monthMatch[2] ? parseInt(monthMatch[2]) : today.getFullYear();
    
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0); // Last day of month
    
    return {
      startDate: formatDate(monthStart),
      endDate: formatDate(monthEnd),
      description: `${monthMatch[1]} ${year}`
    };
  }
  
  return null;
}

// Semantic Search Function using pgvector
async function performSemanticSearch(
  supabase: any,
  message: string,
  tenantId: string,
  context?: any
) {
  console.log('Starting semantic search for:', message);
  
  try {
    // Check if this is a contextual command that refers to previous results
    if (isContextualCommand(message) && context?.lastContext?.relevantReceipts) {
      console.log('Contextual command detected, using previous results');
      const previousReceipts = context.lastContext.relevantReceipts;
      
      // Return the previous results with appropriate formatting
      return {
        receipts: previousReceipts,
        totalAmount: previousReceipts.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0),
        summary: `Here are the ${previousReceipts.length} receipts from my previous response`,
        searchType: 'contextual'
      };
    }
    
    // Skip semantic search for now and go directly to basic search to avoid AI client issues
    console.log('Skipping AI embedding, using basic search');
    return await performBasicSearch(supabase, message, tenantId, context);
    
    /* Temporarily disabled AI client to debug spinning
    // Try semantic search with embeddings first
    const aiClient = new AIClient();
    const provider = await aiClient.getAvailableProvider();

    if (provider) {
      try {
        // Generate embedding for the search query
        const { embedding } = await aiClient.generateEmbedding(message);
        
        // Perform vector similarity search
        const semanticResults = await performVectorSearch(
          supabase, 
          embedding, 
          tenantId, 
          context
        );

        if (semanticResults.receipts.length > 0) {
          return semanticResults;
        }
      } catch (embeddingError) {
        console.log('Embedding search failed, falling back to text search:', embeddingError);
      }
    }

    // Fallback to basic text search
    return await performBasicSearch(supabase, message, tenantId, context);
    */
  } catch (error) {
    console.error('Semantic search error:', error);
    // Fallback to basic search
    return await performBasicSearch(supabase, message, tenantId, context);
  }
}

// Vector similarity search using pgvector
async function performVectorSearch(
  supabase: any,
  queryEmbedding: number[],
  tenantId: string,
  context?: any
) {
  try {
    // Use pgvector similarity search
    let query = supabase.rpc('search_receipt_items_by_embedding', {
      query_embedding: queryEmbedding,
      tenant_id_param: tenantId,
      similarity_threshold: 0.7,
      max_results: 20
    });

    const { data: similarItems, error } = await query;

    if (error) {
      throw error;
    }

    if (!similarItems || similarItems.length === 0) {
      return { receipts: [], totalAmount: 0, summary: 'No similar items found' };
    }

    // Group results by receipt
    const receiptMap = new Map();
    
    for (const item of similarItems) {
      if (!receiptMap.has(item.receipt_id)) {
        receiptMap.set(item.receipt_id, {
          id: item.receipt_id,
          receipt_date: item.receipt_date,
          total_amount: item.receipt_total_amount,
          vendor_name: item.vendor_name,
          vendor_category: item.vendor_category,
          line_items_count: 1,
          tags: [],
          similarity_score: item.similarity_score
        });
      } else {
        receiptMap.get(item.receipt_id).line_items_count++;
      }
    }

    const receipts = Array.from(receiptMap.values())
      .sort((a, b) => b.similarity_score - a.similarity_score);

    const totalAmount = receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);

    return {
      receipts,
      totalAmount,
      summary: `Found ${receipts.length} semantically similar receipts totaling $${totalAmount.toFixed(2)}`,
      dateRange: context?.filters ? 
        `${context.filters.startDate || 'All time'} to ${context.filters.endDate || 'Now'}` : 
        'All time',
      searchType: 'semantic'
    };

  } catch (error) {
    console.error('Vector search error:', error);
    throw error;
  }
}

// Basic text search as fallback
async function performBasicSearch(
  supabase: any,
  message: string,
  tenantId: string,
  context?: any
) {
  console.log('Starting basic search for:', message, 'tenant:', tenantId);
  
  try {
    // Build base query
    let query = supabase
      .from('receipt')
      .select(`
        id,
        receipt_date,
        total_amount,
        tax_amount,
        vendor:vendor_id(name, category),
        lineItems:receipt_item(id, description, total_price, category),
        tags:receipt_tag(tag:tag_id(name))
      `)
      .eq('tenant_id', tenantId)
      .order('receipt_date', { ascending: false });

    // Apply context filters
    if (context?.filters?.startDate) {
      query = query.gte('receipt_date', context.filters.startDate);
    }
    if (context?.filters?.endDate) {
      query = query.lte('receipt_date', context.filters.endDate);
    }

    // Apply text search if message contains specific terms
    const lowerMessage = message.toLowerCase();
    
    // Simple vendor search - look for vendor names directly in the message
    const vendorKeywords = ['walmart', 'target', 'amazon', 'starbucks', 'mcdonalds', 'costco', 'home depot', 'best buy'];
    let vendorFilter = null;
    
    console.log('Checking for vendor keywords in:', lowerMessage);
    for (const vendor of vendorKeywords) {
      if (lowerMessage.includes(vendor)) {
        vendorFilter = vendor;
        console.log('Found vendor keyword:', vendor);
        break;
      }
    }
    
    // Also check for general vendor patterns
    const vendorMatch = lowerMessage.match(/(?:spend|spent|at|from|vendor|store|merchant)\s+(?:at\s+)?(\w+)/);
    if (vendorMatch && !vendorFilter) {
      vendorFilter = vendorMatch[1];
      console.log('Found vendor from pattern:', vendorFilter);
    }
    
    console.log('Final vendor filter:', vendorFilter);

    // Parse date range from natural language
    const dateFilter = parseDateRange(lowerMessage);
    console.log('Parsed date filter:', dateFilter);

    // Debug mode - if message contains "debug", skip all filters
    const debugMode = lowerMessage.includes('debug receipts') || lowerMessage.includes('all dates');
    if (debugMode) {
      console.log('DEBUG MODE: Skipping all date filters');
    }

    // Get receipts with simplified query first
    let receiptsQuery = supabase
      .from('receipt')
      .select(`
        id,
        receipt_date,
        total_amount,
        vendor_id
      `)
      .eq('tenant_id', tenantId)
      .order('receipt_date', { ascending: false })
      .limit(50);

    // Apply filters only if not in debug mode
    if (!debugMode) {
      // Apply context filters first
      if (context?.filters?.startDate) {
        receiptsQuery = receiptsQuery.gte('receipt_date', context.filters.startDate);
      }
      if (context?.filters?.endDate) {
        receiptsQuery = receiptsQuery.lte('receipt_date', context.filters.endDate);
      }

      // Apply parsed date filters (overrides context filters if present)
      if (dateFilter) {
        console.log('Applying date filter:', dateFilter);
        console.log('Query will filter receipts between:', dateFilter.startDate, 'and', dateFilter.endDate);
        receiptsQuery = receiptsQuery.gte('receipt_date', dateFilter.startDate);
        receiptsQuery = receiptsQuery.lte('receipt_date', dateFilter.endDate);
      }
    }

    // Amount-specific search
    const amountMatch = lowerMessage.match(/over|above|more than\s+\$?(\d+)/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      receiptsQuery = receiptsQuery.gte('total_amount', amount);
    }

    console.log('Executing receipts query...');
    const { data: receipts, error } = await receiptsQuery;

    if (error) {
      console.error('Basic search error:', error);
      return { receipts: [], totalAmount: 0, summary: 'Search failed' };
    }

    console.log('Found receipts:', receipts?.length || 0);
    if (receipts && receipts.length > 0) {
      console.log('Receipt dates:', receipts.slice(0, 5).map(r => ({ 
        id: r.id, 
        date: r.receipt_date,
        dateObj: new Date(r.receipt_date).toISOString()
      })));
    }

    let filteredReceipts = receipts || [];

    // Get vendor details for filtering and display
    if (filteredReceipts.length > 0) {
      const vendorIds = [...new Set(filteredReceipts.map(r => r.vendor_id).filter(Boolean))];
      console.log('Looking up vendors for IDs:', vendorIds);
      
      if (vendorIds.length > 0) {
        console.log('Executing vendor query...');
        const { data: vendors, error: vendorError } = await supabase
          .from('vendor')
          .select('id, name, category')
          .in('id', vendorIds);

        if (vendorError) {
          console.error('Vendor query error:', vendorError);
          // Continue without vendor details
        } else if (vendors) {
          console.log('Found vendors:', vendors.length);
          console.log('Vendor names:', vendors.map(v => v.name));
          // Create vendor lookup map
          const vendorMap = new Map(vendors.map(v => [v.id, v]));
          
          // Apply vendor filter if specified
          if (vendorFilter) {
            console.log('Filtering for vendor:', vendorFilter);
            const beforeFilterCount = filteredReceipts.length;
            filteredReceipts = filteredReceipts.filter(receipt => {
              const vendor = vendorMap.get(receipt.vendor_id);
              const matches = vendor && vendor.name.toLowerCase().includes(vendorFilter.toLowerCase());
              if (matches) {
                console.log('Matched vendor:', vendor.name);
              }
              return matches;
            });
            console.log('After vendor filter:', filteredReceipts.length, 'from', beforeFilterCount);
          }
          
          // Add vendor info to receipts
          filteredReceipts = filteredReceipts.map(receipt => ({
            ...receipt,
            vendor_name: vendorMap.get(receipt.vendor_id)?.name || 'Unknown Vendor',
            vendor_category: vendorMap.get(receipt.vendor_id)?.category || 'Uncategorized'
          }));
        }
      }
    }

    // Process results
    const processedReceipts = filteredReceipts.map((receipt: any) => ({
      id: receipt.id,
      receipt_date: receipt.receipt_date,
      total_amount: receipt.total_amount,
      vendor_name: receipt.vendor_name || 'Unknown Vendor',
      vendor_category: receipt.vendor_category || 'Uncategorized',
      line_items_count: 0, // Will be populated separately if needed
      tags: []
    }));

    const totalAmount = processedReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);

    return {
      receipts: processedReceipts,
      totalAmount,
      summary: `Found ${processedReceipts.length} receipts totaling $${totalAmount.toFixed(2)}${vendorFilter ? ` from ${vendorFilter}` : ''}${dateFilter ? ` ${dateFilter.description}` : ''}`,
      dateRange: dateFilter ? 
        `${dateFilter.startDate} to ${dateFilter.endDate} (${dateFilter.description})` :
        (context?.filters ? 
          `${context.filters.startDate || 'All time'} to ${context.filters.endDate || 'Now'}` : 
          'All time'),
      searchType: 'basic'
    };

  } catch (error) {
    console.error('Basic search error:', error);
    return { receipts: [], totalAmount: 0, summary: 'Search failed' };
  }
}

// Generate embeddings for semantic search (placeholder for future Ollama integration)
async function generateEmbedding(text: string): Promise<number[]> {
  // TODO: Integrate with Ollama/Mistral for actual embeddings
  // For now, return empty array
  return [];
}

// SQL Generation for complex queries (placeholder for future implementation)
async function generateSQL(query: string, schema: any): Promise<string> {
  // TODO: Implement AI-powered SQL generation
  // This would use the LLM to convert natural language to SQL
  return '';
}

// GET method for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'ClearSpendly AI Chat Agent',
    version: '1.0.0'
  });
}
