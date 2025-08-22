/**
 * Database Test Utilities for ClearSpendly
 * 
 * Provides database transaction management, cleanup, and isolation for tests
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

export interface TestTransaction {
  id: string;
  rollback: () => Promise<void>;
  commit: () => Promise<void>;
}

export interface DatabaseSnapshot {
  timestamp: string;
  tables: Record<string, any[]>;
  metadata: {
    tenantCount: number;
    userCount: number;
    receiptCount: number;
  };
}

/**
 * Database Test Utilities
 */
export class DatabaseTestUtils {
  private supabase: SupabaseClient<Database>;
  private snapshots: Map<string, DatabaseSnapshot> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  /**
   * Create a database snapshot for rollback testing
   */
  async createSnapshot(name: string): Promise<void> {
    const snapshot: DatabaseSnapshot = {
      timestamp: new Date().toISOString(),
      tables: {},
      metadata: {
        tenantCount: 0,
        userCount: 0,
        receiptCount: 0
      }
    };

    // Snapshot key tables for test data
    const testTables = ['tenant', 'tenant_membership', 'receipts', 'subscriptions'];
    
    for (const table of testTables) {
      const { data, error } = await this.supabase
        .from(table as any)
        .select('*')
        .like('id', 'test_%');

      if (!error && data) {
        snapshot.tables[table] = data;
        
        // Update metadata
        if (table === 'tenant') snapshot.metadata.tenantCount = data.length;
        if (table === 'tenant_membership') snapshot.metadata.userCount = data.length;
        if (table === 'receipts') snapshot.metadata.receiptCount = data.length;
      }
    }

    this.snapshots.set(name, snapshot);
  }

  /**
   * Restore database from snapshot
   */
  async restoreFromSnapshot(name: string): Promise<void> {
    const snapshot = this.snapshots.get(name);
    if (!snapshot) {
      throw new Error(`Snapshot '${name}' not found`);
    }

    // Clear test data
    await this.clearTestData();

    // Restore data in dependency order
    const insertOrder = ['tenant', 'tenant_membership', 'receipts', 'subscriptions'];
    
    for (const table of insertOrder) {
      const data = snapshot.tables[table];
      if (data && data.length > 0) {
        const { error } = await this.supabase
          .from(table as any)
          .insert(data);
        
        if (error) {
          console.warn(`Warning: Failed to restore ${table}:`, error.message);
        }
      }
    }
  }

