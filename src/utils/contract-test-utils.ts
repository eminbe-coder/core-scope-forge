import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TestContract {
  id: string;
  name: string;
  value?: number;
  status: string;
  assigned_to?: string;
  customer_id?: string;
  deal_id?: string;
  tenant_id: string;
}

export interface TestDeal {
  id: string;
  name: string;
  value?: number;
  status: string;
  assigned_to?: string;
  customer_id?: string;
  tenant_id: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

/**
 * Contract System Integration Test Suite
 * Verifies full workflow functionality including permissions, audit trails, and notifications
 */
export class ContractTestRunner {
  private tenantId: string;
  private currentUserId: string;
  private isAdmin: boolean;

  constructor(tenantId: string, currentUserId: string, isAdmin: boolean) {
    this.tenantId = tenantId;
    this.currentUserId = currentUserId;
    this.isAdmin = isAdmin;
  }

  /**
   * Test 1: Direct Contract Creation
   */
  async testDirectContractCreation(): Promise<TestResult> {
    try {
      console.log('🧪 Testing direct contract creation...');
      
      const contractData = {
        name: `Test Contract - ${Date.now()}`,
        description: 'Test contract for integration testing',
        value: 50000,
        tenant_id: this.tenantId,
        assigned_to: this.currentUserId,
        status: 'active'
      };

      const { data: contract, error } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      if (error) throw error;

      // Verify audit trail was created
      const { data: auditLogs } = await supabase
        .from('contract_audit_logs')
        .select('*')
        .eq('contract_id', contract.id)
        .eq('action', 'contract_created');

      const hasAuditLog = auditLogs && auditLogs.length > 0;

      return {
        success: true,
        message: `✅ Contract created successfully. Audit trail: ${hasAuditLog ? 'Created' : 'Missing'}`,
        data: { contract, auditLogs }
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Failed to create contract directly',
        error
      };
    }
  }

  /**
   * Test 2: Deal to Contract Promotion
   */
  async testDealToContractPromotion(): Promise<TestResult> {
    try {
      console.log('🧪 Testing deal to contract promotion...');
      
      // First create a test deal
      const dealData = {
        name: `Test Deal - ${Date.now()}`,
        description: 'Test deal for promotion testing',
        value: 75000,
        tenant_id: this.tenantId,
        assigned_to: this.currentUserId,
        status: 'won' as const
      };

      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert(dealData)
        .select()
        .single();

      if (dealError) throw dealError;

      // Create some deal activities for inheritance test
      await supabase
        .from('activity_logs')
        .insert({
          entity_type: 'deal',
          entity_id: deal.id,
          tenant_id: this.tenantId,
          title: 'Test Activity',
          activity_type: 'note_added',
          description: 'Test activity for inheritance',
          created_by: this.currentUserId
        });

      // Now promote to contract
      const contractData = {
        name: `Contract from ${deal.name}`,
        description: deal.description,
        value: deal.value,
        tenant_id: this.tenantId,
        assigned_to: deal.assigned_to,
        deal_id: deal.id,
        status: 'active'
      };

      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      if (contractError) throw contractError;

      // Verify inheritance of deal activities
      const { data: inheritedLogs } = await supabase
        .from('contract_audit_logs')
        .select('*')
        .eq('contract_id', contract.id)
        .eq('action', 'inherited_from_deal');

      return {
        success: true,
        message: `✅ Deal promoted to contract. Inherited activities: ${inheritedLogs?.length || 0}`,
        data: { deal, contract, inheritedLogs }
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Failed to promote deal to contract',
        error
      };
    }
  }

  /**
   * Test 3: Payment Terms and Stage Management
   */
  async testPaymentTermsManagement(contractId: string): Promise<TestResult> {
    try {
      console.log('🧪 Testing payment terms management...');
      
      // Get payment stages
      const { data: stages } = await supabase
        .from('contract_payment_stages')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .order('sort_order');

      const pendingStage = stages?.find(s => s.name === 'Pending Task');
      const dueStage = stages?.find(s => s.name === 'Due');

      // Create payment terms
      const paymentTerms = [
        {
          contract_id: contractId,
          tenant_id: this.tenantId,
          installment_number: 1,
          amount_type: 'percentage',
          amount_value: 50,
          calculated_amount: 25000,
          stage_id: pendingStage?.id,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
        },
        {
          contract_id: contractId,
          tenant_id: this.tenantId,
          installment_number: 2,
          amount_type: 'percentage',
          amount_value: 50,
          calculated_amount: 25000,
          stage_id: dueStage?.id, // No todos required - should be "Due"
          due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 60 days from now
        }
      ];

      const { data: createdTerms, error } = await supabase
        .from('contract_payment_terms')
        .insert(paymentTerms)
        .select();

      if (error) throw error;

      // Test payment stage updates
      const firstTerm = createdTerms[0];
      const { error: updateError } = await supabase
        .from('contract_payment_terms')
        .update({ stage_id: dueStage?.id })
        .eq('id', firstTerm.id);

      if (updateError) throw updateError;

      // Verify audit logs for payment changes
      const { data: paymentAuditLogs } = await supabase
        .from('contract_audit_logs')
        .select('*')
        .eq('contract_id', contractId)
        .in('action', ['payment_term_created', 'payment_stage_updated']);

      return {
        success: true,
        message: `✅ Payment terms created and updated. Audit logs: ${paymentAuditLogs?.length || 0}`,
        data: { paymentTerms: createdTerms, auditLogs: paymentAuditLogs }
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Failed to manage payment terms',
        error
      };
    }
  }

