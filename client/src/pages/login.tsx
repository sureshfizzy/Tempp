import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { z } from "zod";
import { 
  getConnectionStatus
} from "@/lib/jellyfin";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { 
  Alert, 
  AlertDescription 
} from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { 
  AlertCircle, 
  ArrowRight, 
  CheckCircle, 
  Film, 
  Settings,
  ClapperboardIcon
} from "lucide-react";
import { MovieBackground } from "@/components/movie-background";
import { CinemaDecoration } from "@/components/cinema-decoration";

// Form schema for the login form
const loginFormSchema = z.object({
  username: z.string()
    .min(1, "Username is required"),
  password: z.string()
    .min(1, "Password is required")
});

// Infer the type from the schema
type LoginFormData = z.infer<typeof loginFormSchema>;

// API Response type
interface LoginResponse {
  message: string;
  user: {
    id: number;
    username: string;
    isAdmin: boolean;
  };
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Get connection status to check if we have a server URL configured
  // Disable auto-refresh completely with fetched data
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  
  // One-time fetch on component mount only, no refetching or polling
  useEffect(() => {
    const fetchConnectionStatus = async () => {
      try {
        const data = await getConnectionStatus();
        setConnectionStatus(data);
      } catch (error) {
        console.error("Failed to fetch connection status:", error);
      }
    };
    
    fetchConnectionStatus();
  }, []);

