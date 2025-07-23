import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const templateType = searchParams.get('type');
    const isActive = searchParams.get('active');

    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('tenant_id', membership.tenant_id)
      .order('template_type', { ascending: true })
      .order('created_at', { ascending: false });

    // Filter by template type if provided
    if (templateType) {
      query = query.eq('template_type', templateType);
    }

    // Filter by active status if provided
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: templates, error: templatesError } = await query;

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      templates: templates || []
    });

  } catch (error) {
    console.error('Error in email templates GET API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant with role check
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    // Check if user has permission to create templates
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      template_type,
      name,
      description,
      is_active,
      primary_color,
      secondary_color,
      accent_color,
      text_color,
      background_color,
      logo_url,
      company_name,
      subject_template,
      greeting_message,
      footer_message,
      header_style,
      body_style,
      button_style,
      custom_css,
      font_family,
      layout_width,
      header_padding,
      content_padding,
      section_spacing
    } = body;

    // Validate required fields
    if (!template_type || !name) {
      return NextResponse.json({ 
        error: 'Template type and name are required' 
      }, { status: 400 });
    }

    // Validate template_type
    if (!['invoice', 'payment_reminder', 'payment_received'].includes(template_type)) {
      return NextResponse.json({ 
        error: 'Invalid template type' 
      }, { status: 400 });
    }

    // If this template is being set as active, deactivate other templates of the same type
    if (is_active) {
      await supabase
        .from('email_templates')
        .update({ is_active: false })
        .eq('tenant_id', membership.tenant_id)
        .eq('template_type', template_type);
    }

    // Create new template
    const { data: template, error: createError } = await supabase
      .from('email_templates')
      .insert({
        tenant_id: membership.tenant_id,
        template_type,
        name,
        description,
        is_active: is_active || false,
        primary_color: primary_color || '#667eea',
        secondary_color: secondary_color || '#764ba2',
        accent_color: accent_color || '#10b981',
        text_color: text_color || '#1a1a1a',
        background_color: background_color || '#f5f5f5',
        logo_url,
        company_name,
        subject_template,
        greeting_message,
        footer_message,
        header_style: header_style || { gradient: true, centerAlign: true },
        body_style: body_style || { padding: '48px 40px', backgroundColor: '#ffffff' },
        button_style: button_style || { borderRadius: '50px', padding: '18px 48px' },
        custom_css,
        font_family: font_family || 'system',
        layout_width: layout_width || '600',
        header_padding: header_padding || '48',
        content_padding: content_padding || '40',
        section_spacing: section_spacing || '32',
        created_by: user.id
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating template:', createError);
      return NextResponse.json({ 
        error: 'Failed to create template' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template,
      message: 'Template created successfully'
    });

  } catch (error) {
    console.error('Error in email templates POST API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}