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

const setPasswordSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);

  const token = searchParams.get("token");

  const form = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!token) {
      toast({
        title: "Invalid Link",
        description: "No invitation token provided.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

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

  const onSubmit = async (formData: SetPasswordFormData) => {
    if (!token || !invitation) return;

    setIsLoading(true);
    
    try {
      // Update the user's password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (passwordError) {
        toast({
          title: "Error",
          description: "Failed to set password. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Now complete the invitation acceptance
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
          description: error.message || "Failed to complete setup. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome!",
        description: `Your password has been set and you've joined ${result.tenant_name}!`,
      });

      // Redirect to dashboard
      navigate("/");
    } catch (error) {
      console.error('Error setting password:', error);
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
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invitation.tenants.name}</strong> as a <strong>{invitation.role}</strong>.
            Please provide your details and set your password to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your password" {...field} />
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
        </CardContent>
      </Card>
    </div>
  );
}