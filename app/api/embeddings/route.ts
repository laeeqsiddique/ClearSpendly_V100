import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AIClient } from '@/lib/ai-utils';

// Generate embeddings for receipt items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { receiptId, tenantId, forceRegenerate = false } = body;

    if (!receiptId || !tenantId) {
      return NextResponse.json(
        { error: 'Receipt ID and tenant ID are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get receipt and its items
    const { data: receipt, error: receiptError } = await supabase
      .from('receipt')
      .select(`
        id,
        vendor:vendor_id(name),
        receipt_item(id, description, category, total_price, embedding)
      `)
      .eq('id', receiptId)
      .eq('tenant_id', tenantId)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    const aiClient = new AIClient();
    const provider = await aiClient.getAvailableProvider();

    if (!provider) {
      return NextResponse.json(
        { error: 'No AI provider available for embedding generation' },
        { status: 503 }
      );
    }

    const updatedItems = [];
    let generatedCount = 0;

    // Process each receipt item
    for (const item of receipt.receipt_item) {
      // Skip if embedding already exists and not forcing regeneration
      if (item.embedding && item.embedding.length > 0 && !forceRegenerate) {
        updatedItems.push(item);
        continue;
      }

      try {
        // Create text for embedding (description + category + vendor context)
        const embeddingText = [
          item.description,
          item.category,
          receipt.vendor?.name,
          `$${item.total_price}`
        ].filter(Boolean).join(' ');

        // Generate embedding
        const { embedding } = await aiClient.generateEmbedding(embeddingText);

        // Update the receipt item with embedding
        const { error: updateError } = await supabase
          .from('receipt_item')
          .update({ embedding })
          .eq('id', item.id);

        if (updateError) {
          console.error('Failed to update embedding for item:', item.id, updateError);
        } else {
          generatedCount++;
          updatedItems.push({ ...item, embedding });
        }
      } catch (error) {
        console.error('Failed to generate embedding for item:', item.id, error);
        updatedItems.push(item);
      }
    }

    return NextResponse.json({
      success: true,
      receiptId,
      itemsProcessed: receipt.receipt_item.length,
      embeddingsGenerated: generatedCount,
      provider,
      message: `Generated ${generatedCount} embeddings for receipt items`
    });

  } catch (error) {
    console.error('Embeddings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Batch generate embeddings for multiple receipts
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, limit = 10, forceRegenerate = false } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get receipts that need embeddings
    let query = supabase
      .from('receipt')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!forceRegenerate) {
      // Only get receipts with items that don't have embeddings
      query = query.not('receipt_item.embedding', 'is', null);
    }

    const { data: receipts, error: receiptsError } = await query;

    if (receiptsError) {
      throw receiptsError;
    }

    const results = [];
    let totalGenerated = 0;

    // Process each receipt
    for (const receipt of receipts || []) {
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiptId: receipt.id,
            tenantId,
            forceRegenerate
          })
        });

        const result = await response.json();
        results.push(result);
        
        if (result.success) {
          totalGenerated += result.embeddingsGenerated;
        }
      } catch (error) {
        console.error('Failed to process receipt:', receipt.id, error);
        results.push({
          success: false,
          receiptId: receipt.id,
          error: 'Processing failed'
        });
      }
    }

    return NextResponse.json({
      success: true,
      receiptsProcessed: receipts?.length || 0,
      totalEmbeddingsGenerated: totalGenerated,
      results
    });

  } catch (error) {
    console.error('Batch embeddings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get embedding statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get embedding statistics
    const { data: stats, error } = await supabase.rpc('get_embedding_stats', {
      tenant_id_param: tenantId
    });

    if (error) {
      // Fallback query if RPC doesn't exist
      const { data: items, error: itemsError } = await supabase
        .from('receipt_item')
        .select('id, embedding')
        .eq('receipt.tenant_id', tenantId);

      if (itemsError) {
        throw itemsError;
      }

      const totalItems = items?.length || 0;
      const itemsWithEmbeddings = items?.filter(item => 
        item.embedding && Array.isArray(item.embedding) && item.embedding.length > 0
      ).length || 0;

      return NextResponse.json({
        success: true,
        stats: {
          totalItems,
          itemsWithEmbeddings,
          itemsWithoutEmbeddings: totalItems - itemsWithEmbeddings,
          embeddingCoverage: totalItems > 0 ? (itemsWithEmbeddings / totalItems) * 100 : 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      stats: stats[0] || {
        totalItems: 0,
        itemsWithEmbeddings: 0,
        itemsWithoutEmbeddings: 0,
        embeddingCoverage: 0
      }
    });

  } catch (error) {
    console.error('Embedding stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}