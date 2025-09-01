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
import { Loader2 } from "lucide-react";

const acceptInvitationSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
});

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [userExists, setUserExists] = useState(false);

  const token = searchParams.get("token");

  const form = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
    },
  });

  useEffect(() => {
    if (!token) {
      toast({
        title: "Invalid Invitation",
        description: "No invitation token provided.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Validate invitation token
    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    if (!token) return;

    try {
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

      // Check if user already exists
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email === data.email) {
        setUserExists(true);
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

  const onSubmit = async (formData: AcceptInvitationFormData) => {
    if (!token) return;

    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('accept-tenant-invitation', {
        body: {
          invitation_token: token,
          first_name: formData.first_name,
          last_name: formData.last_name,
        }
      });

      if (error) {
        console.error('Error accepting invitation:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to accept invitation. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Welcome to ${result.tenant_name}! You can now access the platform.`,
      });

      navigate("/");
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const acceptExistingUser = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('accept-tenant-invitation', {
        body: {
          invitation_token: token,
        }
      });

      if (error) {
        console.error('Error accepting invitation:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to accept invitation. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `You've been added to ${result.tenant_name}!`,
      });

      navigate("/");
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Validating invitation...</span>
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
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invitation.tenants.name}</strong> as a <strong>{invitation.role}</strong>.
            {!userExists && " Please provide your details to complete your account setup."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userExists ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You're already signed in. Click below to accept the invitation and join this tenant.
              </p>
              <Button onClick={acceptExistingUser} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
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

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing Setup...
                    </>
                  ) : (
                    "Complete Account Setup"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}