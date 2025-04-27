import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarRange, UserCog, Clock, Check } from "lucide-react";

// Form schema for invite creation
const inviteFormSchema = z.object({
  label: z.string().optional(),
  userLabel: z.string().optional(),
  profileId: z.string().optional(),
  
  // Invite duration tab fields
  maxUses: z.number().nullable().optional(),
  userExpiryEnabled: z.boolean().optional(),
  
  // User expiry tab fields
  userExpiryHours: z.number().min(0).optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  userProfiles?: Array<{
    id: number;
    name: string;
  }>;
}

export function InviteForm({ onSuccess, onCancel, userProfiles = [] }: InviteFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("duration");
  const queryClient = useQueryClient();
  
  // Default form values
  const defaultValues: Partial<InviteFormValues> = {
    label: "",
    userLabel: "",
    profileId: "",
    maxUses: 1,
    userExpiryEnabled: false,
    userExpiryHours: 24,
  };
  
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues,
  });
  
  // Watch the unlimited uses switch to toggle maxUses field
  const watchUnlimitedUses = form.watch("maxUses") === null;
  
  // Watch user expiry switch to toggle expiry fields
  const watchUserExpiryEnabled = form.watch("userExpiryEnabled");
  
  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      return await apiRequest<{ code: string; }>("/api/invites", data);
    },
    onSuccess: () => {
      toast({
        title: "Invite created",
        description: "The invite has been created successfully.",
        variant: "default",
      });
      
      // Reset the form
      form.reset(defaultValues);
      
      // Invalidate the invites query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      
      // Call the onSuccess callback if provided
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error creating invite",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Submit handler
  const onSubmit = (data: InviteFormValues) => {
    createInviteMutation.mutateAsync(data);
  };
  
  // Toggle unlimited uses
  const toggleUnlimitedUses = (enable: boolean) => {
    if (enable) {
      form.setValue("maxUses", null);
    } else {
      form.setValue("maxUses", 1);
    }
  };
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="duration" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="duration" className="flex items-center">
            <CalendarRange className="h-4 w-4 mr-2" />
            Invite Duration
          </TabsTrigger>
          <TabsTrigger value="user-expiry" className="flex items-center">
            <UserCog className="h-4 w-4 mr-2" />
            User Expiry
          </TabsTrigger>
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            {/* Common fields - always shown */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invite Label</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Optional label for this invite (admin only)"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Internal note for this invite (only visible to admins)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="userLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Label</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Optional label for the user"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Name of the person this invite is for (shown to the user)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="profileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Profile</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a profile or leave empty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No profile (default)</SelectItem>
                        {userProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id.toString()}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Assign a pre-configured user profile (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <TabsContent value="duration" className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Invite Duration Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure how long this invite link will be valid and how many times it can be used.
              </p>
              
              <div className="flex items-center justify-between space-x-2 py-4">
                <Label htmlFor="unlimited-uses" className="flex flex-col space-y-1">
                  <span>Unlimited Uses</span>
                  <span className="font-normal text-xs text-muted-foreground">
                    Allow this invite to be used unlimited times
                  </span>
                </Label>
                <Switch
                  id="unlimited-uses"
                  checked={watchUnlimitedUses}
                  onCheckedChange={toggleUnlimitedUses}
                />
              </div>
              
              {!watchUnlimitedUses && (
                <FormField
                  control={form.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Uses</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? 1 : parseInt(e.target.value, 10);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        How many times this invite can be used
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </TabsContent>
            
            <TabsContent value="user-expiry" className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">User Expiry Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure if accounts created with this invite will automatically expire.
              </p>
              
              <div className="flex items-center justify-between space-x-2 py-4">
                <Label htmlFor="user-expiry" className="flex flex-col space-y-1">
                  <span>Enable User Expiry</span>
                  <span className="font-normal text-xs text-muted-foreground">
                    Accounts created with this invite will be disabled after the specified time
                  </span>
                </Label>
                <FormField
                  control={form.control}
                  name="userExpiryEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          id="user-expiry"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              {watchUserExpiryEnabled && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="userExpiryHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => {
                                const value = parseInt(e.target.value, 10) || 0;
                                field.onChange(value);
                              }}
                            />
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Hours until the user account expires
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </TabsContent>
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit"
                disabled={createInviteMutation.isPending}
                className="flex items-center"
              >
                {createInviteMutation.isPending ? (
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent rounded-full" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Create Invite
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}