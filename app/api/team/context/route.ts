import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { getTeamContext } from '@/lib/tenant-utils';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, context) => {
    try {
      // Check for test mode parameter (development only)
      const url = new URL(request.url);
      const testMode = url.searchParams.get('test_mode') === 'true';
      
      const teamContext = await getTeamContext(
        context.user.id,
        context.membership.tenant_id,
        testMode
      );

      return NextResponse.json(teamContext);
    } catch (error) {
      console.error('Error fetching team context:', error);
      
      // Return safe defaults if error
      return NextResponse.json({
        isMultiUser: false,
        memberCount: 1,
        userRole: 'unknown',
        showTeamFeatures: false,
        showUserFiltering: false,
        showCreatedBy: false
      });
    }
  });
}