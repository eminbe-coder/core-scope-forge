import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  FileText, 
  DollarSign, 
  Bell,
  BarChart3,
  Users,
  Database
} from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { 
  runContractIntegrationTests, 
  testContractPermissions, 
  verifyAuditTrail,
  type TestResult 
} from '@/utils/contract-test-utils';
import { toast } from 'sonner';

export const ContractTestDashboard = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { isAdmin } = usePermissions();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<string>('');

  const runFullTestSuite = async () => {
    if (!user?.id || !currentTenant?.id) {
      toast.error('User or tenant not available for testing');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setTestResults([]);
    setSummary('');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const { results, summary } = await runContractIntegrationTests(
        currentTenant.id,
        user.id,
        isAdmin
      );

      clearInterval(progressInterval);
      setProgress(100);
      setTestResults(results);
      setSummary(summary);
    } catch (error) {
      console.error('Test suite failed:', error);
      toast.error('Test suite execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const getTestIcon = (success: boolean, isRunning: boolean) => {
    if (isRunning) return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
    return success ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getTestStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"} className="text-xs">
        {success ? "PASS" : "FAIL"}
      </Badge>
    );
  };

  const testCategories = [
    {
      id: 'contracts',
      name: 'Contract Operations',
      icon: <FileText className="h-5 w-5" />,
      description: 'Test contract creation, promotion from deals, and basic operations',
      tests: ['Direct Contract Creation', 'Deal to Contract Promotion']
    },
    {
      id: 'payments',
      name: 'Payment Management', 
      icon: <DollarSign className="h-5 w-5" />,
      description: 'Test payment terms, installments, and stage management',
      tests: ['Payment Terms Management', 'Todo Tasks and Auto Updates']
    },
    {
      id: 'permissions',
      name: 'Security & Permissions',
      icon: <Shield className="h-5 w-5" />,
      description: 'Verify user permissions and access controls',
      tests: ['Permission Validation']
    },
    {
      id: 'reporting',
      name: 'Reporting Engine',
      icon: <BarChart3 className="h-5 w-5" />,
      description: 'Test report generation and data export functionality',
      tests: ['Report Generation']
    },
    {
      id: 'notifications',
      name: 'Notification System',
      icon: <Bell className="h-5 w-5" />,
      description: 'Verify notification creation and delivery',
      tests: ['Notification System']
    }
  ];

  const passedTests = testResults.filter(r => r.success).length;
  const totalTests = testResults.length;
  const testsPassed = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contract System Integration Tests</h1>
          <p className="text-muted-foreground">
            Comprehensive testing suite for contract workflows, permissions, and audit trails
          </p>
        </div>
        <Button 
          onClick={runFullTestSuite} 
          disabled={isRunning}
          className="min-w-[120px]"
        >
          {isRunning ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Tests
            </>
          )}
        </Button>
      </div>

      {/* Test Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Test Environment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm">{user?.id || 'Not available'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tenant ID</p>
              <p className="font-mono text-sm">{currentTenant?.id || 'Not available'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User Role</p>
              <Badge variant={isAdmin ? "default" : "secondary"}>
                {isAdmin ? 'Admin' : 'Standard User'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Running integration tests...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Test Results Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{passedTests}</div>
                <div className="text-sm text-muted-foreground">Tests Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{totalTests - passedTests}</div>
                <div className="text-sm text-muted-foreground">Tests Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Math.round(testsPassed)}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
            
            {summary && (
              <Alert>
                <AlertDescription>{summary}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Categories and Results */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Test Overview</TabsTrigger>
          <TabsTrigger value="results">Detailed Results</TabsTrigger>
          <TabsTrigger value="categories">Test Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {category.icon}
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">
                    {category.description}
                  </p>
                  <div className="space-y-1">
                    {category.tests.map((test) => {
                      const result = testResults.find(r => r.message.includes(test.split(' ')[0]));
                      return (
                        <div key={test} className="flex items-center justify-between text-xs">
                          <span>{test}</span>
                          {result && getTestStatusBadge(result.success)}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {testResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No test results available. Run the test suite to see results.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getTestIcon(result.success, false)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">Test {index + 1}</h4>
                            {getTestStatusBadge(result.success)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {result.message}
                          </p>
                          
                          {result.error && (
                            <Alert className="mt-2">
                              <AlertDescription className="text-xs">
                                <strong>Error:</strong> {JSON.stringify(result.error, null, 2)}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {result.data && (
                            <details className="mt-2">
                              <summary className="text-xs text-muted-foreground cursor-pointer">
                                View test data
                              </summary>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {testCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category.icon}
                    {category.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Covered Tests:</h4>
                    <ul className="space-y-1">
                      {category.tests.map((test) => (
                        <li key={test} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          {test}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Quick Test Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start">
              <Shield className="h-4 w-4 mr-2" />
              Test Current User Permissions
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Verify Audit Trail Integrity
            </Button>
            <Button variant="outline" className="justify-start">
              <Bell className="h-4 w-4 mr-2" />
              Test Notification Delivery
            </Button>
            <Button variant="outline" className="justify-start">
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Test Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};