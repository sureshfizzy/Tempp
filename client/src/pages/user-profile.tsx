import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { getConnectionStatus, disconnectFromJellyfin } from "@/lib/jellyfin";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User as JellyfinUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User as UserIcon, CheckCircle, Clock, FileText, Film, Home } from "lucide-react";
import { formatDate } from "@/lib/jellyfin";

export default function UserProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get current user's info
  const userQuery = useQuery<JellyfinUser>({
    queryKey: ["/api/me"]
  });

  // Get connection status
  const connectionQuery = useQuery({
    queryKey: ["/api/connection-status"],
    queryFn: getConnectionStatus,
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

  // Redirect to login if not connected
  useEffect(() => {
    if (connectionQuery.data && !connectionQuery.data.connected) {
      setLocation("/login");
    }
  }, [connectionQuery.data, setLocation]);

  // Get user initials for avatar
  const getUserInitials = (name: string = "") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Mock data for recent activity
  const recentActivities = [
    { id: 1, type: "movie", name: "Inception", date: new Date(Date.now() - 86400000 * 2) },
    { id: 2, type: "series", name: "Stranger Things", date: new Date(Date.now() - 86400000 * 5) },
    { id: 3, type: "movie", name: "The Matrix", date: new Date(Date.now() - 86400000 * 10) },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-3">
            <Home className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Jellyfin User Profile</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm flex items-center">
              <CheckCircle className="text-green-300 mr-1 h-4 w-4" />
              <span className="hidden md:inline">Connected to:</span>
              <span className="font-medium ml-1 max-w-xs truncate">
                {connectionQuery.data?.url || "Jellyfin Server"}
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
        {userQuery.isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : userQuery.error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-500">Failed to load user profile. Please try logging in again.</p>
              <Button onClick={() => setLocation("/login")} className="mt-4">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Profile Card */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-0 pt-6 px-6 flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={userQuery.data?.PrimaryImageTag ? `/api/users/${userQuery.data.Id}/image` : undefined} />
                  <AvatarFallback className="text-lg">
                    {getUserInitials(userQuery.data?.Name || "")}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl text-center">{userQuery.data?.Name}</CardTitle>
                <CardDescription className="text-center">
                  {userQuery.data?.Policy?.IsAdministrator ? "Administrator" : "Regular User"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-sm text-gray-500 mb-2">ACCOUNT DETAILS</h3>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <UserIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                        <div>
                          <p className="font-medium">Username</p>
                          <p className="text-sm text-gray-600">{userQuery.data?.Name}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Clock className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                        <div>
                          <p className="font-medium">Last Active</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(userQuery.data?.LastActivityDate || "")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 p-6 border-t">
                <Button variant="outline" className="w-full" onClick={handleDisconnect}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </CardFooter>
            </Card>

            {/* Activity and Preferences */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Your recent Jellyfin activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start border-b pb-4 last:border-0 last:pb-0">
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mr-4">
                          <Film className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{activity.name}</p>
                          <p className="text-sm text-gray-500">
                            {activity.type === "movie" ? "Watched movie" : "Watched episode"} • {formatDate(activity.date.toISOString())}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your Jellyfin account settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button variant="outline" className="w-full justify-start">
                      Change Password
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Notification Preferences
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Display Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}