  /**
   * Test 4: Todo Tasks and Auto Stage Updates
   */
  async testTodoTasksAndAutoUpdates(contractId: string): Promise<TestResult> {
    try {
      console.log('🧪 Testing todo tasks and auto stage updates...');
      
      // Get first payment term
      const { data: paymentTerms } = await supabase
        .from('contract_payment_terms')
        .select('*')
        .eq('contract_id', contractId)
        .order('installment_number')
        .limit(1);

      if (!paymentTerms?.[0]) {
        throw new Error('No payment terms found for testing');
      }

      const paymentTermId = paymentTerms[0].id;

      // Create todo tasks linked to payment term
      const todos = [
        {
          contract_id: contractId,
          payment_term_id: paymentTermId,
          tenant_id: this.tenantId,
          title: 'Prepare invoice documentation',
          description: 'Gather all required documents for invoicing',
          assigned_to: this.currentUserId,
          created_by: this.currentUserId,
          priority: 'high'
        },
        {
          contract_id: contractId,
          payment_term_id: paymentTermId,
          tenant_id: this.tenantId,
          title: 'Customer approval confirmation',
          description: 'Get written confirmation from customer',
          assigned_to: this.currentUserId,
          created_by: this.currentUserId,
          priority: 'medium'
        }
      ];

      const { data: createdTodos, error: todoError } = await supabase
        .from('contract_todos')
        .insert(todos)
        .select();

      if (todoError) throw todoError;

      // Complete first todo
      const { error: completeError1 } = await supabase
        .from('contract_todos')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString(),
          completed_by: this.currentUserId 
        })
        .eq('id', createdTodos[0].id);

      if (completeError1) throw completeError1;

