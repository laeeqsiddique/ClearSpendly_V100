import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { paymentTestingFramework } from '@/lib/services/payment-testing';

export const dynamic = 'force-dynamic';

// Deployment safety
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

// Only allow testing in development and staging environments
const isTestingAllowed = process.env.NODE_ENV === 'development' || process.env.ENABLE_PAYMENT_TESTING === 'true';

// GET /api/billing/testing - Get available test scenarios
export async function GET(request: NextRequest) {
  if (isBuildTime) {
    return NextResponse.json({
      success: true,
      scenarios: {},
      buildTime: true
    });
  }

  if (!isTestingAllowed) {
    return NextResponse.json({ 
      error: 'Payment testing not enabled in this environment' 
    }, { status: 403 });
  }

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // Get user's tenant and verify permissions
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant access found' }, { status: 403 });
    }

    // Only owners and admins can run payment tests
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'scenarios') {
      const scenarios = paymentTestingFramework.getAllTestScenarios();
      return NextResponse.json({
        success: true,
        scenarios: Object.keys(scenarios).reduce((acc, key) => {
          const scenario = scenarios[key];
          acc[key] = {
            id: scenario.id,
            name: scenario.name,
            description: scenario.description,
            provider: scenario.provider,
            category: scenario.category,
            stepCount: scenario.steps.length
          };
          return acc;
        }, {} as any)
      });
    }

    if (action === 'scenario') {
      const scenarioId = searchParams.get('scenarioId');
      if (!scenarioId) {
        return NextResponse.json({ error: 'Scenario ID is required' }, { status: 400 });
      }

      const scenario = paymentTestingFramework.getTestScenario(scenarioId);
      if (!scenario) {
        return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        scenario
      });
    }

    // Default: return all scenarios summary
    const scenarios = paymentTestingFramework.getAllTestScenarios();
    const scenarioSummary = Object.values(scenarios).reduce((acc, scenario) => {
      const category = scenario.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        provider: scenario.provider
      });
      return acc;
    }, {} as any);

    return NextResponse.json({
      success: true,
      scenariosByCategory: scenarioSummary,
      totalScenarios: Object.keys(scenarios).length
    });

  } catch (error) {
    console.error('Error in GET /api/billing/testing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/billing/testing - Run payment tests
export async function POST(request: NextRequest) {
  if (isBuildTime) {
    return NextResponse.json({
      success: true,
      message: 'Build-time mock response',
      buildTime: true
    });
  }

  if (!isTestingAllowed) {
    return NextResponse.json({ 
      error: 'Payment testing not enabled in this environment' 
    }, { status: 403 });
  }

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const body = await request.json();

    // Get user's tenant and verify permissions
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant access found' }, { status: 403 });
    }

    // Only owners and admins can run payment tests
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const {
      action,
      scenarioId,
      categories,
      providers,
      options = {}
    } = body;

    let results;

    if (action === 'run_scenario') {
      if (!scenarioId) {
        return NextResponse.json({ error: 'Scenario ID is required' }, { status: 400 });
      }

      results = [await paymentTestingFramework.runTestScenario(
        scenarioId,
        membership.tenant_id,
        options
      )];

    } else if (action === 'run_all') {
      results = await paymentTestingFramework.runAllTests(
        membership.tenant_id,
        {
          categories,
          providers,
          verbose: options.verbose,
          parallel: options.parallel
        }
      );

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Generate test report
    const report = await paymentTestingFramework.generateTestReport(results);

    // Store test results in database for audit trail
    await supabase
      .from('test_results')
      .insert({
        tenant_id: membership.tenant_id,
        user_id: user.id,
        test_type: 'payment_testing',
        action,
        scenario_id: scenarioId,
        results: {
          summary: report.summary,
          scenarios: results.map(r => ({
            scenarioId: r.scenarioId,
            success: r.success,
            duration: r.duration,
            error: r.error
          }))
        },
        success_rate: report.summary.successRate,
        total_duration: report.summary.totalDuration,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      report,
      testResults: results
    });

  } catch (error) {
    console.error('Error in POST /api/billing/testing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}