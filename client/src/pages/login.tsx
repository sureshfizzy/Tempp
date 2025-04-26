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

interface LoginPageProps {
  params?: {
    code?: string;
  };
}

export default function LoginPage(props: LoginPageProps) {
  const [, setLocation] = useLocation();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Get connection status to check if we have a server URL configured
  // Disable auto-refresh completely with fetched data
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  
  // Check for invite code in URL path
  useEffect(() => {
    // Check if we have code from route params
    if (props.params?.code) {
      setInviteCode(props.params.code);
    } else {
      // Check if we have '/invite/' in the path
      const path = window.location.pathname;
      const inviteMatch = path.match(/\/invite\/([A-Za-z0-9]+)/);
      if (inviteMatch && inviteMatch[1]) {
        setInviteCode(inviteMatch[1]);
      }
    }
  }, [props.params]);
  
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
      // Include invite code if available
      const loginData = inviteCode 
        ? { ...data, inviteCode }
        : data;
        
      await loginMutation.mutateAsync(loginData);
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

  // Desktop render
  const DesktopLogin = () => (
    <div className="min-h-screen flex flex-col overflow-hidden bg-slate-950">
      {/* Plain background with no movie images */}
      
      {/* Content Panel (Centered) */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center fade-in">
            <div className="flex items-center justify-center mb-4">
              <Film className="h-14 w-14 text-primary blue-glow" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 blue-text-glow">
              Jellyfin Manager
            </h1>
            <p className="text-gray-300">
              Your complete media server management solution
            </p>
          </div>
          
          <div className="fade-in" style={{ animationDelay: "0.2s" }}>
            <Card className="bg-slate-900 border-primary/30 shadow-lg">
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
                          className="bg-primary hover:bg-primary/90 text-white"
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
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile render - simplified design with plain background
  const MobileLogin = () => (
    <div className="min-h-screen flex flex-col overflow-hidden bg-slate-950">
      {/* Plain background with no decorations */}
      
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center mb-8 fade-in">
          <div className="inline-block mb-4">
            <ClapperboardIcon className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 blue-text-glow">
            Welcome Back
          </h1>
          <p className="text-gray-300">
            Sign in to manage your Jellyfin server
          </p>
        </div>
        
        <div className="w-full max-w-md fade-in" style={{ animationDelay: "0.2s" }}>
          <Card className="bg-slate-900 border-primary/30">
            <CardContent className="pt-6">
              {!connectionStatus?.connected ? (
                <div className="text-center py-4">
                  {connectionStatus?.configured ? (
                    <>
                      <p className="mb-4 text-gray-300">
                        Server is configured but you are not connected
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
                        className="bg-primary hover:bg-primary/90 text-white"
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
        </div>
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
      
      {inviteCode && (
        <Alert className="mb-4 bg-blue-900/50 border-blue-800 text-white">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>You're joining with an invite code</AlertDescription>
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