import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

const invitationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.string().min(1, "Role is required"),
})

type InvitationFormData = z.infer<typeof invitationSchema>

interface CustomRole {
  id: string
  name: string
  description: string
  permissions: any
}

interface CreateUserModalProps {
  open: boolean
  onClose: () => void
  tenantId: string
  onSuccess: () => void
}

export function CreateUserModal({ open, onClose, tenantId, onSuccess }: CreateUserModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([])
  const { toast } = useToast()

  const form = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      role: "",
    },
  })

  // Fetch custom roles for this tenant
  useEffect(() => {
    if (!open || !tenantId) return

    const fetchCustomRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('custom_roles')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('active', true)
          .order('name')

        if (error) throw error
        setCustomRoles(data || [])
      } catch (error) {
        console.error('Error fetching custom roles:', error)
      }
    }

    fetchCustomRoles()
  }, [open, tenantId])

  const onSubmit = async (formData: InvitationFormData) => {
    if (!tenantId) return
    
    setIsLoading(true)
    try {
      const { data: result, error } = await supabase.functions.invoke('send-tenant-invitation', {
        body: {
          email: formData.email,
          role: formData.role.startsWith('custom_') ? 'member' : formData.role,
          custom_role_id: formData.role.startsWith('custom_') ? formData.role.replace('custom_', '') : null,
          tenant_id: tenantId
        }
      })

      if (error) {
        console.error('Error sending invitation:', error)
        toast({
          title: "Error",
          description: error.message || "Failed to send invitation. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Invitation sent successfully! The user will receive an email with instructions to join.",
      })

      form.reset()
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      {customRoles.map((role) => (
                        <SelectItem key={role.id} value={`custom_${role.id}`}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}