import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test if we can access the user table
    const { data: users, error: usersError } = await supabase
      .from('user')
      .select('id, email')
      .limit(1);

    // Test if we can access auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const debug = {
      timestamp: new Date().toISOString(),
      userTableAccess: {
        success: !usersError,
        error: usersError?.message,
        count: users?.length || 0
      },
      authAccess: {
        success: !authError,
        error: authError?.message,
        hasUser: !!user,
        userId: user?.id?.substring(0, 8) + '...' || 'none'
      },
      environment: process.env.NODE_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
    };

    return NextResponse.json(debug);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}