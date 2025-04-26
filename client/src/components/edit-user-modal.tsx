import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { updateUser, getUserRole } from "@/lib/jellyfin";
import { queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { X } from "lucide-react";

interface EditUserModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
}

const formSchema = z.object({
  Name: z.string().min(1, "Username is required"),
  Password: z.string().optional(),
  Role: z.enum(["Administrator", "User", "ContentManager"]),
  IsDisabled: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export default function EditUserModal({ isOpen, user, onClose }: EditUserModalProps) {
  const { toast } = useToast();
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Name: user.Name || "",
      Password: "",
      Role: getUserRole(user),
      IsDisabled: user.Policy?.IsDisabled || false,
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: FormData) => updateUser(user.Id, data),
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // Only include password in the update if it was provided
    const updateData = { ...data };
    if (!showPasswordReset || !updateData.Password) {
      delete updateData.Password;
    }
    
    updateUserMutation.mutate(updateData);
  };

  const handleTogglePasswordReset = () => {
    setShowPasswordReset(!showPasswordReset);
    if (!showPasswordReset) {
      form.setValue("Password", "");
    }
  };

  const handleClose = () => {
    if (!updateUserMutation.isPending) {
      setShowPasswordReset(false);
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Edit User</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={handleClose}
            disabled={updateUserMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="Name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={updateUserMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="Role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={updateUserMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Administrator">Administrator</SelectItem>
                      <SelectItem value="User">Regular User</SelectItem>
                      <SelectItem value="ContentManager">Content Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-neutral-800">Reset Password</div>
                <Button
                  type="button"
                  variant="link"
                  className="text-primary hover:text-primary-dark text-sm h-auto p-0"
                  onClick={handleTogglePasswordReset}
                  disabled={updateUserMutation.isPending}
                >
                  {showPasswordReset ? "Cancel Password Change" : "Change Password"}
                </Button>
              </div>
              
              {showPasswordReset && (
                <FormField
                  control={form.control}
                  name="Password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} disabled={updateUserMutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <FormField
              control={form.control}
              name="IsDisabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={updateUserMutation.isPending}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">Account Disabled</FormLabel>
                </FormItem>
              )}
            />
          
            <DialogFooter className="mt-6 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={updateUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary-dark text-white"
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-current"></div>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