  /**
   * Clear all test data from database
   */
  async clearTestData(): Promise<void> {
    const testTables = [
      'receipt_line_items',
      'receipt_tags',
      'receipts',
      'invoices', 
      'expense_subscriptions',
      'subscriptions',
      'tenant_membership',
      'tenant'
    ];

    for (const table of testTables) {
      const { error } = await this.supabase
        .from(table as any)
        .delete()
        .like('id', 'test_%');
        
      if (error && !error.message.includes('does not exist')) {
        console.warn(`Warning: Could not clear ${table}:`, error.message);
      }
    }

    // Clean up auth users
    try {
      const { data: users, error } = await this.supabase.auth.admin.listUsers();
      
      if (!error && users.users) {
        for (const user of users.users) {
          if (user.email?.includes('test-') || user.user_metadata?.test_user) {
            await this.supabase.auth.admin.deleteUser(user.id);
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not clean auth users:', error);
    }
  }

  /**
   * Execute test with automatic rollback
   */
  async withRollback<T>(testFn: () => Promise<T>): Promise<T> {
    const snapshotName = `rollback_${Date.now()}`;
    
    // Create snapshot before test
    await this.createSnapshot(snapshotName);
    
    try {
      const result = await testFn();
      return result;
    } finally {
      // Restore to snapshot state
      await this.restoreFromSnapshot(snapshotName);
      this.snapshots.delete(snapshotName);
    }
  }

  /**
   * Verify database state for testing
   */
  async verifyDatabaseState(): Promise<{
    valid: boolean;
    issues: string[];
    metrics: {
      testTenants: number;
      testUsers: number;
      orphanedRecords: number;
    };
  }> {
    const issues: string[] = [];
    const metrics = {
      testTenants: 0,
      testUsers: 0,
      orphanedRecords: 0
    };

    // Check for test tenants
    const { data: tenants, error: tenantError } = await this.supabase
      .from('tenant')
      .select('id, name')
      .like('id', 'test_%');

    if (tenantError) {
      issues.push(`Cannot verify tenants: ${tenantError.message}`);
    } else if (tenants) {
      metrics.testTenants = tenants.length;
    }

    // Check for orphaned memberships
    const { data: orphanedMemberships, error: membershipError } = await this.supabase
      .from('tenant_membership')
      .select(`
        id,
        tenant_id,
        tenant:tenant_id(id)
      `)
      .is('tenant.id', null);

    if (!membershipError && orphanedMemberships) {
      metrics.orphanedRecords += orphanedMemberships.length;
      if (orphanedMemberships.length > 0) {
        issues.push(`Found ${orphanedMemberships.length} orphaned memberships`);
      }
    }

    // Check for orphaned receipts
    const { data: orphanedReceipts, error: receiptsError } = await this.supabase
      .from('receipts')
      .select(`
        id,
        tenant_id,
        tenant:tenant_id(id)
      `)
      .is('tenant.id', null);

    if (!receiptsError && orphanedReceipts) {
      metrics.orphanedRecords += orphanedReceipts.length;
      if (orphanedReceipts.length > 0) {
        issues.push(`Found ${orphanedReceipts.length} orphaned receipts`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      metrics
    };
  }

  /**
   * Generate test database report
   */
  async generateTestReport(): Promise<{
    timestamp: string;
    environment: string;
    testData: {
      tenants: number;
      users: number;
      receipts: number;
      subscriptions: number;
    };
    performance: {
      avgQueryTime: number;
      connectionStatus: 'healthy' | 'degraded' | 'failed';
    };
    cleanup: {
      lastCleanup: string | null;
      pendingCleanup: string[];
    };
  }> {
    const startTime = Date.now();
    
    // Get test data counts
    const testDataPromises = [
      this.supabase.from('tenant').select('id', { count: 'exact' }).like('id', 'test_%'),
      this.supabase.from('receipts').select('id', { count: 'exact' }).like('tenant_id', 'test_%'),
      this.supabase.from('subscriptions').select('id', { count: 'exact' }).like('tenant_id', 'test_%')
    ];

    const [tenantCount, receiptCount, subscriptionCount] = await Promise.all(testDataPromises);
    
    // Calculate performance metrics
    const queryTime = Date.now() - startTime;
    
    // Get auth users count
    let userCount = 0;
    try {
      const { data: users } = await this.supabase.auth.admin.listUsers();
      userCount = users?.users?.filter(u => u.email?.includes('test-')).length || 0;
    } catch (error) {
      console.warn('Could not count auth users:', error);
    }

    // Check for pending cleanup items
    const pendingCleanup: string[] = [];
    if ((tenantCount.count || 0) > 10) pendingCleanup.push('Too many test tenants');
    if ((receiptCount.count || 0) > 100) pendingCleanup.push('Too many test receipts');
    if (userCount > 20) pendingCleanup.push('Too many test users');

    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      testData: {
        tenants: tenantCount.count || 0,
        users: userCount,
        receipts: receiptCount.count || 0,
        subscriptions: subscriptionCount.count || 0
      },
      performance: {
        avgQueryTime: queryTime / 3,
        connectionStatus: queryTime < 1000 ? 'healthy' : queryTime < 3000 ? 'degraded' : 'failed'
      },
      cleanup: {
        lastCleanup: null, // Would track this in metadata
        pendingCleanup
      }
    };
  }

  /**
   * Automated cleanup job for old test data
   */
  async cleanupOldTestData(maxAgeHours: number = 24): Promise<void> {
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    // Find old test tenants
    const { data: oldTenants, error } = await this.supabase
      .from('tenant')
      .select('id')
      .like('id', 'test_%')
      .lt('created_at', cutoffDate.toISOString());

    if (!error && oldTenants) {
      for (const tenant of oldTenants) {
        try {
          // This would cascade delete related data
          await this.supabase
            .from('tenant')
            .delete()
            .eq('id', tenant.id);
        } catch (error) {
          console.warn(`Failed to cleanup tenant ${tenant.id}:`, error);
        }
      }
    }
  }

  /**
   * Test database connection and permissions
   */
  async testConnection(): Promise<{
    connected: boolean;
    permissions: {
      canRead: boolean;
      canWrite: boolean;
      canDelete: boolean;
      canManageAuth: boolean;
    };
    latency: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Test read
      const { data: readTest, error: readError } = await this.supabase
        .from('tenant')
        .select('id')
        .limit(1);
      
      const canRead = !readError;

      // Test write
      const testId = `connection_test_${Date.now()}`;
      const { error: writeError } = await this.supabase
        .from('tenant')
        .insert({
          id: testId,
          name: 'Connection Test',
          slug: 'connection-test',
          subscription_status: 'active',
          subscription_plan: 'free'
        });
      
      const canWrite = !writeError;

      // Test delete (cleanup our test)
      let canDelete = false;
      if (canWrite) {
        const { error: deleteError } = await this.supabase
          .from('tenant')
          .delete()
          .eq('id', testId);
        
        canDelete = !deleteError;
      }

      // Test auth management
      let canManageAuth = false;
      try {
        await this.supabase.auth.admin.listUsers();
        canManageAuth = true;
      } catch (error) {
        canManageAuth = false;
      }

      const latency = Date.now() - startTime;

      return {
        connected: true,
        permissions: {
          canRead,
          canWrite,
          canDelete,
          canManageAuth
        },
        latency
      };
    } catch (error) {
      return {
        connected: false,
        permissions: {
          canRead: false,
          canWrite: false,
          canDelete: false,
          canManageAuth: false
        },
        latency: Date.now() - startTime
      };
    }
  }
}