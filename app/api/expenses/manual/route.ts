import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "No tenant access found" }, { status: 403 });
    }

    // Check if user has permission to create expenses
    if (!['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const {
      receipt_date,
      total_amount,
      vendor_name,
      category,
      payment_method,
      business_purpose,
      manual_entry_reason,
      notes,
      recurring,
      alternative_proof_url,
    } = body;

    // Validation
    if (!receipt_date || !total_amount || !vendor_name || !category || !payment_method || !business_purpose || !manual_entry_reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if vendor exists or create new one
    let vendorId = null;
    const normalizedVendorName = vendor_name.toLowerCase().trim();
    
    const { data: existingVendor } = await supabase
      .from('vendor')
      .select('id')
      .eq('tenant_id', membership.tenant_id)
      .eq('normalized_name', normalizedVendorName)
      .single();

    if (existingVendor) {
      vendorId = existingVendor.id;
    } else {
      // Create new vendor
      const { data: newVendor, error: vendorError } = await supabase
        .from('vendor')
        .insert({
          tenant_id: membership.tenant_id,
          name: vendor_name,
          normalized_name: normalizedVendorName,
          category,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (vendorError) {
        console.error('Error creating vendor:', vendorError);
      } else if (newVendor) {
        vendorId = newVendor.id;
      }
    }

    // Create the manual expense entry
    const { data: receipt, error: receiptError } = await supabase
      .from('receipt')
      .insert({
        tenant_id: membership.tenant_id,
        vendor_id: vendorId,
        receipt_date,
        total_amount,
        subtotal_amount: total_amount, // For manual entries, assume no tax separation
        tax_amount: 0,
        currency: 'USD',
        payment_method,
        category,
        notes,
        
        // Manual entry specific fields
        receipt_type: 'manual',
        manual_entry_reason,
        business_purpose,
        alternative_proof_url,
        
        // OCR fields (not applicable for manual)
        original_file_url: null,
        ocr_status: 'completed',
        source: 'manual_entry',
        
        // User tracking
        created_by: user.id,
        updated_by: user.id,
        
        // Additional metadata
        source_metadata: {
          recurring,
          entry_method: 'web_form',
          user_agent: req.headers.get('user-agent'),
        },
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Error creating receipt:', receiptError);
      return NextResponse.json(
        { error: "Failed to create expense entry" },
        { status: 500 }
      );
    }

    // Log the manual entry for audit purposes
    console.log(`Manual expense created: ${receipt.id} by user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: receipt,
      message: "Expense saved successfully",
    });

  } catch (error) {
    console.error("Manual expense creation error:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch expense templates
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Return predefined templates (could be stored in DB in future)
    const templates = [
      {
        id: "parking",
        name: "Parking",
        category: "car_truck",
        payment_method: "cash",
        manual_entry_reason: "parking_meter",
        typical_amount: 5.00,
      },
      {
        id: "coffee_meeting",
        name: "Coffee Meeting",
        category: "meals",
        payment_method: "credit_card",
        manual_entry_reason: "small_cash",
        typical_amount: 15.00,
      },
      {
        id: "office_supplies",
        name: "Office Supplies",
        category: "supplies",
        payment_method: "credit_card",
        manual_entry_reason: "small_cash",
        typical_amount: 25.00,
      },
      {
        id: "toll",
        name: "Toll",
        category: "car_truck",
        payment_method: "cash",
        manual_entry_reason: "toll",
        typical_amount: 5.00,
      },
    ];

    return NextResponse.json({
      success: true,
      data: templates,
    });

  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}