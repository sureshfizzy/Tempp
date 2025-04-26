import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { getConnectionStatus } from "@/lib/jellyfin";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, CheckCircle, Settings, Film, ClapperboardIcon } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { MovieBackground } from "@/components/movie-background";
import { CinemaDecoration } from "@/components/cinema-decoration";

// Login form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

// Login response type
interface LoginResponse {
  message: string;
  user: {
    id: number;
    username: string;
    isAdmin: boolean;
  };
}

export default function LoginPage() {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Get connection status to check if we have a server URL configured
  // Disable auto-refresh completely with staleTime: Infinity
  const connectionQuery = useQuery({
    queryKey: ["/api/connection-status"],
    queryFn: getConnectionStatus,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

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

  // Desktop render
  const DesktopLogin = () => (
    <div className="min-h-screen flex overflow-hidden">
      {/* Movie background with gradient overlay */}
      <MovieBackground />
      
      {/* Left Panel (Content) */}
      <div className="relative w-full md:w-1/2 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <motion.div 
            className="mb-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="flex items-center justify-center mb-4">
              <Film className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 blue-text-glow">
              Jellyfin Manager
            </h1>
            <p className="text-gray-300">
              Your complete media server management solution
            </p>
          </motion.div>
          
          <Card className="cinema-card border-primary/20">
            <CardContent className="pt-6">
              {!connectionQuery.data?.connected ? (
                <div className="text-center py-4">
                  {connectionQuery.data?.configured ? (
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
                    <span>Connected to {connectionQuery.data.serverUrl}</span>
                  </div>
                  <LoginForm />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Right Panel (Big hero image) - only on desktop */}
      <div className="hidden md:block relative w-1/2">
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/80 z-10" />
      </div>
    </div>
  );

  // Mobile render - creative design based on reference
  const MobileLogin = () => (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-cinema-dark to-black">
      {/* Decorative elements */}
      <CinemaDecoration />
      
      {/* Content */}
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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
            <ClapperboardIcon className="h-16 w-16 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2 blue-text-glow">
            Welcome Back
          </h1>
          <p className="text-gray-300">
            Sign in to manage your Jellyfin server
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="cinema-card">
            <CardContent className="pt-6">
              {!connectionQuery.data?.connected ? (
                <div className="text-center py-4">
                  {connectionQuery.data?.configured ? (
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

  return isMobile ? <MobileLogin /> : <DesktopLogin />;
}