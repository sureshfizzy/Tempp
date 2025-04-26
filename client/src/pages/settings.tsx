import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { getConnectionStatus } from "@/lib/jellyfin";
import { apiRequest } from "@/lib/queryClient";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Upload, Server, Brush, Globe, Users, AlertTriangle } from "lucide-react";
import { AppHeader } from "@/components/app-header";

// Define a form schema for server settings
const serverSettingsSchema = z.object({
  serverName: z.string().min(1, {
    message: "Server name is required",
  }),
  serverUrl: z.string().url({
    message: "Please enter a valid URL",
  }),
  apiKey: z.string().min(1, {
    message: "API Key is required",
  }),
  logoUrl: z.string().url({
    message: "Please enter a valid URL",
  }).optional().or(z.literal('')),
  enableThemeSwitcher: z.boolean().default(true),
  enableWatchHistory: z.boolean().default(true),
  enableActivityLog: z.boolean().default(true),
  inviteDuration: z.coerce.number().min(1, {
    message: "Duration must be at least 1 hour"
  }).default(24)
});

type ServerSettingsFormValues = z.infer<typeof serverSettingsSchema>;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("server");
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Get connection status
  const connectionQuery = useQuery({
    queryKey: ["/api/connection-status"],
    queryFn: getConnectionStatus,
  });

  // Get user data to check if admin
  const userQuery = useQuery<{
    id: number;
    username: string;
    email: string;
    isAdmin: boolean;
    jellyfinUserId: string;
  }>({
    queryKey: ["/api/me"],
  });

  // Get server settings
  const serverQuery = useQuery({
    queryKey: ["/api/system/status"],
    queryFn: async () => {
      const response = await fetch("/api/system/status");
      if (!response.ok) {
        throw new Error("Failed to fetch server settings");
      }
      return response.json();
    },
  });

  // Form
  const form = useForm<ServerSettingsFormValues>({
    resolver: zodResolver(serverSettingsSchema),
    defaultValues: {
      serverName: serverQuery.data?.serverName || "",
      serverUrl: serverQuery.data?.url || "",
      apiKey: serverQuery.data?.apiKey || "",
      logoUrl: serverQuery.data?.logoUrl || "",
      enableThemeSwitcher: serverQuery.data?.features?.enableThemeSwitcher ?? true,
      enableWatchHistory: serverQuery.data?.features?.enableWatchHistory ?? true,
      enableActivityLog: serverQuery.data?.features?.enableActivityLog ?? true,
      inviteDuration: serverQuery.data?.inviteDuration || 24
    }
  });

  // Update form values when server data is loaded
  useEffect(() => {
    if (serverQuery.data) {
      form.reset({
        serverName: serverQuery.data.serverName || "",
        serverUrl: serverQuery.data.url || "",
        apiKey: serverQuery.data.apiKey || "",
        logoUrl: serverQuery.data?.logoUrl || "",
        enableThemeSwitcher: serverQuery.data?.features?.enableThemeSwitcher ?? true,
        enableWatchHistory: serverQuery.data?.features?.enableWatchHistory ?? true,
        enableActivityLog: serverQuery.data?.features?.enableActivityLog ?? true,
        inviteDuration: serverQuery.data?.inviteDuration || 24
      });
    }
  }, [serverQuery.data, form]);

  // Check if user is admin
  useEffect(() => {
    if (userQuery.data && !userQuery.data.isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access settings.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [userQuery.data, navigate, toast]);

  // Redirect to login if not connected
  useEffect(() => {
    if (connectionQuery.data && !connectionQuery.data.connected) {
      navigate("/login");
    }
  }, [connectionQuery.data, navigate]);

  // Mutation for saving server settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: ServerSettingsFormValues) => {
      try {
        const response = await fetch("/api/system/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to update settings");
        }
        
        return await response.json();
      } catch (error) {
        console.error("Settings update error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/status"] });
      toast({
        title: "Settings updated",
        description: "Server settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/disconnect", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Disconnected",
        description: "You have been disconnected from the Jellyfin server",
      });
      
      // Redirect based on whether we have stored configuration
      if (data.configured) {
        navigate("/login");
      } else {
        navigate("/onboarding");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect",
        variant: "destructive",
      });
    },
  });

  // Handle disconnect
  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  // Handle form submission
  function onSubmit(data: ServerSettingsFormValues) {
    updateSettingsMutation.mutate(data);
  }

  if (userQuery.isLoading || connectionQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (userQuery.error || !userQuery.data?.isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate("/")}>
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="Jellyfin User Management"
        subtitle={connectionQuery.data?.url}
        user={userQuery.data}
        onDisconnect={handleDisconnect}
        isDisconnecting={disconnectMutation.isPending}
        isAdmin={userQuery.data?.isAdmin}
      />

      {/* Main content */}
      <main className="container py-6">
        <div className="flex flex-col space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground mt-2">
              Manage your Jellyfin connection and application settings
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full md:w-auto mb-6">
              <TabsTrigger value="server" className="flex-1 md:flex-initial">
                <Server className="mr-2 h-4 w-4" />
                Server
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex-1 md:flex-initial">
                <Brush className="mr-2 h-4 w-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="invites" className="flex-1 md:flex-initial">
                <Users className="mr-2 h-4 w-4" />
                Invites
              </TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <TabsContent value="server" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Server Connection</CardTitle>
                      <CardDescription>
                        Configure your Jellyfin server connection settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="serverName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Server Name</FormLabel>
                            <FormControl>
                              <Input placeholder="My Jellyfin Server" {...field} />
                            </FormControl>
                            <FormDescription>
                              A friendly name for your Jellyfin server
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="serverUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Server URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://jellyfin.example.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              The base URL of your Jellyfin server
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormDescription>
                              The API key for your Jellyfin server
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="appearance" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Appearance</CardTitle>
                      <CardDescription>
                        Customize how the Jellyfin Manager looks
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Custom Logo URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/logo.png" {...field} />
                            </FormControl>
                            <FormDescription>
                              Optional: URL to a custom logo image
                            </FormDescription>
                            <FormMessage />
                            {field.value && (
                              <div className="mt-2 flex justify-center border rounded-md p-4 bg-muted/30">
                                <img 
                                  src={field.value} 
                                  alt="Logo Preview" 
                                  className="max-h-24 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWFsZXJ0LXRyaWFuZ2xlIj48cGF0aCBkPSJtMjEuNzMgMTgtOC04YTIgMiAwIDAgMC0yLjgyIDAgbC04IDhhMiAyIDAgMCAwIDAgMi44MmMuMzkuMzguOTIuNiAxLjQxLjZoMTZhMiAyIDAgMCAwIDEuNDEtMy40MloiPjwvcGF0aD48cGF0aCBkPSJNMTIgOXY0Ij48L3BhdGg+PHBhdGggZD0iTTEyIDE2di4wMSI+PC9wYXRoPjwvc3ZnPg==';
                                    toast({
                                      title: "Image error",
                                      description: "Could not load the logo image. Please check the URL."
                                    });
                                  }}
                                />
                              </div>
                            )}
                          </FormItem>
                        )}
                      />

                      <Separator className="my-4" />

                      <FormField
                        control={form.control}
                        name="enableThemeSwitcher"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Theme Switcher
                              </FormLabel>
                              <FormDescription>
                                Allow users to switch between light and dark mode
                              </FormDescription>
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

                      <FormField
                        control={form.control}
                        name="enableWatchHistory"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Watch History
                              </FormLabel>
                              <FormDescription>
                                Show watch history on user profiles
                              </FormDescription>
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

                      <FormField
                        control={form.control}
                        name="enableActivityLog"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Activity Log
                              </FormLabel>
                              <FormDescription>
                                Enable activity logging for admin view
                              </FormDescription>
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
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit" 
                        className="ml-auto"
                        disabled={updateSettingsMutation.isPending}
                      >
                        {updateSettingsMutation.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                            Saving...
                          </>
                        ) : (
                          "Save Appearance Settings"
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>

                <TabsContent value="invites" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Invite Settings</CardTitle>
                      <CardDescription>
                        Configure how invitations work
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="inviteDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Invite Duration (hours)</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormDescription>
                              How long invitations are valid for by default (in hours)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit" 
                        className="ml-auto"
                        disabled={updateSettingsMutation.isPending}
                      >
                        {updateSettingsMutation.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                            Saving...
                          </>
                        ) : (
                          "Save Invite Settings"
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                


                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateSettingsMutation.isPending || !form.formState.isDirty}
                    className="w-full md:w-auto"
                  >
                    {updateSettingsMutation.isPending ? (
                      <>
                        <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

// Helper for zod resolver with proper typing
const zodParser = zodResolver(serverSettingsSchema);