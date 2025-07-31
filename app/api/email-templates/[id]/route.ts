import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  const params = await context.params;
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

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', membership.tenant_id)
      .single();

    if (templateError) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Error in email template GET API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  const params = await context.params;
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

    // Check if user has permission to update templates
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify template exists and belongs to user's tenant
    const { data: existingTemplate, error: checkError } = await supabase
      .from('email_templates')
      .select('template_type')
      .eq('id', params.id)
      .eq('tenant_id', membership.tenant_id)
      .single();

    if (checkError) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
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

    // If this template is being set as active, deactivate other templates of the same type
    if (is_active) {
      await supabase
        .from('email_templates')
        .update({ is_active: false })
        .eq('tenant_id', membership.tenant_id)
        .eq('template_type', existingTemplate.template_type)
        .neq('id', params.id);
    }

    // Update template
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (primary_color !== undefined) updateData.primary_color = primary_color;
    if (secondary_color !== undefined) updateData.secondary_color = secondary_color;
    if (accent_color !== undefined) updateData.accent_color = accent_color;
    if (text_color !== undefined) updateData.text_color = text_color;
    if (background_color !== undefined) updateData.background_color = background_color;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (company_name !== undefined) updateData.company_name = company_name;
    if (subject_template !== undefined) updateData.subject_template = subject_template;
    if (greeting_message !== undefined) updateData.greeting_message = greeting_message;
    if (footer_message !== undefined) updateData.footer_message = footer_message;
    if (header_style !== undefined) updateData.header_style = header_style;
    if (body_style !== undefined) updateData.body_style = body_style;
    if (button_style !== undefined) updateData.button_style = button_style;
    if (custom_css !== undefined) updateData.custom_css = custom_css;
    if (font_family !== undefined) updateData.font_family = font_family;
    if (layout_width !== undefined) updateData.layout_width = layout_width;
    if (header_padding !== undefined) updateData.header_padding = header_padding;
    if (content_padding !== undefined) updateData.content_padding = content_padding;
    if (section_spacing !== undefined) updateData.section_spacing = section_spacing;

    const { data: template, error: updateError } = await supabase
      .from('email_templates')
      .update(updateData)
      .eq('id', params.id)
      .eq('tenant_id', membership.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating template:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update template' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template,
      message: 'Template updated successfully'
    });

  } catch (error) {
    console.error('Error in email template PUT API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  const params = await context.params;
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

    // Check if user has permission to delete templates
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify template exists and belongs to user's tenant
    const { data: existingTemplate, error: checkError } = await supabase
      .from('email_templates')
      .select('is_active, template_type')
      .eq('id', params.id)
      .eq('tenant_id', membership.tenant_id)
      .single();

    if (checkError) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Don't allow deletion of the only active template for a type
    if (existingTemplate.is_active) {
      const { data: otherTemplates, error: countError } = await supabase
        .from('email_templates')
        .select('id')
        .eq('tenant_id', membership.tenant_id)
        .eq('template_type', existingTemplate.template_type)
        .neq('id', params.id);

      if (countError || !otherTemplates || otherTemplates.length === 0) {
        return NextResponse.json({ 
          error: 'Cannot delete the only template for this type. Create another template first.' 
        }, { status: 400 });
      }
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', membership.tenant_id);

    if (deleteError) {
      console.error('Error deleting template:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete template' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Error in email template DELETE API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}