import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const tenantId = 'default-tenant';
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get relevant receipt data based on context
    let receiptData = null;
    let receiptSummary = '';

    if (context?.selectedReceipt) {
      // Get specific receipt data
      const { data: receipt, error } = await supabase
        .from('receipt')
        .select(`
          *,
          vendor:vendor_id(*),
          lineItems:receipt_item(*),
          tags:receipt_tag(tag:tag_id(*))
        `)
        .eq('id', context.selectedReceipt)
        .eq('tenant_id', tenantId)
        .single();

      if (receipt && !error) {
        receiptData = receipt;
        receiptSummary = `Current receipt: ${receipt.vendor.name} - $${receipt.total_amount} on ${receipt.receipt_date}`;
      }
    } else {
      // Get summary of all receipts based on filters
      let query = supabase
        .from('receipt')
        .select(`
          id,
          receipt_date,
          total_amount,
          vendor:vendor_id(name),
          tags:receipt_tag(tag:tag_id(name))
        `)
        .eq('tenant_id', tenantId)
        .order('receipt_date', { ascending: false });

      // Apply filters if provided
      if (context?.filters?.startDate) {
        query = query.gte('receipt_date', context.filters.startDate);
      }
      if (context?.filters?.endDate) {
        query = query.lte('receipt_date', context.filters.endDate);
      }

      const { data: receipts, error } = await query.limit(50);

      if (receipts && !error) {
        const totalAmount = receipts.reduce((sum, r) => sum + r.total_amount, 0);
        const totalCount = receipts.length;
        receiptSummary = `You have ${totalCount} receipts totaling $${totalAmount.toFixed(2)}`;
      }
    }

    // Generate AI response based on message and context
    const aiResponse = await generateAIResponse(message, receiptData, receiptSummary, context);

    // Create response message
    const responseMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      message: responseMessage,
      conversationId: conversationId || `conv_${Date.now()}`,
      context: {
        receiptData: receiptData ? {
          id: receiptData.id,
          vendor: receiptData.vendor.name,
          amount: receiptData.total_amount,
          date: receiptData.receipt_date
        } : null
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

// AI Response Generation
async function generateAIResponse(
  message: string,
  receiptData: any,
  receiptSummary: string,
  context?: any
): Promise<string> {
  const lowerMessage = message.toLowerCase();

  // Receipt Analysis Queries
  if (lowerMessage.includes('total') || lowerMessage.includes('sum') || lowerMessage.includes('spent')) {
    if (receiptData) {
      return `This receipt from ${receiptData.vendor.name} totals $${receiptData.total_amount.toFixed(2)}. It includes ${receiptData.lineItems.length} line items with $${receiptData.tax_amount.toFixed(2)} in taxes.`;
    } else {
      return `${receiptSummary}. Would you like me to break this down by vendor, category, or time period?`;
    }
  }

  // Receipt Details
  if (lowerMessage.includes('detail') || lowerMessage.includes('breakdown') || lowerMessage.includes('items')) {
    if (receiptData) {
      const itemsText = receiptData.lineItems
        .map((item: any) => `• ${item.description}: $${item.total_price.toFixed(2)}`)
        .join('\n');
      return `Here are the line items from ${receiptData.vendor.name}:\n\n${itemsText}\n\nTotal: $${receiptData.total_amount.toFixed(2)}`;
    } else {
      return `${receiptSummary}. Please select a specific receipt to see its detailed breakdown.`;
    }
  }

  // Tag Analysis
  if (lowerMessage.includes('tag') || lowerMessage.includes('categor')) {
    if (receiptData) {
      const tags = receiptData.tags.map((t: any) => t.tag.name).join(', ');
      return `This receipt is tagged with: ${tags || 'No tags assigned'}. You can use tags to organize expenses by project, department, or tax status.`;
    } else {
      return `${receiptSummary}. I can help you analyze expenses by tags. Try asking about specific categories like "project expenses" or "travel costs".`;
    }
  }

  // Date/Time Queries
  if (lowerMessage.includes('recent') || lowerMessage.includes('latest') || lowerMessage.includes('today')) {
    return `${receiptSummary}. Your most recent receipts are displayed in the table. Would you like me to analyze spending patterns or find specific vendors?`;
  }

  // Vendor Analysis
  if (lowerMessage.includes('vendor') || lowerMessage.includes('merchant') || lowerMessage.includes('store')) {
    if (receiptData) {
      return `This receipt is from ${receiptData.vendor.name} in the ${receiptData.vendor.category} category. The total amount is $${receiptData.total_amount.toFixed(2)}.`;
    } else {
      return `${receiptSummary}. I can help you analyze spending by vendor. Try asking "show me all Starbucks receipts" or "what did I spend at Amazon?"`;
    }
  }

  // Search and Filter Help
  if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('filter')) {
    return `I can help you find receipts! Try asking:\n• "Find all receipts from last week"\n• "Show me travel expenses"\n• "What did I spend on meals this month?"\n• "Find receipts over $100"\n\nYou can also use the filter controls above to narrow down your search.`;
  }

  // Export Help
  if (lowerMessage.includes('export') || lowerMessage.includes('excel') || lowerMessage.includes('download')) {
    return `You can export your receipts to Excel using the "Export Excel" button. The export includes:\n• Detailed receipt data with all line items\n• Receipt summary (one row per receipt)\n• Tag analysis with usage statistics\n\nThe export will include any active filters you've applied.`;
  }

  // Help and Commands
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return `I'm your ClearSpendly AI assistant! I can help you:\n\n💰 **Analyze expenses**: "What's my total spending?"\n🔍 **Find receipts**: "Show me travel expenses"\n📊 **Understand data**: "Break down this receipt"\n🏷️ **Tag analysis**: "What are my project costs?"\n📈 **Insights**: "What's my biggest expense category?"\n📤 **Export help**: "How do I export to Excel?"\n\nJust ask me anything about your receipts!`;
  }

  // Generic Analysis
  if (lowerMessage.includes('analyze') || lowerMessage.includes('insight') || lowerMessage.includes('pattern')) {
    return `${receiptSummary}. I can provide insights like:\n• Spending patterns by vendor or category\n• Monthly/weekly expense trends\n• Tag-based analysis (projects, departments)\n• Largest expenses and cost drivers\n\nWhat specific analysis would you like to see?`;
  }

  // Default response with context
  if (receiptData) {
    return `I see you're looking at a receipt from ${receiptData.vendor.name} for $${receiptData.total_amount.toFixed(2)}. I can help you analyze this receipt, understand its tags, or compare it with other expenses. What would you like to know?`;
  } else {
    return `${receiptSummary}. I can help you analyze your expenses, find specific receipts, understand spending patterns, or export your data. What would you like to explore?`;
  }
}

// GET method for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'ClearSpendly AI Chat Agent',
    version: '1.0.0'
  });
}
