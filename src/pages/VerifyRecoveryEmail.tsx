import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const VerifyRecoveryEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyToken(token);
    } else {
      setStatus('error');
      setMessage('No verification token provided.');
    }
  }, [searchParams]);

  const verifyToken = async (token: string) => {
    try {
      const response = await supabase.functions.invoke('verify-recovery-email', {
        body: { token },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Verification failed');
      }

      setStatus('success');
      setMessage('Your recovery email has been verified successfully!');
      setRecoveryEmail(response.data.recoveryEmail || '');
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to verify recovery email.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle>Verifying...</CardTitle>
              <CardDescription>Please wait while we verify your recovery email.</CardDescription>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle>Email Verified!</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center">
          {status === 'success' && recoveryEmail && (
            <p className="text-sm text-muted-foreground mb-4">
              Recovery email: <strong>{recoveryEmail}</strong>
            </p>
          )}
          <Button onClick={() => navigate('/home')} className="w-full">
            Go to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyRecoveryEmail;
