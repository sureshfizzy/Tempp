import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { getConnectionStatus, disconnectFromJellyfin } from "@/lib/jellyfin";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User as JellyfinUser, UserActivity } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User as UserIcon, CheckCircle, Clock, FileBarChart, Film, Home } from "lucide-react";
import { formatDate } from "@/lib/jellyfin";
import { ThemeToggle } from "@/components/theme-toggle";

export default function UserProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get current user's info - appUser is different from JellyfinUser
  interface AppUser {
    id: number;
    username: string;
    email: string;
    isAdmin: boolean;
    jellyfinUserId: string;
  }
  
  const userQuery = useQuery<AppUser>({
    queryKey: ["/api/me"]
  });

  // Get connection status
  const connectionQuery = useQuery({
    queryKey: ["/api/connection-status"],
    queryFn: getConnectionStatus,
  });

  // Fetch watch history
  const watchHistoryQuery = useQuery<{ Items: UserActivity[], TotalRecordCount: number }>({
    queryKey: ["/api/users", userQuery.data?.jellyfinUserId, "watch-history"],
    queryFn: async () => {
      if (!userQuery.data?.jellyfinUserId) {
        console.log("No jellyfin user ID available for fetching watch history");
        return { Items: [], TotalRecordCount: 0 };
      }
      
      console.log(`Fetching watch history for Jellyfin user ID: ${userQuery.data.jellyfinUserId}`);
      const response = await fetch(`/api/users/${userQuery.data.jellyfinUserId}/watch-history?limit=10`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch watch history:', errorText);
        throw new Error(`Failed to fetch watch history: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Fetched watch history:", data);
      return data;
    },
    enabled: !!userQuery.data?.jellyfinUserId,
    staleTime: 60000, // 1 minute
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-blue-500 text-white shadow-md">
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
                {connectionQuery.data?.serverUrl || "Jellyfin Server"}
              </span>
            </div>
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm"
              className="border-white text-white hover:bg-white/20"
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : userQuery.error ? (
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardContent className="p-6 text-center">
              <p className="text-red-400">Failed to load user profile. Please try logging in again.</p>
              <Button onClick={() => setLocation("/login")} className="mt-4 bg-blue-500 hover:bg-blue-600">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Profile Card */}
            <Card className="md:col-span-1 bg-gray-900 border-gray-800 text-white">
              <CardHeader className="pb-0 pt-6 px-6 flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-4 bg-gray-800">
                  <AvatarImage src={userQuery.data ? `/api/users/${userQuery.data.jellyfinUserId}/image` : undefined} />
                  <AvatarFallback className="text-lg bg-gray-800 text-white">
                    {getUserInitials(userQuery.data?.username || "")}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl text-center text-white">{userQuery.data?.username}</CardTitle>
                <CardDescription className="text-center text-gray-400">
                  {userQuery.data?.isAdmin ? "Administrator" : "Regular User"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="font-medium text-sm text-gray-400 mb-2">ACCOUNT DETAILS</h3>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <UserIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                        <div>
                          <p className="font-medium text-white">Username</p>
                          <p className="text-sm text-gray-400">{userQuery.data?.username}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Clock className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                        <div>
                          <p className="font-medium text-white">Email</p>
                          <p className="text-sm text-gray-400">
                            {userQuery.data?.email || "Not provided"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-800 p-6 border-t border-gray-700">
                <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-700" onClick={handleDisconnect}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </CardFooter>
            </Card>

            {/* Recent Activity and Account Settings */}
            <div className="md:col-span-2 space-y-6">
              <Card className="bg-gray-900 border-gray-800 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <FileBarChart className="h-5 w-5 mr-2 text-blue-400" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-gray-400">Your recent Jellyfin activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {watchHistoryQuery.isLoading ? (
                    <div className="flex justify-center items-center h-24">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                  ) : watchHistoryQuery.isError ? (
                    <div className="text-center py-4 text-red-400">
                      Error loading watch history
                    </div>
                  ) : watchHistoryQuery.data?.Items && watchHistoryQuery.data.Items.length > 0 ? (
                    <div className="space-y-4">
                      {watchHistoryQuery.data.Items.map((activity, idx) => (
                        <div key={idx} className="flex items-start border-b border-gray-800 pb-4 last:border-0 last:pb-0">
                          {activity.ImageTag ? (
                            <div className="h-16 w-12 rounded-md overflow-hidden mr-4 flex-shrink-0">
                              <img 
                                src={`/api/users/${userQuery.data?.jellyfinUserId}/item-image/${activity.Id}?tag=${activity.ImageTag}`} 
                                alt={activity.Name} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }}
                              />
                              <div className="h-full w-full rounded-md bg-blue-500/10 hidden items-center justify-center">
                                <Film className="h-5 w-5 text-blue-400" />
                              </div>
                            </div>
                          ) : (
                            <div className="h-16 w-12 rounded-md bg-blue-500/10 flex items-center justify-center mr-4 flex-shrink-0">
                              <Film className="h-5 w-5 text-blue-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{activity.Name}</p>
                            {activity.SeriesName && (
                              <p className="text-sm text-blue-400">{activity.SeriesName} {activity.SeasonName ? `• ${activity.SeasonName}` : ''}</p>
                            )}
                            <p className="text-sm text-gray-400">
                              Watched {activity.Type === "Movie" ? "movie" : "episode"} • {formatDate(activity.Date)}
                              {activity.ProductionYear && ` • ${activity.ProductionYear}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p>No watch history available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800 text-white">
                <CardHeader>
                  <CardTitle className="text-white">Account Settings</CardTitle>
                  <CardDescription className="text-gray-400">Manage your Jellyfin account settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button variant="outline" className="w-full justify-start border-gray-700 text-white hover:bg-gray-800">
                      Change Password
                    </Button>
                    <Button variant="outline" className="w-full justify-start border-gray-700 text-white hover:bg-gray-800">
                      Notification Preferences
                    </Button>
                    <Button variant="outline" className="w-full justify-start border-gray-700 text-white hover:bg-gray-800">
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