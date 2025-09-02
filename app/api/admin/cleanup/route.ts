import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { polar } from '@/lib/polar';

export const dynamic = 'force-dynamic';

// Admin cleanup API - completely removes a user and their data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, adminPassword } = body;

    // Simple admin password check (you should change this)
    const ADMIN_PASSWORD = process.env.ADMIN_CLEANUP_PASSWORD || 'admin123cleanup';
    
    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    console.log(`Starting cleanup for email: ${email}`);
    const results = {
      email,
      userFound: false,
      tenantDeleted: false,
      polarCustomerDeleted: false,
      authUserDeleted: false,
      errors: [] as string[],
    };

    // Step 1: Find user - try database first, then auth
    let userId: string | null = null;
    
    // Try database user table first
    console.log(`Looking for user with email: ${email}`);
    const { data: dbUser, error: dbError } = await adminClient
      .from('user')
      .select('id, email')
      .eq('email', email)
      .single();

    console.log('Database user query result:', { dbUser, dbError });

    if (dbUser) {
      userId = dbUser.id;
      results.userFound = true;
      console.log(`Found user in database: ${userId}`);
    } else {
      console.log('User not in database, checking auth...');
      // User not in database, try auth directly
      const { data: authUsers, error: authListError } = await adminClient.auth.admin.listUsers();
      
      if (authListError) {
        results.errors.push(`Failed to list auth users: ${authListError.message}`);
        return NextResponse.json({ success: false, results });
      }
      
      const authUser = authUsers.users.find(u => u.email === email);
      console.log('Auth user found:', authUser ? authUser.id : 'none');
      
      if (authUser) {
        userId = authUser.id;
        results.userFound = true;
        results.errors.push('User found in auth but not in database - partial cleanup');
      } else {
        results.errors.push('User not found in database or auth');
        return NextResponse.json({ success: false, results });
      }
    }

    // Step 2: Delete all memberships first
    const { error: membershipError } = await adminClient
      .from('membership')
      .delete()
      .eq('user_id', userId);

    if (membershipError) {
      results.errors.push(`Failed to delete memberships: ${membershipError.message}`);
    }

    // Step 3: Find and delete all tenants owned by this user
    const { data: tenants } = await adminClient
      .from('tenant')
      .select('id, name')
      .eq('created_by', userId);

    if (tenants && tenants.length > 0) {
      for (const tenant of tenants) {
        // Delete tenant (cascade will handle related records)
        const { error: tenantError } = await adminClient
          .from('tenant')
          .delete()
          .eq('id', tenant.id);

        if (tenantError) {
          results.errors.push(`Failed to delete tenant ${tenant.id}: ${tenantError.message}`);
        } else {
          results.tenantDeleted = true;
          console.log(`Deleted tenant: ${tenant.id} (${tenant.name})`);
        }
      }
    }

    // Step 4: Delete from public.user table (if exists)
    console.log(`Attempting to delete user from database: ${userId}`);
    const { data: deleteData, error: publicUserError, count } = await adminClient
      .from('user')
      .delete()
      .eq('id', userId)
      .select('*');

    console.log('Delete result:', { deleteData, publicUserError, count });

    if (publicUserError) {
      results.errors.push(`Failed to delete user from database: ${publicUserError.message}`);
      console.error('Database user deletion error:', publicUserError);
    } else if (deleteData && deleteData.length > 0) {
      console.log(`Successfully deleted user from database: ${userId}`, deleteData);
    } else {
      console.log(`User ${userId} not found in database table for deletion`);
    }

    // Step 5: Delete Polar customer if exists
    try {
      // Try to find Polar customer by email
      const polarCustomers = await polar.customers.list({
        email: email
      });

      if (polarCustomers?.result?.items && polarCustomers.result.items.length > 0) {
        for (const customer of polarCustomers.result.items) {
          try {
            // Note: Polar API might not have a direct delete method
            // You may need to cancel subscriptions instead
            console.log(`Found Polar customer: ${customer.id}`);
            
            // Get all subscriptions for this customer
            const subscriptions = await polar.subscriptions.list({
              customerId: customer.id
            });

            if (subscriptions?.result?.items) {
              for (const sub of subscriptions.result.items) {
                try {
                  await polar.subscriptions.cancel(sub.id);
                  console.log(`Cancelled Polar subscription: ${sub.id}`);
                } catch (subError) {
                  console.error('Error cancelling subscription:', subError);
                }
              }
            }
            
            results.polarCustomerDeleted = true;
          } catch (customerError) {
            results.errors.push(`Failed to process Polar customer: ${customerError}`);
          }
        }
      }
    } catch (polarError) {
      console.error('Polar cleanup error:', polarError);
      results.errors.push('Polar cleanup failed (non-critical)');
    }

    // Step 6: Delete from auth.users using admin client with service role
    try {
      console.log(`Attempting to delete auth user: ${userId}`);
      
      const { data, error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
      
      if (authDeleteError) {
        console.error('Auth deletion error:', authDeleteError);
        results.errors.push(`Auth user deletion failed: ${authDeleteError.message}`);
        
        // If service role key is not configured, provide instructions
        if (authDeleteError.message.includes('not authorized') || authDeleteError.message.includes('JWT') || authDeleteError.message.includes('service_role')) {
          results.errors.push('Service role key not configured properly. Check SUPABASE_SERVICE_ROLE_KEY');
        }
        results.errors.push('Manual deletion required: Supabase Dashboard > Authentication > Users');
      } else {
        results.authUserDeleted = true;
        console.log(`Successfully deleted auth user: ${userId}`, data);
      }
    } catch (authError) {
      console.error('Auth cleanup error:', authError);
      results.errors.push(`Auth deletion exception: ${authError}`);
      results.errors.push('Manual deletion required: Supabase Dashboard > Authentication > Users');
    }

    // Final success check
    const isFullSuccess = results.userFound && 
                         results.authUserDeleted && 
                         results.errors.length === 0;

    return NextResponse.json({
      success: isFullSuccess,
      message: isFullSuccess ? 'Cleanup completed successfully' : 'Cleanup completed with some issues',
      results
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if cleanup API is available
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Cleanup API is ready',
    instructions: 'POST to this endpoint with { email: "user@example.com", adminPassword: "your-password" }'
  });
}