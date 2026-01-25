import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Link as LinkIcon, ArrowLeft, Mail } from "lucide-react";

const createAccountSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type CreateAccountFormData = z.infer<typeof createAccountSchema>;

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

type ClaimMode = "choose" | "create" | "link" | "linking";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [mode, setMode] = useState<ClaimMode>("choose");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const token = searchParams.get("token");

  const createForm = useForm<CreateAccountFormData>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      password: "",
      confirm_password: "",
    },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    // Handle Supabase auth callback - check for access_token in URL hash
    const handleAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        console.log('Found access token in URL, setting session...');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (error) {
          console.error('Error setting session from URL:', error);
        } else {
          console.log('Session set successfully:', data.user?.email);
          setCurrentUser(data.user);
          // Clean up the URL hash
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    };

    handleAuthCallback().then(() => {
      if (!token) {
        toast({
          title: "Invalid Invitation",
          description: "No invitation token provided.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      validateInvitation();
    });
  }, [token]);

  const validateInvitation = async () => {
    if (!token) return;

    try {
      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data, error } = await supabase
        .from('tenant_invitations')
        .select(`
          *,
          tenants (name),
          custom_roles (name)
        `)
        .eq('invitation_token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        toast({
          title: "Invalid Invitation",
          description: "This invitation is invalid or has expired.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      setInvitation(data);

      // If user is logged in and their primary email matches, auto-accept
      if (user && user.email === data.email) {
        setMode("linking");
        await linkToCurrentAccount();
      }

    } catch (error) {
      console.error('Error validating invitation:', error);
      toast({
        title: "Error",
        description: "Failed to validate invitation.",
        variant: "destructive",
      });
      navigate("/auth");
    } finally {
      setIsValidating(false);
    }
  };

  const linkToCurrentAccount = async () => {
    if (!token || !currentUser) return;

    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('link-invitation-to-account', {
        body: {
          invitation_token: token,
        }
      });

      if (error) {
        console.error('Error linking invitation:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to link invitation. Please try again.",
          variant: "destructive",
        });
        setMode("choose");
        return;
      }

      toast({
        title: "Success",
        description: `You've been added to ${result.tenant_name}! ${result.secondary_email_added ? `The email ${invitation?.email} has been linked to your account.` : ''}`,
      });

      navigate("/dashboard");
    } catch (error) {
      console.error('Error linking invitation:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setMode("choose");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkToExisting = async () => {
    if (currentUser) {
      // User is already logged in, directly link
      setMode("linking");
      await linkToCurrentAccount();
    } else {
      // User needs to log in first
      setMode("link");
    }
  };

  const handleLoginAndLink = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        toast({
          title: "Login Failed",
          description: authError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setCurrentUser(authData.user);

      // Now link the invitation
      const { data: result, error } = await supabase.functions.invoke('link-invitation-to-account', {
        body: {
          invitation_token: token,
        }
      });

      if (error) {
        console.error('Error linking invitation:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to link invitation. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `You've been added to ${result.tenant_name}! The email ${invitation?.email} has been linked to your account.`,
      });

      navigate("/dashboard");
    } catch (error) {
      console.error('Error during login and link:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateAccount = async (formData: CreateAccountFormData) => {
    if (!token || !invitation) return;

    setIsLoading(true);
    try {
      // Create new account via edge function
      const { data: result, error } = await supabase.functions.invoke('create-account-from-invitation', {
        body: {
          invitation_token: token,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password,
        }
      });

      if (error) {
        console.error('Error creating account:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to create account. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: formData.password,
      });

      if (signInError) {
        toast({
          title: "Account Created",
          description: "Your account was created. Please sign in.",
        });
        navigate("/auth");
        return;
      }

      toast({
        title: "Success",
        description: `Welcome to ${result.tenant_name}! Your account has been created.`,
      });

      navigate("/dashboard");
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating || mode === "linking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">
                {mode === "linking" ? "Linking invitation to your account..." : "Validating invitation..."}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Accept Your Invitation
          </CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invitation.tenants?.name}</strong> as a{" "}
            <strong>{invitation.custom_roles?.name || invitation.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "choose" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This invitation was sent to <strong>{invitation.email}</strong>. Choose how you'd like to proceed:
              </p>

              <div className="space-y-3">
                <Button
                  variant="default"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => setMode("create")}
                >
                  <UserPlus className="mr-3 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Create New Account</div>
                    <div className="text-sm text-primary-foreground/80">
                      Set up a new account with {invitation.email}
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={handleLinkToExisting}
                  disabled={isLoading}
                >
                  <LinkIcon className="mr-3 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Link to Existing Account</div>
                    <div className="text-sm text-muted-foreground">
                      {currentUser
                        ? `Link to ${currentUser.email}`
                        : "Connect this invitation to your existing account"}
                    </div>
                  </div>
                </Button>
              </div>

              {currentUser && (
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Currently signed in as {currentUser.email}
                </p>
              )}
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("choose")}
                className="mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <p className="text-sm text-muted-foreground">
                Create a new account for <strong>{invitation.email}</strong>
              </p>

              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateAccount)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}

          {mode === "link" && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("choose")}
                className="mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <p className="text-sm text-muted-foreground">
                Sign in to your existing account to link the invitation for <strong>{invitation.email}</strong>.
              </p>

              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLoginAndLink)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      "Sign In & Link Invitation"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
