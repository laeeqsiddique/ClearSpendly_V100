import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // For now, use default tenant ID until auth is fully set up
    const defaultTenantId = '00000000-0000-0000-0000-000000000001';
    const receiptId = params.id;

    // Get receipt with vendor and line items
    const { data: receipt, error: receiptError } = await supabase
      .from('receipt')
      .select(`
        *,
        vendor:vendor(*),
        lineItems:receipt_item(
          *,
          tags:receipt_item_tag(
            tag:tag(
              *,
              category:tag_category(*)
            )
          )
        ),
        tags:receipt_tag(
          tag:tag(
            *,
            category:tag_category(*)
          )
        )
      `)
      .eq('id', receiptId)
      .eq('tenant_id', defaultTenantId)
      .single();

    if (receiptError) {
      console.error('Error fetching receipt:', receiptError);
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Transform the data structure
    const transformedReceipt = {
      ...receipt,
      lineItems: receipt.lineItems?.map((item: any) => ({
        ...item,
        tags: item.tags?.map((it: any) => ({
          ...it.tag,
          category: it.tag.category
        })) || []
      })) || [],
      tags: receipt.tags?.map((rt: any) => ({
        ...rt.tag,
        category: rt.tag.category
      })) || []
    };

    return NextResponse.json({
      success: true,
      data: transformedReceipt
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // For now, use default tenant ID until auth is fully set up
    const defaultTenantId = '00000000-0000-0000-0000-000000000001';
    const receiptId = params.id;
    const body = await request.json();

    console.log('Updating receipt:', receiptId, 'with data:', JSON.stringify(body, null, 2));

    // Start a transaction-like operation
    let updates: any = {};
    
    // Handle basic field updates
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }
    if (body.receipt_date !== undefined) {
      updates.receipt_date = body.receipt_date;
    }
    if (body.total_amount !== undefined) {
      updates.total_amount = body.total_amount;
    }
    if (body.tax_amount !== undefined) {
      updates.tax_amount = body.tax_amount;
    }

    // Handle vendor update
    if (body.vendor !== undefined) {
      console.log('Vendor update requested:', body.vendor);
      
      // First, try to find existing vendor with this name
      const { data: existingVendor } = await supabase
        .from('vendor')
        .select('id')
        .eq('name', body.vendor)
        .eq('tenant_id', defaultTenantId)
        .single();

      if (existingVendor) {
        // Use existing vendor
        updates.vendor_id = existingVendor.id;
      } else {
        // Create new vendor
        const { data: newVendor, error: vendorError } = await supabase
          .from('vendor')
          .insert({
            name: body.vendor,
            category: 'Other', // Default category
            tenant_id: defaultTenantId
          })
          .select('id')
          .single();

        if (vendorError) {
          console.error('Error creating vendor:', vendorError);
          return NextResponse.json(
            { success: false, error: 'Failed to create vendor' },
            { status: 400 }
          );
        }

        updates.vendor_id = newVendor.id;
      }
    }

    // Update receipt basic fields if any
    if (Object.keys(updates).length > 0) {
      console.log('Applying receipt updates:', updates);
      
      const { error: receiptError } = await supabase
        .from('receipt')
        .update(updates)
        .eq('id', receiptId)
        .eq('tenant_id', defaultTenantId);

      if (receiptError) {
        console.error('Error updating receipt:', receiptError);
        return NextResponse.json(
          { success: false, error: 'Failed to update receipt' },
          { status: 400 }
        );
      }
      
      console.log('Receipt updated successfully with:', updates);
    } else {
      console.log('No receipt updates to apply');
    }

    // Handle tags update
    if (body.tags !== undefined && Array.isArray(body.tags)) {
      // First, remove all existing tags for this receipt
      const { error: deleteError } = await supabase
        .from('receipt_tag')
        .delete()
        .eq('receipt_id', receiptId)
        .eq('tenant_id', defaultTenantId);

      if (deleteError) {
        console.error('Error deleting existing tags:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to update tags' },
          { status: 400 }
        );
      }

      // Then, add the new tags
      if (body.tags.length > 0) {
        const tagInserts = body.tags.map((tagId: string) => ({
          receipt_id: receiptId,
          tag_id: tagId,
          tenant_id: defaultTenantId
        }));

        const { error: insertError } = await supabase
          .from('receipt_tag')
          .insert(tagInserts);

        if (insertError) {
          console.error('Error inserting new tags:', insertError);
          return NextResponse.json(
            { success: false, error: 'Failed to update tags' },
            { status: 400 }
          );
        }
      }
    }

    // Handle line items update
    if (body.lineItems !== undefined && Array.isArray(body.lineItems)) {
      for (const lineItem of body.lineItems) {
        // Update line item basic fields
        const lineItemUpdates: any = {};
        if (lineItem.description !== undefined) lineItemUpdates.description = lineItem.description;
        if (lineItem.quantity !== undefined) lineItemUpdates.quantity = lineItem.quantity;
        if (lineItem.unit_price !== undefined) lineItemUpdates.unit_price = lineItem.unit_price;
        if (lineItem.total_price !== undefined) lineItemUpdates.total_price = lineItem.total_price;

        if (Object.keys(lineItemUpdates).length > 0) {
          const { error: lineItemError } = await supabase
            .from('receipt_item')
            .update(lineItemUpdates)
            .eq('id', lineItem.id)
            .eq('receipt_id', receiptId);

          if (lineItemError) {
            console.error('Error updating line item:', lineItemError);
            return NextResponse.json(
              { success: false, error: 'Failed to update line item' },
              { status: 400 }
            );
          }
        }

        // Handle line item tags if provided
        if (lineItem.tags !== undefined && Array.isArray(lineItem.tags)) {
          // First, remove existing tags for this line item
          const { error: deleteTagsError } = await supabase
            .from('receipt_item_tag')
            .delete()
            .eq('receipt_item_id', lineItem.id);

          if (deleteTagsError) {
            console.error('Error deleting line item tags:', deleteTagsError);
            return NextResponse.json(
              { success: false, error: 'Failed to update line item tags' },
              { status: 400 }
            );
          }

          // Then, add new tags for this line item
          if (lineItem.tags.length > 0) {
            const lineItemTagInserts = lineItem.tags.map((tagId: string) => ({
              receipt_item_id: lineItem.id,
              tag_id: tagId,
              tenant_id: defaultTenantId
            }));

            console.log('Inserting line item tags:', lineItemTagInserts);

            const { error: insertTagsError } = await supabase
              .from('receipt_item_tag')
              .insert(lineItemTagInserts);

            if (insertTagsError) {
              console.error('Error inserting line item tags:', insertTagsError);
              return NextResponse.json(
                { success: false, error: 'Failed to update line item tags' },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    // Fetch the updated receipt to return
    const { data: updatedReceipt, error: fetchError } = await supabase
      .from('receipt')
      .select(`
        *,
        vendor:vendor(*),
        lineItems:receipt_item(
          *,
          tags:receipt_item_tag(
            tag:tag(
              *,
              category:tag_category(*)
            )
          )
        ),
        tags:receipt_tag(
          tag:tag(
            *,
            category:tag_category(*)
          )
        )
      `)
      .eq('id', receiptId)
      .eq('tenant_id', defaultTenantId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated receipt:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updated receipt' },
        { status: 400 }
      );
    }

    // Transform the data structure
    const transformedReceipt = {
      ...updatedReceipt,
      lineItems: updatedReceipt.lineItems?.map((item: any) => ({
        ...item,
        tags: item.tags?.map((it: any) => ({
          ...it.tag,
          category: it.tag.category
        })) || []
      })) || [],
      tags: updatedReceipt.tags?.map((rt: any) => ({
        ...rt.tag,
        category: rt.tag.category
      })) || []
    };

    return NextResponse.json({
      success: true,
      data: transformedReceipt,
      message: 'Receipt updated successfully'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // For now, use default tenant ID until auth is fully set up
    const defaultTenantId = '00000000-0000-0000-0000-000000000001';
    const receiptId = params.id;

    // Delete in the correct order due to foreign key constraints
    // 1. Delete receipt tags
    const { error: tagsError } = await supabase
      .from('receipt_tag')
      .delete()
      .eq('receipt_id', receiptId);

    if (tagsError) {
      console.error('Error deleting receipt tags:', tagsError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete receipt tags' },
        { status: 400 }
      );
    }

    // 2. Delete receipt items
    const { error: itemsError } = await supabase
      .from('receipt_item')
      .delete()
      .eq('receipt_id', receiptId);

    if (itemsError) {
      console.error('Error deleting receipt items:', itemsError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete receipt items' },
        { status: 400 }
      );
    }

    // 3. Delete the receipt itself
    const { error: receiptError } = await supabase
      .from('receipt')
      .delete()
      .eq('id', receiptId);

    if (receiptError) {
      console.error('Error deleting receipt:', receiptError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete receipt' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Receipt deleted successfully'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}