  // Login mutation
  const loginMutation = useMutation<LoginResponse, Error, LoginFormData>({
    mutationFn: async (data: LoginFormData) => {
      return await apiRequest<LoginResponse>("/api/login", data);
    },
    onSuccess: (data: LoginResponse) => {
      toast({
        title: "Login successful",
        description: "You have been logged in successfully",
      });
      
      // Force an immediate navigation based on admin status
      if (data.user.isAdmin) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/user-profile";
      }
    },
    onError: (error) => {
      // Extract the main error message
      const errorMessage = error instanceof Error ? error.message : "Invalid username or password";
      
      // Check if the error contains additional details
      const responseData = (error as any).responseData;
      const errorDetails = responseData?.details;
      
      // Set the user-facing error message
      setLoginError(errorDetails || errorMessage);
      
      toast({
        title: "Login failed",
        description: errorDetails || errorMessage,
        variant: "destructive",
      });
    },
  });

  // Form definition
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Submit handler with debounce to prevent accidental multiple submissions
  const onSubmit = async (data: LoginFormData) => {
    // Prevent submitting if already in progress
    if (isLoading) return;
    
    // Clear any previous errors
    setLoginError(null);
    setIsLoading(true);
    
    try {
      await loginMutation.mutateAsync(data);
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 500); // Small delay to prevent accidental double-clicks
    }
  };

  // Handle reconnect (if the server connection is lost)
  const handleReconnect = () => {
    setLocation("/onboarding");
  };

  // Desktop render - Cinema Inspired Theme
  const DesktopLogin = () => (
    <div className="min-h-screen flex overflow-hidden bg-black">
      {/* Movie background with dynamic theater-style overlays */}
      <MovieBackground />
      
      {/* Cinema Decorations */}
      <div className="absolute inset-0 z-0 opacity-60">
        <CinemaDecoration />
      </div>
      
      {/* Content with theater-inspired design */}
      <div className="relative w-full md:w-1/2 flex items-center justify-center p-8 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          {/* Logo header with spotlight effect */}
          <motion.div 
            className="mb-8 text-center relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-radial from-blue-600/20 via-transparent to-transparent rounded-full opacity-70 animate-pulse"></div>
            
            <motion.div
              className="flex items-center justify-center mb-4 relative"
              animate={{ 
                y: [0, -5, 0, 5, 0] 
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <Film className="h-16 w-16 text-primary blue-glow" />
            </motion.div>
            
            <h1 className="text-4xl font-bold text-white mb-2 blue-text-glow tracking-wider">
              Jellyfin Manager
            </h1>
            <p className="text-gray-300 text-lg">
              Your complete media server management solution
            </p>
          </motion.div>
          
          {/* Glass-morphism login card with cinema style */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Card className="cinema-card border-primary/20">
              <CardContent className="pt-6">
                {!connectionStatus?.connected ? (
                  <div className="text-center py-4">
                    {connectionStatus?.configured ? (
                      <>
                        <p className="mb-4 text-gray-300">
                          Your Jellyfin server is configured but you are not connected.
                          Please log in with your credentials.
                        </p>
                        <LoginForm />
                      </>
                    ) : (
                      <>
                        <p className="mb-4 text-gray-300">
                          You need to connect to a Jellyfin server first before you can log in.
                        </p>
                        <Button 
                          onClick={handleReconnect}
                          className="bg-primary hover:bg-primary/90 text-white blue-glow"
                        >
                          Connect to Server
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center text-teal-400 mb-4 text-sm">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span>Connected to {connectionStatus.serverUrl}</span>
                    </div>
                    <LoginForm />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Right Panel - Theater Screen Effect */}
      <div className="hidden md:block relative w-1/2 z-0">
        {/* Theater screen frame */}
        <div className="absolute inset-y-0 inset-x-10 border-4 border-gray-800 rounded-lg shadow-2xl m-8 overflow-hidden">
          {/* Theater curtain effect */}
          <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black to-transparent"></div>
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black to-transparent"></div>
          
          {/* Gradient overlay for better visibility */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/80 z-10" />
        </div>
      </div>
    </div>
  );

  // Mobile render - Cinema Theme
  const MobileLogin = () => (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-cinema-dark to-black">
      {/* Animated cinema decoration elements */}
      <CinemaDecoration />
      
      {/* Content with cinema theater styling */}
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 z-10">
        {/* Spotlight effect */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vh] h-[150vh] bg-gradient-radial from-blue-600/10 via-transparent to-transparent rounded-full"></div>
        
        {/* Logo and header area */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md text-center mb-8"
        >
          <motion.div
            className="inline-block mb-4"
            animate={{ 
              rotate: [0, 5, 0, -5, 0],
              y: [0, -5, 0, 5, 0] 
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <ClapperboardIcon className="h-16 w-16 text-primary blue-glow" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-white mb-2 blue-text-glow tracking-wider">
            Welcome Back
          </h1>
          <p className="text-gray-300 text-lg">
            Sign in to manage your Jellyfin server
          </p>
        </motion.div>
        
        {/* Login card with cinema styling */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-full max-w-md"
        >
          <Card className="cinema-card border-primary/20">
            <CardContent className="pt-6">
              {!connectionStatus?.connected ? (
                <div className="text-center py-4">
                  {connectionStatus?.configured ? (
                    <>
                      <p className="mb-4 text-gray-300">
                        Your Jellyfin server is configured but you are not connected.
                      </p>
                      <LoginForm />
                    </>
                  ) : (
                    <>
                      <p className="mb-4 text-gray-300">
                        Connect to your Jellyfin server to get started
                      </p>
                      <Button 
                        onClick={handleReconnect}
                        className="bg-primary hover:bg-primary/90 text-white blue-glow"
                      >
                        Connect Server
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-center text-teal-400 mb-4 text-sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Connected to server</span>
                  </div>
                  <LoginForm />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );

  // Login form component (used in both mobile and desktop views)
  const LoginForm = () => (
    <>
      {loginError && (
        <Alert variant="destructive" className="mb-4 bg-red-900/50 border-red-800 text-white">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loginError}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-200">Username</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your username" 
                    className="border-gray-600 bg-gray-800/60 text-white placeholder:text-gray-500" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-200">Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Enter your password" 
                    className="border-gray-600 bg-gray-800/60 text-white placeholder:text-gray-500" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-white transition-all duration-300 relative overflow-hidden group"
            disabled={isLoading}
          >
            <span className="relative z-10">
              {isLoading ? "Logging in..." : "Sign In"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4 inline" />}
            </span>
            <span className="absolute inset-0 w-0 bg-blue-700 transition-all duration-500 ease-out group-hover:w-full"></span>
          </Button>

          <div className="mt-4 pt-4 border-t border-gray-700 text-center">
            <p className="text-sm text-gray-400 mb-2">
              Need to connect to a different server?
            </p>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <Settings className="mr-2 h-4 w-4" />
              Reconfigure Server
            </Button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            Need help? Contact your Jellyfin administrator.
          </p>
        </form>
      </Form>
    </>
  );

  // Render based on screen size
  return isMobile ? <MobileLogin /> : <DesktopLogin />;
}