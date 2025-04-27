import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getConnectionStatus, disconnectFromJellyfin, getUserWatchTime } from "@/lib/jellyfin";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User as JellyfinUser, UserActivity } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LogOut, User as UserIcon, Clock, FileBarChart, Film, 
  Home, Mail, Play, AlarmClock, CalendarClock, Pencil, ExternalLink,
  TimerReset, Sparkles, Settings, Calendar, ImageIcon
} from "lucide-react";
import { formatDate } from "@/lib/jellyfin";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { UserExpiryBadge } from "@/components/user-expiry-badge";

export default function UserProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  // Get current user's info - appUser is different from JellyfinUser
  interface AppUser {
    id: number;
    username: string;
    email: string;
    isAdmin: boolean;
    jellyfinUserId: string;
    expiresAt?: string | null;
    disabled?: boolean;
  }
  
  const userQuery = useQuery<AppUser>({
    queryKey: ["/api/me"],
    staleTime: 0, // Always refetch to get the latest expiry information
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Get connection status
  const connectionQuery = useQuery({
    queryKey: ["/api/connection-status"],
    queryFn: getConnectionStatus,
  });

  // Fetch server settings to get server name and logo
  const serverSettingsQuery = useQuery({
    queryKey: ["/api/system/status"],
    enabled: userQuery.data?.isAdmin === true,
  });

  // Fetch watch history
  const watchHistoryQuery = useQuery<{ Items: UserActivity[], TotalRecordCount: number }>({
    queryKey: ["/api/users", userQuery.data?.jellyfinUserId, "watch-history"],
    queryFn: async () => {
      if (!userQuery.data?.jellyfinUserId) {
        return { Items: [], TotalRecordCount: 0 };
      }
      
      const response = await fetch(`/api/users/${userQuery.data.jellyfinUserId}/watch-history?limit=10`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch watch history: ${errorText}`);
      }
      
      return await response.json();
    },
    enabled: !!userQuery.data?.jellyfinUserId,
    staleTime: 60000, // 1 minute
  });

  // Get user watch time stats
  const watchTimeQuery = useQuery<{ totalMinutes: number, itemCount: number }>({
    queryKey: ["/api/users", userQuery.data?.jellyfinUserId, "watch-time"],
    queryFn: async () => {
      if (!userQuery.data?.jellyfinUserId) {
        return { totalMinutes: 0, itemCount: 0 };
      }
      
      const response = await fetch(`/api/users/${userQuery.data.jellyfinUserId}/watch-time`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch watch time stats");
      }
      
      return await response.json();
    },
    enabled: !!userQuery.data?.jellyfinUserId,
    staleTime: 300000, // 5 minutes
  });

  // Format watch time for display
  const formatWatchTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } 
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes > 0 ? `${remainingMinutes} min` : ''}`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    return `${days} day${days !== 1 ? 's' : ''} ${remainingHours > 0 ? `${remainingHours} hr` : ''}`;
  };

  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!userQuery.data) {
        throw new Error("User not found");
      }
      
      const response = await apiRequest("PATCH", `/api/app-users/${userQuery.data.id}`, {
        email
      });
      
      if (!response.ok) {
        throw new Error("Failed to update email");
      }
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Email Updated",
        description: "Your email has been updated successfully",
      });
      setIsEmailDialogOpen(false);
      // Refresh user data
      userQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update email",
        variant: "destructive",
      });
    }
  });

  // Handle email update
  const handleUpdateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail) {
      updateEmailMutation.mutate(newEmail);
    }
  };

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

  // Redirect to Jellyfin
  const redirectToJellyfin = () => {
    if (connectionQuery.data?.serverUrl) {
      window.open(connectionQuery.data.serverUrl, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Server URL not available",
        variant: "destructive",
      });
    }
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

  // Get server name
  const getServerName = () => {
    return connectionQuery.data?.serverName || 
           serverSettingsQuery.data?.serverName || 
           "Jellyfin Server";
  };

  // Get server logo
  const getServerLogo = () => {
    return serverSettingsQuery.data?.logoUrl || null;
  };

  // Animation variants for cards
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const fadeInVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white"
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
    >
      {/* Modern Header with Glass Morphism */}
      <header className="bg-black/40 backdrop-blur-md border-b border-white/10 text-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            {getServerLogo() ? (
              <img 
                src={getServerLogo() as string} 
                alt={getServerName()} 
                className="h-8 w-auto object-contain" 
              />
            ) : (
              <div className="h-8 w-8 bg-blue-600 rounded-md flex items-center justify-center text-white">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-medium leading-none">{getServerName()}</h1>
              <p className="text-xs text-gray-400">User Dashboard</p>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <ThemeToggle />
            
            {userQuery.data?.isAdmin && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setLocation("/settings")}
              >
                <Settings className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 transition-colors duration-300"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Disconnect</span>
            </Button>
          </motion.div>
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
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={containerVariants}
          >
            {/* User Profile Card */}
            <motion.div variants={itemVariants}>
              <Card className="md:col-span-1 bg-gray-900 border-gray-800 text-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-blue-800/20">
                <CardHeader className="pb-0 pt-6 px-6 flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Avatar className="h-24 w-24 mb-4 bg-gray-800 ring-2 ring-blue-500/50">
                      <AvatarImage src={userQuery.data ? `/api/users/${userQuery.data.jellyfinUserId}/image` : undefined} />
                      <AvatarFallback className="text-lg bg-gray-800 text-white">
                        {getUserInitials(userQuery.data?.username || "")}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  
                  <CardTitle className="text-xl text-center text-white">{userQuery.data?.username}</CardTitle>
                  <CardDescription className="text-center text-gray-400">
                    {userQuery.data?.isAdmin ? "Administrator" : "Regular User"}
                  </CardDescription>
                  
                  {/* Account Expiry Badge - Using both badge components for redundancy */}
                  <div className="mt-3">
                    <UserExpiryBadge expiresAt={userQuery.data?.expiresAt} disabled={userQuery.data?.disabled} />
                  </div>
                  
                  {/* Manual expiry display as backup */}
                  {userQuery.data?.expiresAt && (
                    <div className="mt-2 bg-amber-500/20 text-amber-300 border border-amber-600 px-3 py-1 rounded-full text-xs flex items-center">
                      <CalendarClock className="w-3 h-3 mr-1" />
                      Expires: {new Date(userQuery.data.expiresAt).toLocaleDateString()}
                    </div>
                  )}
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
                        <div className="flex items-start group relative">
                          <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                          <div className="flex-grow">
                            <div className="flex items-center">
                              <p className="font-medium text-white">Email</p>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="ml-auto h-6 p-0 w-6 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  setNewEmail(userQuery.data?.email || "");
                                  setIsEmailDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-sm text-gray-400">
                              {userQuery.data?.email || "Not provided"}
                            </p>
                          </div>
                        </div>
                        
                        {userQuery.data?.expiresAt && (
                          <div className="flex items-start">
                            <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                            <div>
                              <p className="font-medium text-white">Account Expiry</p>
                              <p className="text-sm text-gray-400">
                                {new Date(userQuery.data.expiresAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {watchTimeQuery.data && (
                          <div className="flex items-start">
                            <TimerReset className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                            <div>
                              <p className="font-medium text-white">Total Watch Time</p>
                              <p className="text-sm text-blue-400">
                                {formatWatchTime(watchTimeQuery.data.totalMinutes)} 
                                <span className="text-gray-400 ml-1">
                                  ({watchTimeQuery.data.itemCount} {watchTimeQuery.data.itemCount === 1 ? 'item' : 'items'})
                                </span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-800 p-6 border-t border-gray-700">
                  <Button 
                    variant="default" 
                    className="w-full bg-blue-600 hover:bg-blue-700 transition-colors duration-300"
                    onClick={redirectToJellyfin}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Watch Now
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            {/* Recent Activity and Account Settings */}
            <motion.div variants={itemVariants} className="md:col-span-2 space-y-6">
              <Card className="bg-gray-900 border-gray-800 text-white transition-all duration-300 hover:shadow-lg hover:shadow-blue-800/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-white">
                      <FileBarChart className="h-5 w-5 mr-2 text-blue-400" />
                      Recent Activity
                    </CardTitle>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs border-gray-700 bg-transparent hover:bg-gray-800 text-gray-300"
                      onClick={redirectToJellyfin}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Watch Now
                    </Button>
                  </div>
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
                      <AnimatePresence>
                        {watchHistoryQuery.data.Items.map((activity, idx) => (
                          <motion.div 
                            key={idx} 
                            className="flex items-start border-b border-gray-800 pb-4 last:border-0 last:pb-0 hover:bg-gray-800/30 p-2 rounded-md transition-colors duration-200"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ scale: 1.01 }}
                          >
                            {activity.ImageTag ? (
                              <div className="h-16 w-12 rounded-md overflow-hidden mr-4 flex-shrink-0 shadow-md">
                                <img 
                                  src={`/api/users/${userQuery.data?.jellyfinUserId}/item-image/${activity.Id}?tag=${activity.ImageTag}`} 
                                  alt={activity.Name} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback if image fails to load
                                    const img = e.currentTarget as HTMLImageElement;
                                    img.onerror = null;
                                    img.style.display = 'none';
                                    
                                    // Find the fallback container and display it
                                    const fallbackEl = img.nextElementSibling as HTMLElement;
                                    if (fallbackEl) {
                                      fallbackEl.style.display = 'flex';
                                    }
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
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Film className="h-12 w-12 mx-auto mb-3 text-gray-500" />
                      <p>No watch history available</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 text-blue-400 border-blue-800/50 hover:bg-blue-900/20"
                        onClick={redirectToJellyfin}
                      >
                        Start Watching
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800 text-white transition-all duration-300 hover:shadow-lg hover:shadow-blue-800/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-blue-400" />
                    Account Settings
                  </CardTitle>
                  <CardDescription className="text-gray-400">Manage your Jellyfin account settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-gray-700 text-white hover:bg-gray-800 transition-colors duration-200"
                      onClick={() => {
                        setNewEmail(userQuery.data?.email || "");
                        setIsEmailDialogOpen(true);
                      }}
                    >
                      <Mail className="mr-2 h-4 w-4 text-blue-400" />
                      Update Email Address
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-gray-700 text-white hover:bg-gray-800 transition-colors duration-200"
                      onClick={redirectToJellyfin}
                    >
                      <Play className="mr-2 h-4 w-4 text-blue-400" />
                      Go to Jellyfin
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-gray-700 text-white hover:bg-gray-800 transition-colors duration-200"
                      onClick={handleDisconnect}
                    >
                      <LogOut className="mr-2 h-4 w-4 text-red-400" />
                      Disconnect from Server
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </main>

      {/* Email Update Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Update Email Address</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter your new email address below
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateEmail}>
            <div className="py-4">
              <Input 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                className="bg-gray-800 border-gray-700 text-white"
                type="email"
                required
              />
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsEmailDialogOpen(false)}
                className="border-gray-700 text-white hover:bg-gray-800"
                type="button"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={updateEmailMutation.isPending}
              >
                {updateEmailMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                    Updating...
                  </>
                ) : "Update Email"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}