import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      return NextResponse.json({
        error: 'No user session',
        details: userError.message
      })
    }

    if (!user) {
      return NextResponse.json({
        error: 'User not authenticated'
      })
    }

    // Check if user exists in auth.users (should be there)
    const { data: authUser, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, created_at')
      .eq('id', user.id)
      .single()

    // Check if user exists in "user" table (might be missing)
    const { data: userRecord, error: userRecordError } = await supabase
      .from('user')
      .select('id, email, full_name, created_at')
      .eq('id', user.id)
      .single()

    // Check if user has any memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('membership')
      .select('id, tenant_id, role, status')
      .eq('user_id', user.id)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        provider: user.app_metadata?.provider,
        created_at: user.created_at
      },
      authUser: authError ? { error: authError.message } : authUser,
      userRecord: userRecordError ? { error: userRecordError.message } : userRecord,
      memberships: membershipError ? { error: membershipError.message } : memberships,
      summary: {
        hasAuthUser: !authError && !!authUser,
        hasUserRecord: !userRecordError && !!userRecord,
        hasMemberships: !membershipError && memberships && memberships.length > 0,
        userRecordMissing: userRecordError?.code === 'PGRST116'
      }
    })

  } catch (error) {
    console.error('Auth debug error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}