import { useState, useEffect, useCallback, memo } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { getConnectionStatus } from "@/lib/jellyfin";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
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
  ShieldAlert,
  Wand2 
} from "lucide-react";
import {
  FloatingFeather,
  HogwartsBackground,
  MagicButton,
  MagicInput,
  MagicParchment,
  MagicShimmer,
  WandSparkle
} from "@/components/harry-potter-elements";

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

// Memorized version of the HogwartsBackground component to prevent re-renders
const MemoizedBackground = memo(HogwartsBackground);
const MemoizedFeather = memo(FloatingFeather);

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [errorShake, setErrorShake] = useState(false);
  const [magicSuccess, setMagicSuccess] = useState(false);

  // Get connection status to check if we have a server URL configured
  // Disable auto-refresh completely with fetched data
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [statusFetched, setStatusFetched] = useState(false);
  
  // One-time fetch on component mount only using useCallback to prevent recreating the function
  const fetchConnectionStatus = useCallback(async () => {
    if (statusFetched) return; // Prevent multiple fetches
    
    try {
      const data = await getConnectionStatus();
      setConnectionStatus(data);
      setStatusFetched(true);
    } catch (error) {
      console.error("Failed to fetch connection status:", error);
    }
  }, [statusFetched]);

  // Only fetch once on mount
  useEffect(() => {
    fetchConnectionStatus();
  }, [fetchConnectionStatus]);

  // Login mutation
  const loginMutation = useMutation<LoginResponse, Error, LoginFormData>({
    mutationFn: async (data: LoginFormData) => {
      return await apiRequest<LoginResponse>("/api/login", data);
    },
    onSuccess: (data: LoginResponse) => {
      // Show magical success transition
      setMagicSuccess(true);
      
      // Toast notification
      toast({
        title: "Magic Successful!",
        description: "Welcome to Hogwarts... err, your Jellyfin server!",
      });
      
      // Delay navigation for animation
      setTimeout(() => {
        // Force an immediate navigation based on admin status
        if (data.user.isAdmin) {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/user-profile";
        }
      }, 1800);
    },
    onError: (error) => {
      // Extract the main error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Invalid spell... I mean, username or password!";
      
      // Check if the error contains additional details
      const responseData = (error as any).responseData;
      const errorDetails = responseData?.details;
      
      // Set the user-facing error message
      setLoginError(errorDetails || errorMessage);
      
      // Trigger error shake animation
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 600);
      
      toast({
        title: "Spell Failed!",
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
      if (!magicSuccess) {
        setIsLoading(false);
      }
    }
  };

  // Handle reconnect (if the server connection is lost)
  const handleReconnect = () => {
    setLocation("/onboarding");
  };

  // Login form component with Harry Potter theming
  const LoginForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <motion.div 
          className="space-y-5"
          animate={errorShake ? { x: [-10, 10, -10, 10, -5, 5, -2, 2, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {loginError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Alert variant="destructive" className="bg-red-900/90 border-red-800 text-amber-50">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription className="font-serif">
                  {loginError}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-amber-200 font-serif ml-1">Wizard Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your username" 
                    className="border-amber-900/50 bg-amber-50/90 text-amber-950 
                              placeholder:text-amber-800/50 rounded-md px-3 py-2
                              focus:border-amber-500 focus:ring focus:ring-amber-500/50
                              font-serif"
                    {...field} 
                  />
                </FormControl>
                <FormMessage className="text-red-400 font-serif ml-1 text-sm" />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-amber-200 font-serif ml-1">Secret Spell</FormLabel>
                <FormControl>
                  <Input
                    type="password" 
                    placeholder="Enter your password" 
                    className="border-amber-900/50 bg-amber-50/90 text-amber-950 
                              placeholder:text-amber-800/50 rounded-md px-3 py-2
                              focus:border-amber-500 focus:ring focus:ring-amber-500/50
                              font-serif"
                    {...field} 
                  />
                </FormControl>
                <FormMessage className="text-red-400 font-serif ml-1 text-sm" />
              </FormItem>
            )}
          />

          <div className="pt-2">
            <MagicButton
              onClick={form.handleSubmit(onSubmit)}
              disabled={isLoading}
              isLoading={isLoading}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Cast Spell
            </MagicButton>
          </div>

          {connectionStatus?.configured && (
            <motion.div 
              className="mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-amber-200/70 text-sm font-serif mb-2">
                Need to change your magical portal?
              </p>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleReconnect}
                className="border-amber-700/50 text-amber-200 hover:bg-amber-950/50
                          font-serif text-xs"
              >
                <Wand2 className="mr-1 h-3 w-3" />
                Reconnect to Server
              </Button>
            </motion.div>
          )}
        </motion.div>
      </form>
    </Form>
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex justify-center items-center">
      {/* Background Elements */}
      <MemoizedBackground />
      
      {/* Animated feathers */}
      <MemoizedFeather delay={0} x={10} y={20} />
      <MemoizedFeather delay={2} x={85} y={15} />
      <MemoizedFeather delay={4} x={60} y={75} />
      
      {/* Mouse sparkle effect */}
      <WandSparkle />
      
      {/* Success animation overlay */}
      <AnimatePresence>
        {magicSuccess && (
          <motion.div 
            className="absolute inset-0 bg-amber-500/20 z-30 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="text-white text-4xl font-serif"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ 
                scale: 1.2, 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.3, duration: 0.8 }
              }}
            >
              <MagicShimmer delay={0.5}>
                <span className="block text-center text-amber-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
                  Magic Accepted!
                </span>
              </MagicShimmer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <motion.h1 
            className="text-4xl font-bold font-serif text-amber-100 mb-2 drop-shadow-[0_2px_5px_rgba(0,0,0,0.7)]"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <MagicShimmer>
              {connectionStatus?.serverName || "Jellyfin Manager"}
            </MagicShimmer>
          </motion.h1>
          <p className="text-amber-200/80 font-serif italic">
            Enter your magical credentials
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <MagicParchment>
            <AnimatePresence mode="wait">
              {!statusFetched ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center items-center py-10"
                >
                  <div className="text-amber-800 font-serif">Loading...</div>
                </motion.div>
              ) : !connectionStatus?.configured ? (
                <motion.div 
                  key="unconfigured"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-6"
                >
                  <p className="text-amber-900 font-serif mb-4">
                    You need to set up your Jellyfin server connection first.
                  </p>
                  <MagicButton onClick={handleReconnect}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Connect to Server
                  </MagicButton>
                </motion.div>
              ) : (
                <motion.div 
                  key="login-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <LoginForm />
                </motion.div>
              )}
            </AnimatePresence>
          </MagicParchment>
        </motion.div>
      </div>
    </div>
  );
}