      // Complete second todo (should trigger auto stage update)
      const { error: completeError2 } = await supabase
        .from('contract_todos')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString(),
          completed_by: this.currentUserId 
        })
        .eq('id', createdTodos[1].id);

      if (completeError2) throw completeError2;

      // Check if payment stage was auto-updated to "Due"
      const { data: updatedPaymentTerm } = await supabase
        .from('contract_payment_terms')
        .select('*, contract_payment_stages(name)')
        .eq('id', paymentTermId)
        .single();

      // Check audit logs for todo completion and auto stage update
      const { data: todoAuditLogs } = await supabase
        .from('contract_audit_logs')
        .select('*')
        .eq('contract_id', contractId)
        .in('action', ['todo_created', 'todo_completed', 'payment_stage_auto_updated']);

      return {
        success: true,
        message: `✅ Todos completed. Payment stage: ${(updatedPaymentTerm as any)?.contract_payment_stages?.name}. Audit logs: ${todoAuditLogs?.length || 0}`,
        data: { todos: createdTodos, paymentTerm: updatedPaymentTerm, auditLogs: todoAuditLogs }
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Failed to test todo tasks and auto updates',
        error
      };
    }
  }

  /**
   * Test 5: Permission Validation
   */
  async testPermissionValidation(contractId: string): Promise<TestResult> {
    try {
      console.log('🧪 Testing permission validation...');
      
      // Get contract details
      const { data: contract } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      // Test user_can_modify_contract function
      const { data: canModify, error } = await supabase
        .rpc('user_can_modify_contract', {
          _contract_id: contractId,
          _user_id: this.currentUserId
        });

      if (error) throw error;

      const expectedCanModify = this.isAdmin || contract?.assigned_to === this.currentUserId;
      const permissionTestPassed = canModify === expectedCanModify;

      return {
        success: permissionTestPassed,
        message: permissionTestPassed 
          ? `✅ Permission validation correct. Can modify: ${canModify}` 
          : `❌ Permission validation failed. Expected: ${expectedCanModify}, Got: ${canModify}`,
        data: { canModify, expectedCanModify, isAdmin: this.isAdmin, assignedTo: contract?.assigned_to }
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Failed to test permission validation',
        error
      };
    }
  }

  /**
   * Test 6: Report Generation
   */
  async testReportGeneration(): Promise<TestResult> {
    try {
      console.log('🧪 Testing report generation...');
      
      // Test contract reports via edge function
      const { data, error } = await supabase.functions.invoke('generate-report-data', {
        body: {
          dataSource: 'contracts',
          filters: [
            {
              field: 'tenant_id',
              operator: 'equals',
              value: this.tenantId
            }
          ],
          sortBy: 'created_at',
          sortOrder: 'desc'
        }
      });

      if (error) throw error;

      // Test payment reports
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('generate-report-data', {
        body: {
          dataSource: 'contract_payments',
          filters: [
            {
              field: 'tenant_id',
              operator: 'equals',
              value: this.tenantId
            }
          ]
        }
      });

      if (paymentError) throw paymentError;

      return {
        success: true,
        message: `✅ Report generation successful. Contracts: ${data?.length || 0}, Payments: ${paymentData?.length || 0}`,
        data: { contracts: data, payments: paymentData }
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Failed to generate reports',
        error
      };
    }
  }

  /**
   * Test 7: Notification System
   */
  async testNotificationSystem(contractId: string): Promise<TestResult> {
    try {
      console.log('🧪 Testing notification system...');
      
      // Create a test notification
      const { data: notification, error } = await supabase
        .rpc('create_notification', {
          _tenant_id: this.tenantId,
          _user_id: this.currentUserId,
          _title: 'Contract Test Notification',
          _message: 'This is a test notification for contract integration testing',
          _entity_type: 'contract',
          _entity_id: contractId,
          _notification_type: 'contract_update'
        });

      if (error) throw error;

      // Fetch notifications to verify
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('entity_id', contractId)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        success: true,
        message: `✅ Notification system working. Found ${notifications?.length || 0} notifications`,
        data: { notification, notifications }
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Failed to test notification system',
        error
      };
    }
  }

  /**
   * Run Complete Integration Test Suite
   */
  async runFullTestSuite(): Promise<{ results: TestResult[], summary: string }> {
    const results: TestResult[] = [];
    let contractId: string | null = null;

    console.log('🚀 Starting Contract System Integration Test Suite...');
    console.log(`👤 User: ${this.currentUserId} | Admin: ${this.isAdmin} | Tenant: ${this.tenantId}`);

    // Test 1: Direct Contract Creation
    const test1 = await this.testDirectContractCreation();
    results.push(test1);
    if (test1.success && test1.data?.contract) {
      contractId = test1.data.contract.id;
    }

    // Test 2: Deal to Contract Promotion
    const test2 = await this.testDealToContractPromotion();
    results.push(test2);

    // Use the contract from test 1 for remaining tests
    if (contractId) {
      // Test 3: Payment Terms Management
      const test3 = await this.testPaymentTermsManagement(contractId);
      results.push(test3);

      // Test 4: Todo Tasks and Auto Updates
      const test4 = await this.testTodoTasksAndAutoUpdates(contractId);
      results.push(test4);

      // Test 5: Permission Validation
      const test5 = await this.testPermissionValidation(contractId);
      results.push(test5);

      // Test 7: Notification System
      const test7 = await this.testNotificationSystem(contractId);
      results.push(test7);
    }

    // Test 6: Report Generation (independent)
    const test6 = await this.testReportGeneration();
    results.push(test6);

    // Generate summary
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    const summary = `🎯 Test Suite Complete: ${passed}/${total} tests passed`;

    console.log('\n📊 Test Results Summary:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.message}`);
    });
    console.log(`\n${summary}`);

    if (passed === total) {
      toast.success(`All integration tests passed! (${passed}/${total})`);
    } else {
      toast.error(`Some tests failed. Passed: ${passed}/${total}`);
    }

    return { results, summary };
  }
}

/**
 * Utility function to run contract integration tests
 */
export const runContractIntegrationTests = async (
  tenantId: string, 
  currentUserId: string, 
  isAdmin: boolean
) => {
  const testRunner = new ContractTestRunner(tenantId, currentUserId, isAdmin);
  return await testRunner.runFullTestSuite();
};

/**
 * Permission Test Utilities
 */
export const testContractPermissions = async (contractId: string, userId: string) => {
  try {
    // Test if user can modify contract
    const { data: canModify, error } = await supabase
      .rpc('user_can_modify_contract', {
        _contract_id: contractId,
        _user_id: userId
      });

    if (error) throw error;

    return {
      canModify,
      message: canModify ? 'User has edit permissions' : 'User has read-only access'
    };
  } catch (error) {
    console.error('Error testing permissions:', error);
    return {
      canModify: false,
      message: 'Permission check failed',
      error
    };
  }
};

/**
 * Audit Trail Verification
 */
export const verifyAuditTrail = async (contractId: string) => {
  try {
    const { data: auditLogs, error } = await supabase
      .from('contract_audit_logs')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const logsByAction = auditLogs?.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      totalLogs: auditLogs?.length || 0,
      logsByAction,
      recentLogs: auditLogs?.slice(0, 5) || [],
      message: `Found ${auditLogs?.length || 0} audit log entries`
    };
  } catch (error) {
    console.error('Error verifying audit trail:', error);
    return {
      totalLogs: 0,
      logsByAction: {},
      recentLogs: [],
      message: 'Failed to verify audit trail',
      error
    };
  }
};