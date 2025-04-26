import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { updateUser, getUserRole } from "@/lib/jellyfin";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

interface EditUserModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
}

const formSchema = z.object({
  Name: z.string().min(2, "Username must be at least 2 characters"),
  Password: z.string().min(5, "Password must be at least 5 characters").optional(),
  Role: z.enum(["Administrator", "User", "ContentManager"]),
  IsDisabled: z.boolean().default(false),
  Email: z.string().email("Please enter a valid email").optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditUserModal({ isOpen, user, onClose }: EditUserModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form with validation
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Name: user.Name,
      Password: "", // Don't populate password, require new one if changing
      Role: getUserRole(user),
      IsDisabled: user.Policy?.IsDisabled || false,
      Email: "",
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user && isOpen) {
      form.reset({
        Name: user.Name,
        Password: "", // Don't populate password
        Role: getUserRole(user),
        IsDisabled: user.Policy?.IsDisabled || false,
        Email: "",
      });
    }
  }, [user, form, isOpen]);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: FormData) => updateUser(user.Id, data),
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: FormData) => {
    // If password is empty, remove it from the submission
    const updatedData = { ...data };
    if (!updatedData.Password) {
      delete updatedData.Password;
    }
    
    setIsSubmitting(true);
    updateUserMutation.mutate(updatedData);
  };

  // Get user initials for avatar
  const getUserInitials = (name: string = "") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className="flex flex-col items-center">
            <Avatar className="h-16 w-16 mb-2">
              <AvatarFallback className="bg-primary text-white">
                {getUserInitials(user.Name)}
              </AvatarFallback>
            </Avatar>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update details for {user.Name}.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              <FormField
                control={form.control}
                name="Name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (Leave blank to keep unchanged)</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="New password" 
                        {...field} 
                        value={field.value || ''} 
                      />
                    </FormControl>
                    <FormDescription>
                      Only fill this if you want to change the password.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="Email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="email@example.com" 
                        {...field} 
                        value={field.value || ''} 
                      />
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
                    <FormLabel>User Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormDescription>
                      Administrators have full control over the server.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="IsDisabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Disable Account</FormLabel>
                      <FormDescription>
                        Disabled accounts cannot login or access media.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}