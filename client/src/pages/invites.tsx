import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AppHeader } from "@/components/app-header";
import { ClipboardCopy, Plus, Trash2 } from "lucide-react";
import { FormDescription } from "@/components/ui/form";

// Define the invite schema
const inviteSchema = z.object({
  label: z.string().optional(),
  userLabel: z.string().optional(),
  months: z.coerce.number().int().nonnegative().default(0),
  days: z.coerce.number().int().nonnegative().default(0),
  hours: z.coerce.number().int().nonnegative().default(24),
  minutes: z.coerce.number().int().nonnegative().default(0),
  maxUses: z.coerce.number().int().nonnegative().default(1),
  userExpiryEnabled: z.boolean().default(false),
  userExpiryHours: z.coerce.number().int().nonnegative().default(0),
  profileId: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

// Define the invite type from the API
interface Invite {
  id: number;
  code: string;
  label: string | null;
  userLabel: string | null;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  userExpiryEnabled: boolean;
  userExpiryHours: number;
  profileId: string | null;
}

export default function InvitesPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Fetch all invites
  const { data: invites, isLoading, isError } = useQuery<Invite[]>({
    queryKey: ["/api/invites"],
    queryFn: async () => {
      const response = await fetch("/api/invites");
      
      if (!response.ok) {
        throw new Error(`Error fetching invites: ${response.statusText}`);
      }
      
      return await response.json();
    },
  });

  // Create a new invite
  const createInviteMutation = useMutation({
    mutationFn: (inviteData: InviteFormData) => 
      apiRequest("POST", "/api/invites", inviteData)
        .then(response => {
          if (!response.ok) {
            return response.json().then(errorData => {
              throw new Error(errorData.message || "Failed to create invite");
            });
          }
          return response.json();
        }),
    onSuccess: (newInvite: Invite) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      
      // Generate invite URL for sharing
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/onboarding?code=${newInvite.code}`;
      setInviteUrl(inviteUrl);
      
      toast({
        title: "Invite created",
        description: "The invite has been created successfully.",
      });
      
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create invite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete an invite
  const deleteInviteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/invites/${id}`)
        .then(response => {
          if (!response.ok) {
            return response.json().then(errorData => {
              throw new Error(errorData.message || "Failed to delete invite");
            });
          }
          return true;
        }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      
      toast({
        title: "Invite deleted",
        description: "The invite has been deleted successfully.",
      });
      
      setDeleteDialogOpen(false);
      setSelectedInvite(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete invite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for creating invites
  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      label: "",
      userLabel: "",
      months: 0,
      days: 0,
      hours: 24,
      minutes: 0,
      maxUses: 1,
      userExpiryEnabled: false,
      userExpiryHours: 0,
    },
  });

  const onSubmit = (data: InviteFormData) => {
    createInviteMutation.mutate(data);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format the expiration date
  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Calculate if an invite is expired
  const isExpired = (invite: Invite) => {
    const now = new Date();
    const expiryDate = new Date(invite.expiresAt);
    return expiryDate < now;
  };

  // Calculate if an invite is fully used
  const isFullyUsed = (invite: Invite) => {
    return invite.maxUses !== 0 && invite.usedCount >= invite.maxUses;
  };

  // Helper to determine invite status
  const getInviteStatus = (invite: Invite) => {
    if (isExpired(invite)) return "Expired";
    if (isFullyUsed(invite)) return "Fully Used";
    return "Active";
  };

  // Get appropriate status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "text-green-500";
      case "Expired":
        return "text-red-500";
      case "Fully Used":
        return "text-orange-500";
      default:
        return "text-gray-500";
    }
  };

  // Function to handle disconnection
  const handleDisconnect = async () => {
    try {
      const response = await fetch("/api/disconnect", { method: "POST" });
      if (response.ok) {
        window.location.href = "/login";
      } else {
        toast({
          title: "Error",
          description: "Failed to disconnect.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // Get current user info
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/me'],
    queryFn: async () => {
      const res = await fetch('/api/me');
      if (!res.ok) {
        throw new Error('Failed to fetch user info');
      }
      return res.json();
    }
  });

  return (
    <div className="container mx-auto py-6">
      <AppHeader
        title="Server Invites"
        subtitle="Create and manage invites to your Jellyfin server"
        user={user}
        onDisconnect={handleDisconnect}
        isDisconnecting={false}
        isAdmin={user?.isAdmin}
      />

      <div className="mt-8 mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Server Invites</h1>
        <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus size={16} /> New Invite
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : isError ? (
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Error loading invites</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/invites"] })}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : invites && invites.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {invites.map((invite) => {
            const status = getInviteStatus(invite);
            const statusColor = getStatusColor(status);
            
            return (
              <Card key={invite.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{invite.label || `Invite #${invite.id}`}</CardTitle>
                      <CardDescription>
                        Created by {invite.createdBy} on {new Date(invite.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedInvite(invite);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Code:</span>
                      <span className="font-medium truncate">{invite.code}</span>
                      
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`font-medium ${statusColor}`}>{status}</span>
                      
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium">{formatExpiryDate(invite.expiresAt)}</span>
                      
                      <span className="text-muted-foreground">Usage:</span>
                      <span className="font-medium">{invite.usedCount} / {invite.maxUses || '∞'}</span>
                      
                      {invite.userLabel && (
                        <>
                          <span className="text-muted-foreground">For User:</span>
                          <span className="font-medium">{invite.userLabel}</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const baseUrl = window.location.origin;
                      const inviteUrl = `${baseUrl}/onboarding?code=${invite.code}`;
                      navigator.clipboard.writeText(inviteUrl);
                      toast({
                        title: "Copied to clipboard",
                        description: "The invite link has been copied to your clipboard.",
                      });
                    }}
                  >
                    <ClipboardCopy size={14} className="mr-2" /> Copy Invite Link
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">No invites found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setCreateDialogOpen(true)}
              >
                Create your first invite
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Invite Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Invite</DialogTitle>
            <DialogDescription>
              Create a new invitation link for users to join your Jellyfin server.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label (Internal)</FormLabel>
                    <FormControl>
                      <Input placeholder="Spring 2025 Invites" {...field} />
                    </FormControl>
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
                      <Input placeholder="Friend's name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Months</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minutes</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="maxUses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Uses (0 for unlimited)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="userExpiryEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Enable User Expiry</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Automatically expire the user account after a certain period
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {form.watch("userExpiryEnabled") && (
                <FormField
                  control={form.control}
                  name="userExpiryHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Expiry (Hours)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createInviteMutation.isPending}
                >
                  {createInviteMutation.isPending ? "Creating..." : "Create Invite"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invite</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invite? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteInviteMutation.isPending}
              onClick={() => {
                if (selectedInvite) {
                  deleteInviteMutation.mutate(selectedInvite.id);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteInviteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Created Dialog */}
      <Dialog open={Boolean(inviteUrl)} onOpenChange={(open) => !open && setInviteUrl("")}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite Created</DialogTitle>
            <DialogDescription>
              Your invite has been created successfully. Copy the link below to share with others.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input
              value={inviteUrl}
              readOnly
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
            >
              <ClipboardCopy size={16} />
            </Button>
          </div>
          {copied && (
            <p className="text-sm text-green-500">Copied to clipboard!</p>
          )}
          <DialogFooter>
            <Button
              onClick={() => setInviteUrl("")}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}