import { useState, useEffect, useCallback, memo } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { getConnectionStatus } from "@/lib/jellyfin";
import { showGlobalLoader } from "@/components/transition-loader";
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
import { 
  AlertCircle, 
  ArrowRight, 
  ClapperboardIcon,
  Lock,
  User
} from "lucide-react";

// Form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

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

// Add some CSS for animations
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  @keyframes glow {
    0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
    50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
    100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
  }
  
  .fade-in {
    animation: fadeIn 0.6s ease forwards;
  }
  
  .scale-in {
    animation: scaleIn 0.4s ease forwards;
  }
  
  .blue-glow {
    animation: glow 3s infinite;
  }
  
  .icon-pulse {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  .slide-up {
    transition: transform 0.4s ease, opacity 0.4s ease;
  }
  
  .slide-up:hover {
    transform: translateY(-5px);
  }
`;

// Memo-ized login form component to prevent unnecessary re-renders
const LoginForm = memo(({ onSubmit, isLoading, loginError, form }: any) => (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <AnimatePresence>
        {loginError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive" className="mb-4 bg-red-900/50 border-red-800 text-white">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-200">Username</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="Enter your username" 
                    className="border-gray-600 bg-gray-800/60 text-white pl-10 placeholder:text-gray-500"
                    {...field} 
                  />
                  <User className="absolute top-1/2 left-3 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-200">Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type="password" 
                    placeholder="Enter your password" 
                    className="border-gray-600 bg-gray-800/60 text-white pl-10 placeholder:text-gray-500"
                    {...field} 
                  />
                  <Lock className="absolute top-1/2 left-3 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Button 
          type="submit" 
          className="w-full mt-4 bg-primary hover:bg-primary/90 text-white transition-all duration-300 relative overflow-hidden"
          disabled={isLoading}
        >
          <motion.div
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </motion.div>
        </Button>
      </motion.div>
    </form>
  </Form>
));

// Prevent unnecessary re-renders by using memo
LoginForm.displayName = "LoginForm";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  
  // Form definition with memo to prevent re-renders
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
    mode: "onSubmit", // Only validate on submit to prevent constant re-renders
  });

  // One-time fetch on component mount only
  useEffect(() => {
    let isMounted = true;
    
    const fetchConnectionStatus = async () => {
      try {
        const data = await getConnectionStatus();
        if (isMounted) {
          setConnectionStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch connection status:", error);
      }
    };
    
    fetchConnectionStatus();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  // Memoize submit handler to prevent recreation on each render
  const onSubmit = useCallback(async (data: LoginFormData) => {
    if (isLoading) return;
    
    setLoginError(null);
    setIsLoading(true);
    
    try {
      // Use fetch directly instead of React Query mutation to reduce re-renders
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Invalid username or password");
      }
      
      const responseData: LoginResponse = await response.json();
      
      // Show success toast
      toast({
        title: "Login successful",
        description: "You have been logged in successfully",
      });
      
      // First, finish the login animation
      setTimeout(() => {
        // Then, activate our global loading screen that stays visible during navigation
        showGlobalLoader("Logging you in...");
        
        // Finally, navigate
        setTimeout(() => {
          if (responseData.user.isAdmin) {
            window.location.href = "/dashboard";
          } else {
            window.location.href = "/user-profile";
          }
        }, 500);
      }, 800);
      
    } catch (err: any) {
      setLoginError(err.message || "Invalid username or password");
      
      toast({
        title: "Login failed",
        description: err.message || "Invalid username or password",
        variant: "destructive",
      });
      
      setIsLoading(false);
    }
  }, [isLoading, toast]);

  // Handle reconnect
  const handleReconnect = useCallback(() => {
    setLocation("/onboarding");
  }, [setLocation]);

  return (
    <>
      <style>{animationStyles}</style>
      
      {/* We no longer need this local loading screen as we're using the global one */}
      
      <div className="min-h-screen overflow-hidden bg-slate-950 flex flex-col">
        {/* Logo and server information at the top */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="pt-8 pb-4 text-center"
        >
          <div className="inline-block mb-2">
            <ClapperboardIcon className="h-16 w-16 text-primary icon-pulse" />
          </div>
          <motion.h1 
            className="text-3xl font-bold text-white mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {connectionStatus?.serverName || "Jellyfin Manager"}
          </motion.h1>
          {connectionStatus?.serverUrl && (
            <motion.p 
              className="text-gray-400 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {connectionStatus.serverUrl}
            </motion.p>
          )}
        </motion.div>
        
        {/* Main content - Login card */}
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            className="w-full max-w-md"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Card className="bg-slate-900 border-primary/30 shadow-xl overflow-hidden">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <CardContent className="p-6">
                  {!connectionStatus ? (
                    <div className="flex justify-center py-8">
                      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                    </div>
                  ) : !connectionStatus.configured ? (
                    <div className="text-center py-4">
                      <motion.p 
                        className="mb-4 text-gray-300"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        You need to connect to a Jellyfin server first before you can log in.
                      </motion.p>
                      <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <Button 
                          onClick={handleReconnect}
                          className="bg-primary hover:bg-primary/90 text-white"
                        >
                          Connect to Server
                        </Button>
                      </motion.div>
                    </div>
                  ) : (
                    <LoginForm 
                      onSubmit={onSubmit} 
                      isLoading={isLoading} 
                      loginError={loginError}
                      form={form}
                    />
                  )}
                </CardContent>
              </motion.div>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
}