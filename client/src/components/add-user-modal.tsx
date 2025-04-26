import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { NewUser } from "@shared/schema";
import { createUser } from "@/lib/jellyfin";
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

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  Name: z.string().min(1, "Username is required"),
  Password: z.string().min(6, "Password must be at least 6 characters"),
  Email: z.string().email("Invalid email address").optional().or(z.literal("")),
  Role: z.enum(["Administrator", "User", "ContentManager"]),
  IsDisabled: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export default function AddUserModal({ isOpen, onClose }: AddUserModalProps) {
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Name: "",
      Password: "",
      Email: "",
      Role: "User",
      IsDisabled: false,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The user has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createUserMutation.mutate(data);
  };

  const handleClose = () => {
    if (!createUserMutation.isPending) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Add New User</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={handleClose}
            disabled={createUserMutation.isPending}
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
                    <Input {...field} disabled={createUserMutation.isPending} />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} disabled={createUserMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="Email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={createUserMutation.isPending} />
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
                    disabled={createUserMutation.isPending}
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
            
            <FormField
              control={form.control}
              name="IsDisabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={createUserMutation.isPending}
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
                disabled={createUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary-dark text-white"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-current"></div>
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
