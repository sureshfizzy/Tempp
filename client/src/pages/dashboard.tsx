import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { getUsers, disconnectFromJellyfin, getConnectionStatus } from "@/lib/jellyfin";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, User, UserCheck, Settings, CheckCircle, Users, FileBarChart } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get Jellyfin connection status
  const connectionStatusQuery = useQuery({
    queryKey: ["/api/connection-status"],
    queryFn: getConnectionStatus,
    staleTime: 300000, // 5 minutes
  });

  // Get all users
  const usersQuery = useQuery({
    queryKey: ["/api/users"],
    queryFn: getUsers,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: disconnectFromJellyfin,
    onSuccess: (data) => {
      toast({
        title: "Disconnected",
        description: "You have been disconnected from the Jellyfin server",
      });
      
      // Redirect based on whether we have stored configuration
      if (data.configured) {
        // If we have config, go to login page
        setLocation("/login");
      } else {
        // If no config, go to onboarding page
        setLocation("/onboarding");
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

  // Count user types
  const adminCount = usersQuery.data?.filter(user => user.Policy?.IsAdministrator).length || 0;
  const regularUserCount = usersQuery.data?.length ? usersQuery.data.length - adminCount : 0;
  
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header/Nav */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Jellyfin User Management</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm flex items-center">
              <CheckCircle className="text-green-300 mr-1 h-4 w-4" />
              <span className="hidden md:inline">Connected to:</span>
              <span className="font-medium ml-1 max-w-xs truncate">
                {connectionStatusQuery.data?.serverUrl || "Jellyfin Server"}
              </span>
            </div>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span>Disconnect</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Sidebar and Main Content */}
      <div className="flex flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-white border-r shadow-sm p-4">
          <nav className="space-y-1">
            <Link to="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-primary bg-opacity-10 text-primary">
              <Settings className="mr-2 h-5 w-5" />
              Dashboard
            </Link>
            
            <Link to="/users" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100">
              <Users className="mr-2 h-5 w-5" />
              User Accounts
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-neutral-800">Dashboard</h2>
            <p className="text-neutral-600">Welcome to your Jellyfin user management dashboard</p>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <User className="h-5 w-5 mr-2 text-primary" />
                  Total Users
                </CardTitle>
                <CardDescription>All users on your Jellyfin server</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {usersQuery.isLoading ? (
                    <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    usersQuery.data?.length || 0
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <UserCheck className="h-5 w-5 mr-2 text-green-500" />
                  Admin Users
                </CardTitle>
                <CardDescription>Users with administrator access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {usersQuery.isLoading ? (
                    <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    adminCount
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <User className="h-5 w-5 mr-2 text-blue-500" />
                  Regular Users
                </CardTitle>
                <CardDescription>Users with standard access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {usersQuery.isLoading ? (
                    <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    regularUserCount
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invite System Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Invites</CardTitle>
              <CardDescription>Create and manage server joining invitations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-muted/50 rounded-md p-4">
                  <p className="text-muted-foreground text-sm">None</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Create</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">INVITE DURATION</h4>
                        <p className="text-xs text-muted-foreground mb-2">A specified amount of time after creation, the invite will expire.</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">MONTHS</label>
                            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                              <option>0</option>
                              <option>1</option>
                              <option>3</option>
                              <option>6</option>
                              <option>12</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">DAYS</label>
                            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                              <option>0</option>
                              <option>1</option>
                              <option>7</option>
                              <option>14</option>
                              <option>30</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">HOURS</label>
                            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                              <option>0</option>
                              <option>1</option>
                              <option>2</option>
                              <option>6</option>
                              <option>12</option>
                              <option>24</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">MINUTES</label>
                            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                              <option>0</option>
                              <option>15</option>
                              <option>30</option>
                              <option>45</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">USER EXPIRY</h4>
                        <div className="flex items-center mb-4">
                          <input type="checkbox" id="userExpiry" className="mr-2" />
                          <label htmlFor="userExpiry" className="text-sm">Enabled</label>
                        </div>
                        <p className="text-xs text-muted-foreground">A specified amount of time after each signup, the account will be disabled.</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">LABEL</h4>
                        <input type="text" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Label for this invite (optional)" />
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">USER LABEL</h4>
                        <p className="text-xs text-muted-foreground mb-2">Label to apply to users created with this invite.</p>
                        <input type="text" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="User label (optional)" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">NUMBER OF USES</h4>
                        <div className="flex items-center space-x-2">
                          <input type="number" min="1" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="1" />
                          <button className="rounded-md border border-input bg-background p-2">
                            <span className="text-xl">∞</span>
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">PROFILE</h4>
                        <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option>Basic Profile</option>
                          <option>Advanced Profile</option>
                          <option>Family Profile</option>
                        </select>
                      </div>
                      
                      <div className="flex justify-end mt-8">
                        <Button className="bg-primary text-white w-full mt-8">
                          CREATE
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Server Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Server Status</CardTitle>
              <CardDescription>Information about your Jellyfin server connection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-500">Server URL</span>
                    <span className="font-medium">{connectionStatusQuery.data?.serverUrl || "Not available"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-500">Connection Status</span>
                    <span className="font-medium flex items-center">
                      {connectionStatusQuery.data?.connected ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          Connected
                        </>
                      ) : (
                        <>
                          <span className="h-4 w-4 text-red-500 mr-1">●</span>
                          Disconnected
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/connection-status"] })}
                      className="mr-2"
                    >
                      Refresh Status
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={handleDisconnect}
                      disabled={disconnectMutation.isPending}
                    >
                      {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}