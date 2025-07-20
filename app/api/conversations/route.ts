import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface Conversation {
  id: string;
  tenantId: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

// Get conversations for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const conversationId = searchParams.get('conversationId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (conversationId) {
      // Get specific conversation with messages
      const { data: conversation, error } = await supabase
        .from('chat_conversation')
        .select(`
          *,
          messages:chat_message(*)
        `)
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Conversation not found' },
            { status: 404 }
          );
        }
        throw error;
      }

      // Sort messages by timestamp
      const sortedMessages = (conversation.messages || [])
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return NextResponse.json({
        success: true,
        conversation: {
          id: conversation.id,
          tenantId: conversation.tenant_id,
          title: conversation.title,
          messages: sortedMessages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            metadata: msg.metadata
          })),
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at
        }
      });
    } else {
      // Get all conversations for tenant (without messages)
      const { data: conversations, error } = await supabase
        .from('chat_conversation')
        .select('id, title, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        conversations: conversations || []
      });
    }

  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new conversation or add message to existing one
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tenantId, 
      conversationId, 
      message, 
      role = 'user',
      title,
      metadata 
    } = body;

    if (!tenantId || !message || !role) {
      return NextResponse.json(
        { error: 'Tenant ID, message, and role are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let finalConversationId = conversationId;

    // Create new conversation if needed
    if (!conversationId) {
      const conversationTitle = title || `Chat ${new Date().toLocaleDateString()}`;
      
      const { data: newConversation, error: convError } = await supabase
        .from('chat_conversation')
        .insert({
          tenant_id: tenantId,
          title: conversationTitle
        })
        .select()
        .single();

      if (convError) {
        throw convError;
      }

      finalConversationId = newConversation.id;
    }

    // Add message to conversation
    const { data: newMessage, error: msgError } = await supabase
      .from('chat_message')
      .insert({
        conversation_id: finalConversationId,
        role,
        content: message,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (msgError) {
      throw msgError;
    }

    // Update conversation timestamp
    await supabase
      .from('chat_conversation')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', finalConversationId);

    return NextResponse.json({
      success: true,
      conversationId: finalConversationId,
      message: {
        id: newMessage.id,
        role: newMessage.role,
        content: newMessage.content,
        timestamp: newMessage.created_at,
        metadata: newMessage.metadata
      }
    });

  } catch (error) {
    console.error('Create conversation/message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update conversation (e.g., change title)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, tenantId, title } = body;

    if (!conversationId || !tenantId) {
      return NextResponse.json(
        { error: 'Conversation ID and tenant ID are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updateData: any = { updated_at: new Date().toISOString() };
    if (title) {
      updateData.title = title;
    }

    const { data: updatedConversation, error } = await supabase
      .from('chat_conversation')
      .update(updateData)
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      conversation: updatedConversation
    });

  } catch (error) {
    console.error('Update conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete conversation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const tenantId = searchParams.get('tenantId');

    if (!conversationId || !tenantId) {
      return NextResponse.json(
        { error: 'Conversation ID and tenant ID are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete messages first (due to foreign key constraint)
    await supabase
      .from('chat_message')
      .delete()
      .eq('conversation_id', conversationId);

    // Delete conversation
    const { error } = await supabase
      .from('chat_conversation')
      .delete()
      .eq('id', conversationId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}