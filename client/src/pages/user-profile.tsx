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
  TimerReset, Sparkles, Settings, Calendar, ImageIcon, AlertTriangle
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
      className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900 via-gray-900 to-purple-950 text-white overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
    >
      {/* Paradox-Themed Background Effects */}
      <div className="fixed inset-0 z-0">
        {/* Time anomaly particles */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-gradient-to-r from-emerald-400 to-purple-400"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                scale: Math.random() * 3
              }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [1, 2, 1],
                filter: ["blur(0px)", "blur(2px)", "blur(0px)"]
              }}
              transition={{
                duration: 4 + Math.random() * 6,
                repeat: Infinity,
                delay: Math.random() * 5
              }}
            />
          ))}
        </div>
        
        {/* Orbital rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            className="w-[800px] h-[800px] border border-emerald-500/10 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute w-[600px] h-[600px] border border-purple-500/10 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute w-[400px] h-[400px] border border-blue-500/10 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
        </div>
        
        {/* Time vortex light effects */}
        <motion.div 
          className="absolute top-0 -right-10 w-[500px] h-[800px] bg-emerald-700/10 blur-[120px] rounded-full"
          animate={{ 
            opacity: [0.1, 0.2, 0.1],
            x: [0, -20, 0]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-900/10 blur-[100px] rounded-full"
          animate={{ 
            opacity: [0.1, 0.15, 0.1],
            x: [0, 10, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        
        {/* Paradox event horizon in the center */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-r from-emerald-500/20 to-purple-500/20 blur-2xl"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Film grain effect */}
        <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
      </div>
      
      {/* Paradox-Themed Header with Glass Morphism */}
      <header className="bg-black/40 backdrop-blur-xl border-b border-white/10 text-white sticky top-0 z-50 shadow-lg shadow-purple-900/20">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between relative">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              {getServerLogo() ? (
                <img 
                  src={getServerLogo() as string} 
                  alt={getServerName()} 
                  className="h-10 w-auto object-contain" 
                />
              ) : (
                <div className="h-10 w-10 bg-gradient-to-br from-emerald-600 to-purple-700 rounded-md flex items-center justify-center text-white shadow-lg shadow-purple-700/20">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
            </motion.div>
            <div>
              <motion.h1 
                className="text-xl font-medium leading-none bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-white"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                {getServerName()}
              </motion.h1>
              <p className="text-xs text-emerald-300/80">Paradox Timeline</p>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <ThemeToggle />
            </motion.div>
            
            {userQuery.data?.isAdmin && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white/70 hover:text-emerald-300 hover:bg-white/10"
                  onClick={() => setLocation("/settings")}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </motion.div>
            )}
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 hover:border-purple-400 transition-all duration-300"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Disconnect</span>
              </Button>
            </motion.div>
          </motion.div>
          
          {/* Decorative paradox header line */}
          <motion.div 
            className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-purple-500 w-full"
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{ 
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
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
              <Card className="md:col-span-1 bg-gradient-to-b from-gray-900 to-gray-950 border border-emerald-900/40 border-r-purple-800/40 text-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-800/30 rounded-xl backdrop-blur-sm relative">
                {/* Decorative elements for paradox theme */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-800 via-teal-600 to-purple-800 opacity-80"></div>
                <div className="absolute -left-20 top-10 w-40 h-60 bg-emerald-600/20 blur-[60px] rounded-full"></div>
                <div className="absolute -right-20 bottom-10 w-40 h-60 bg-purple-600/20 blur-[60px] rounded-full"></div>
                
                <CardHeader className="pb-0 pt-8 px-6 flex flex-col items-center relative">
                  {/* Time Paradox Avatar */}
                  <motion.div
                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)" }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="relative mb-6"
                  >
                    {/* Time portal effect behind avatar */}
                    <motion.div 
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-purple-600 blur-md opacity-70 scale-110"
                      animate={{
                        rotate: 360
                      }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                    <Avatar className="h-28 w-28 bg-gray-800 ring-4 ring-emerald-500/30 relative">
                      <AvatarImage src={userQuery.data ? `/api/users/${userQuery.data.jellyfinUserId}/image` : undefined} />
                      <AvatarFallback className="text-2xl bg-gray-800 text-white">
                        {getUserInitials(userQuery.data?.username || "")}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Animated glow effect */}
                    <motion.div 
                      className="absolute -inset-1 rounded-full bg-blue-500/20 z-0 blur-sm"
                      animate={{ 
                        scale: [1, 1.05, 1],
                        opacity: [0.4, 0.7, 0.4] 
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-white font-bold">
                      {userQuery.data?.username}
                    </CardTitle>
                    <CardDescription className="text-center text-blue-300/80 mt-1">
                      {userQuery.data?.isAdmin ? "Administrator" : "Regular User"}
                    </CardDescription>
                  </motion.div>
                  
                  {/* Account Expiry Badges */}
                  <motion.div 
                    className="mt-4 flex flex-col items-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <div className="mb-2">
                      <UserExpiryBadge expiresAt={userQuery.data?.expiresAt} disabled={userQuery.data?.disabled} />
                    </div>
                    
                    {/* Cinematic Manual expiry display */}
                    {userQuery.data?.expiresAt && (
                      <motion.div 
                        className="mt-1 bg-gradient-to-r from-amber-500/30 to-amber-700/30 text-amber-300 border border-amber-600/70 px-4 py-1.5 rounded-full text-xs flex items-center shadow-lg shadow-amber-800/20"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <CalendarClock className="w-3.5 h-3.5 mr-2" />
                        Expires: {new Date(userQuery.data.expiresAt).toLocaleDateString()}
                      </motion.div>
                    )}
                  </motion.div>
                </CardHeader>
                
                <CardContent className="p-6 pt-7 relative z-10">
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <div className="border-t border-blue-900/40 pt-4">
                      <h3 className="font-medium text-sm text-blue-300 mb-3 tracking-wider uppercase">Account Details</h3>
                      <div className="space-y-4">
                        <motion.div 
                          className="flex items-start p-2 rounded-lg hover:bg-blue-900/10 transition-colors duration-200"
                          whileHover={{ x: 3 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <UserIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
                          <div>
                            <p className="font-medium text-white">Username</p>
                            <p className="text-sm text-blue-200/70">{userQuery.data?.username}</p>
                          </div>
                        </motion.div>
                        
                        <motion.div 
                          className="flex items-start p-2 rounded-lg hover:bg-blue-900/10 transition-colors duration-200 group relative"
                          whileHover={{ x: 3 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Mail className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
                          <div className="flex-grow">
                            <div className="flex items-center">
                              <p className="font-medium text-white">Email</p>
                              <motion.div
                                whileHover={{ scale: 1.2, rotate: 15 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="ml-auto h-6 p-0 w-6 text-blue-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                                  onClick={() => {
                                    setNewEmail(userQuery.data?.email || "");
                                    setIsEmailDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </motion.div>
                            </div>
                            <p className="text-sm text-blue-200/70">
                              {userQuery.data?.email || "Not provided"}
                            </p>
                          </div>
                        </motion.div>
                        
                        {userQuery.data?.expiresAt && (
                          <motion.div 
                            className="flex items-start p-2 rounded-lg hover:bg-blue-900/10 transition-colors duration-200"
                            whileHover={{ x: 3 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Calendar className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
                            <div>
                              <p className="font-medium text-white">Account Expiry</p>
                              <p className="text-sm text-blue-200/70">
                                {new Date(userQuery.data.expiresAt).toLocaleDateString()}
                              </p>
                            </div>
                          </motion.div>
                        )}
                        
                        {watchTimeQuery.data && (
                          <motion.div 
                            className="flex items-start p-2 rounded-lg hover:bg-blue-900/10 transition-colors duration-200"
                            whileHover={{ x: 3 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <TimerReset className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
                            <div>
                              <p className="font-medium text-white">Total Watch Time</p>
                              <div className="flex items-center">
                                <p className="text-sm text-blue-300">
                                  {formatWatchTime(watchTimeQuery.data.totalMinutes)} 
                                </p>
                                <span className="text-xs text-blue-400/70 ml-2 bg-blue-400/10 px-2 py-0.5 rounded-full">
                                  {watchTimeQuery.data.itemCount} {watchTimeQuery.data.itemCount === 1 ? 'item' : 'items'}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </CardContent>
                
                <CardFooter className="bg-gradient-to-b from-gray-800/80 to-gray-900 p-6 border-t border-blue-900/30 relative">
                  <div className="w-full text-center opacity-80">
                    <motion.p 
                      className="text-xs text-blue-300/80 italic"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 1 }}
                    >
                      "Time is a paradox, repeating without ending. Click on your recent activity to continue your journey."
                    </motion.p>
                  </div>
                  
                  {/* Decorative paradox-themed elements */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-[1px] bg-emerald-400/50 blur-sm"></div>
                </CardFooter>
              </Card>
            </motion.div>

            {/* Recent Activity and Account Settings */}
            <motion.div variants={itemVariants} className="md:col-span-2 space-y-6">
              {/* Recent Activity Card with Cinema-inspired design */}
              <Card className="bg-gradient-to-b from-gray-900 to-gray-950 border border-blue-900/40 text-white transition-all duration-300 hover:shadow-xl hover:shadow-blue-800/30 rounded-xl overflow-hidden relative">
                {/* Decorative cinema-inspired elements */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-700 via-indigo-500 to-blue-700 opacity-70"></div>
                <div className="absolute top-10 right-0 w-32 h-32 bg-blue-700/10 blur-[70px] rounded-full"></div>
                
                <CardHeader className="relative z-10">
                  <div className="flex items-center justify-between">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <CardTitle className="flex items-center text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">
                        <FileBarChart className="h-5 w-5 mr-2 text-blue-400" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription className="text-blue-300/70">Your recent Jellyfin activity</CardDescription>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="relative h-8 w-8"
                    >
                      <motion.div 
                        className="absolute rounded-full h-8 w-8 border border-emerald-500/30 opacity-80"
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <motion.div 
                        className="absolute rounded-full h-8 w-8 border border-purple-500/30 opacity-60"
                        animate={{ 
                          scale: [1.1, 0.9, 1.1],
                          opacity: [0.2, 0.5, 0.2]
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.5
                        }}
                      />
                    </motion.div>
                  </div>
                </CardHeader>
                
                <CardContent className="relative z-10">
                  {watchHistoryQuery.isLoading ? (
                    <div className="flex justify-center items-center h-32">
                      {/* Cinema-inspired loading animation */}
                      <div className="relative h-12 w-12">
                        <motion.div 
                          className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400"
                          animate={{ rotate: 360 }}
                          transition={{ 
                            duration: 1.5, 
                            ease: "linear", 
                            repeat: Infinity 
                          }}
                        />
                        <motion.div 
                          className="absolute inset-0 rounded-full border-2 border-transparent border-r-indigo-400 scale-75"
                          animate={{ rotate: -360 }}
                          transition={{ 
                            duration: 2, 
                            ease: "linear", 
                            repeat: Infinity 
                          }}
                        />
                        <motion.div className="h-3 w-3 rounded-full bg-blue-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" 
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ 
                            duration: 2, 
                            ease: "easeInOut", 
                            repeat: Infinity 
                          }}
                        />
                      </div>
                    </div>
                  ) : watchHistoryQuery.isError ? (
                    <div className="text-center py-6 text-red-400 bg-red-900/10 border border-red-800/30 rounded-lg">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-red-400" />
                        <p className="font-medium">Error loading watch history</p>
                        <p className="text-xs mt-1 text-red-300/70">Please try again later</p>
                      </motion.div>
                    </div>
                  ) : watchHistoryQuery.data?.Items && watchHistoryQuery.data.Items.length > 0 ? (
                    <div className="space-y-4 rounded-xl overflow-hidden">
                      <AnimatePresence>
                        {watchHistoryQuery.data.Items.map((activity, idx) => (
                          <motion.div 
                            key={idx} 
                            className="flex items-start border-b border-blue-900/30 pb-4 last:border-0 last:pb-0 hover:bg-blue-900/10 p-3 rounded-lg transition-all duration-300 relative cursor-pointer"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              delay: idx * 0.05 + 0.1,
                              type: "spring",
                              stiffness: 100,
                              damping: 15
                            }}
                            whileHover={{ 
                              scale: 1.02,
                              backgroundColor: "rgba(30, 64, 175, 0.15)"
                            }}
                            onClick={() => redirectToJellyfin()}
                          >
                            {/* Poster with cinematic glow effect */}
                            <motion.div className="relative mr-4 flex-shrink-0"
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              {activity.ImageTag ? (
                                <div className="relative">
                                  <div className="absolute -inset-0.5 rounded-lg bg-blue-500/20 blur-sm"></div>
                                  <div className="h-20 w-14 rounded-lg overflow-hidden relative shadow-lg shadow-blue-900/30">
                                    <img 
                                      src={`/api/users/${userQuery.data?.jellyfinUserId}/item-image/${activity.Id}?tag=${activity.ImageTag}`} 
                                      alt={activity.Name} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const img = e.currentTarget as HTMLImageElement;
                                        img.onerror = null;
                                        img.style.display = 'none';
                                        
                                        const fallbackEl = img.nextElementSibling as HTMLElement;
                                        if (fallbackEl) {
                                          fallbackEl.style.display = 'flex';
                                        }
                                      }}
                                    />
                                    <div className="h-full w-full rounded-lg bg-blue-900/80 hidden items-center justify-center absolute inset-0">
                                      <Film className="h-6 w-6 text-blue-300" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <div className="absolute -inset-0.5 rounded-lg bg-blue-500/20 blur-sm"></div>
                                  <div className="h-20 w-14 rounded-lg bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center relative shadow-lg shadow-blue-900/30">
                                    <Film className="h-6 w-6 text-blue-300" />
                                  </div>
                                </div>
                              )}
                            </motion.div>
                            
                            {/* Movie/Episode Details */}
                            <div className="flex-1">
                              <motion.p 
                                className="font-medium text-white text-base leading-tight"
                                whileHover={{ 
                                  color: "rgb(191, 219, 254)", 
                                  transition: { duration: 0.2 } 
                                }}
                              >
                                {activity.Name}
                              </motion.p>
                              
                              {activity.SeriesName && (
                                <p className="text-sm text-blue-300 mt-0.5">
                                  {activity.SeriesName} {activity.SeasonName ? `• ${activity.SeasonName}` : ''}
                                </p>
                              )}
                              
                              <div className="flex items-center mt-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-200 border border-blue-800/30">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDate(activity.Date)}
                                </span>
                                
                                {activity.ProductionYear && (
                                  <span className="ml-2 text-xs text-blue-400/80">
                                    {activity.ProductionYear}
                                  </span>
                                )}
                                
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-900/30 to-indigo-900/30 text-blue-300 border border-blue-800/20">
                                  {activity.Type === "Movie" ? "Movie" : "Episode"}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <motion.div 
                      className="text-center py-12 rounded-xl bg-gradient-to-b from-transparent to-blue-950/10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.7 }}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <Film className="h-16 w-16 mx-auto mb-4 text-blue-700/50" />
                        <p className="text-blue-200 font-medium">No watch history available</p>
                        <p className="text-blue-400/60 text-sm mt-1 mb-4">Start watching to see your activity here</p>
                        
                        <motion.div
                          className="mt-3 px-4 py-6 rounded-lg bg-blue-900/10 border border-blue-800/20 max-w-md mx-auto"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4, duration: 0.6 }}
                        >
                          <p className="text-sm text-blue-300/90 italic font-serif">
                            "In the void of unwatched content, time stands still. The paradox of choice awaits through the portal."
                          </p>
                          <div className="mt-2 flex justify-center">
                            <motion.div
                              className="relative h-10 w-10"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            >
                              <div className="absolute inset-0 border-2 border-transparent border-t-emerald-500/40 border-r-purple-500/40 rounded-full"></div>
                            </motion.div>
                          </div>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Account Settings Card with Cinema-inspired design */}
              <Card className="bg-gradient-to-b from-gray-900 to-gray-950 border border-blue-900/40 text-white transition-all duration-300 hover:shadow-xl hover:shadow-blue-800/30 rounded-xl relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-700 via-blue-500 to-indigo-700 opacity-70"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-800/10 blur-[70px] rounded-full"></div>
                
                <CardHeader className="relative z-10">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <CardTitle className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white flex items-center">
                      <Sparkles className="h-5 w-5 mr-2 text-blue-400" />
                      Account Settings
                    </CardTitle>
                    <CardDescription className="text-blue-300/70">Manage your Jellyfin account settings</CardDescription>
                  </motion.div>
                </CardHeader>
                
                <CardContent className="relative z-10">
                  <div className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-blue-700/30 bg-blue-900/10 text-white hover:bg-blue-800/20 hover:border-blue-600/50 transition-all duration-300 py-6 group"
                        onClick={() => {
                          setNewEmail(userQuery.data?.email || "");
                          setIsEmailDialogOpen(true);
                        }}
                      >
                        <motion.div
                          whileHover={{ rotate: 15 }}
                          transition={{ type: "spring", stiffness: 500 }}
                          className="mr-3 bg-blue-800/70 rounded-full p-2 group-hover:bg-blue-700/80 transition-colors duration-300"
                        >
                          <Mail className="h-4 w-4 text-blue-200" />
                        </motion.div>
                        <span className="font-medium">Update Email Address</span>
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-blue-700/30 bg-blue-900/10 text-white hover:bg-blue-800/20 hover:border-blue-600/50 transition-all duration-300 py-6 group"
                        onClick={redirectToJellyfin}
                      >
                        <motion.div
                          whileHover={{ scale: 1.2 }}
                          transition={{ type: "spring", stiffness: 500 }}
                          className="mr-3 bg-blue-800/70 rounded-full p-2 group-hover:bg-blue-700/80 transition-colors duration-300"
                        >
                          <Play className="h-4 w-4 text-blue-200" />
                        </motion.div>
                        <span className="font-medium">Go to Jellyfin</span>
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-red-900/30 bg-red-950/10 text-white hover:bg-red-900/20 hover:border-red-800/50 transition-all duration-300 py-6 group"
                        onClick={handleDisconnect}
                      >
                        <motion.div
                          whileHover={{ rotate: 90 }}
                          transition={{ type: "spring", stiffness: 500 }}
                          className="mr-3 bg-red-900/70 rounded-full p-2 group-hover:bg-red-800/80 transition-colors duration-300"
                        >
                          <LogOut className="h-4 w-4 text-red-200" />
                        </motion.div>
                        <span className="font-medium">Disconnect from Server</span>
                      </Button>
                    </motion.div>
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