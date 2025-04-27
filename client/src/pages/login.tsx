import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { 
  getConnectionStatus
} from "@/lib/jellyfin";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { WandIcon, HogwartsShieldIcon } from "@/components/wizard-icons";
import { 
  HogwartsBackground, 
  FloatingFeather, 
  MagicalParticles,
  FloatingScrolls,
  LoginSuccessEffect,
  LoginErrorEffect
} from "@/components/magical-backgrounds";

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
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [castingSpell, setCastingSpell] = useState(false);
  const [showWandSparks, setShowWandSparks] = useState(false);

  // Get connection status to check if we have a server URL configured
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
      // Show success animation
      setLoginSuccess(true);
      
      // Delay navigation to allow animation to play
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
      const errorMessage = error instanceof Error ? error.message : "Invalid username or password";
      
      // Check if the error contains additional details
      const responseData = (error as any).responseData;
      const errorDetails = responseData?.details;
      
      // Set the user-facing error message
      setLoginError(errorDetails || errorMessage);
      
      // Show error animation
      setCastingSpell(false);

      // Display wizard-themed error toast
      toast({
        title: "Spell Failed!",
        description: errorDetails || "The enchantment was unsuccessful. Check your magical credentials.",
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

  // Submit handler with magical animations
  const onSubmit = async (data: LoginFormData) => {
    // Prevent submitting if already in progress
    if (isLoading) return;
    
    // Clear any previous errors
    setLoginError(null);
    setIsLoading(true);
    
    // Start spell casting animation
    setCastingSpell(true);
    setShowWandSparks(true);
    
    try {
      await loginMutation.mutateAsync(data);
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setShowWandSparks(false);
      }, 1500);
    }
  };

  // Handle reconnect (if the server connection is lost)
  const handleReconnect = () => {
    setLocation("/onboarding");
  };

  // Magical login form with Harry Potter theme
  const renderLoginForm = () => (
    <div className="min-h-screen flex flex-col overflow-hidden">
      {/* Magical Harry Potter themed background */}
      <HogwartsBackground />
      <MagicalParticles />
      <FloatingFeather />
      <FloatingScrolls />
      
      {/* Login success animation effect */}
      <LoginSuccessEffect active={loginSuccess} />
      
      {/* Login error animation effect */}
      <LoginErrorEffect active={!!loginError && !isLoading} />
      
      {/* Content Panel (Centered) */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header with server info */}
          <motion.div 
            className="mb-8 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center mb-4">
              <motion.div
                className="relative"
                whileHover={{ rotate: [0, -10, 10, -5, 5, 0], scale: 1.05 }}
                transition={{ duration: 1.5 }}
              >
                <HogwartsShieldIcon className="h-20 w-20 text-amber-300" />
                <div className="absolute inset-0 rounded-full magic-sparkle"></div>
              </motion.div>
            </div>
            
            <motion.h1 
              className="text-4xl font-bold text-amber-100 mb-2 magic-text"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {connectionStatus?.serverName || "Jellyfin Server"}
            </motion.h1>
            
            {connectionStatus?.connected && (
              <motion.div 
                className="text-amber-200/80 flex justify-center items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Connected to {connectionStatus.serverUrl}</span>
              </motion.div>
            )}
          </motion.div>
          
          {/* Login Card */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="hp-card overflow-hidden shadow-2xl p-6">
              {!connectionStatus?.connected ? (
                <div className="text-center py-4">
                  {connectionStatus?.configured ? (
                    <>
                      <p className="mb-4 text-amber-200">
                        Your magical portal is configured but not connected.
                        Present your credentials to enter.
                      </p>
                      <LoginFormContent />
                    </>
                  ) : (
                    <>
                      <p className="mb-4 text-amber-200">
                        You need to establish a connection with your magical realm first.
                      </p>
                      <Button 
                        onClick={handleReconnect}
                        className="hp-button"
                      >
                        <WandIcon className="mr-2 h-4 w-4" />
                        Connect to Realm
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <LoginFormContent />
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );

  // Login form contents with animations
  const LoginFormContent = () => (
    <AnimatePresence>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Username field */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="Wizard Name" 
                        className="hp-input h-12 pl-4"
                        {...field} 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700/50">
                        <motion.div 
                          className="feather-float"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          🧙
                        </motion.div>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-700" />
                </FormItem>
              )}
            />
          </motion.div>
          
          {/* Password field */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="password" 
                        placeholder="Secret Spell" 
                        className="hp-input h-12 pl-4"
                        {...field} 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700/50">
                        <motion.div 
                          className="feather-float"
                          whileHover={{ scale: 1.1, rotate: -5 }}
                        >
                          🔒
                        </motion.div>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-700" />
                </FormItem>
              )}
            />
          </motion.div>
          
          {/* Login button with magical effects */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="pt-2"
          >
            <Button 
              type="submit" 
              className="hp-button hp-button-spell w-full h-12 text-lg font-semibold"
              disabled={isLoading}
            >
              <motion.span 
                className="relative z-10 flex items-center justify-center"
                animate={castingSpell ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {isLoading ? (
                  <>
                    <WandIcon className={`mr-2 h-5 w-5 ${castingSpell ? 'wand-wave' : ''}`} />
                    <span>Casting Spell...</span>
                  </>
                ) : (
                  <>
                    <WandIcon className="mr-2 h-5 w-5" />
                    <span>Alohomora</span>
                  </>
                )}
              </motion.span>
            </Button>
          </motion.div>
          
          {/* Option to reconnect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center pt-4 border-t border-amber-700/20"
          >
            <p className="text-sm text-amber-200/90 mb-3">
              Need to connect to a different magical realm?
            </p>
            <Button 
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              className="hp-button"
            >
              <WandIcon className="mr-2 h-4 w-4" />
              Change Realm
            </Button>
          </motion.div>
        </form>
      </Form>
    </AnimatePresence>
  );

  // Use the same magical interface for both mobile and desktop
  return renderLoginForm();
}