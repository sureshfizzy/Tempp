import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getUsers, disconnectFromJellyfin, getConnectionStatus } from "@/lib/jellyfin";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, User, UserCheck, Settings, CheckCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

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
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "You have been disconnected from the Jellyfin server",
      });
      setLocation("/");
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
                {connectionStatusQuery.data?.url || "Jellyfin Server"}
              </span>
            </div>
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
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
                  <span className="font-medium">{connectionStatusQuery.data?.url || "Not available"}</span>
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
  );
}