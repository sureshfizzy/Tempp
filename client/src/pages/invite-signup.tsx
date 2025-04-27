import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ClapperboardIcon, Film, AlertCircle, CheckCircle2, Loader2, ArrowRight, Users } from "lucide-react";
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
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form schema for user registration with validation
const inviteSignupSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be less than 32 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Infer the type from the schema
type InviteSignupData = z.infer<typeof inviteSignupSchema>;

// Define the invite data structure
interface InviteData {
  code: string;
  label?: string;
  userLabel?: string;
  profileId?: string;
  expiresAt?: string;
  maxUses?: number;
  usedCount?: number;
  usesRemaining?: number | null;
  userExpiryEnabled?: boolean;
  userExpiryMonths?: number;
  userExpiryDays?: number;
  userExpiryHours?: number;
}

export default function InviteSignupPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/invite/:code");
  const inviteCode = params?.code;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Fetch invite details
  const {
    data: invite,
    isLoading: isLoadingInvite,
    error: inviteError,
  } = useQuery({
    queryKey: ["/api/invites/by-code", inviteCode],
    queryFn: () => apiRequest<InviteData>(`/api/invites/by-code/${inviteCode}`),
    enabled: !!inviteCode,
  });

  // Check if invite is expired
  const isExpired = invite?.expiresAt && new Date(invite.expiresAt) < new Date();
  const isFullyUsed = invite?.maxUses !== null && invite?.usedCount !== undefined && invite?.maxUses !== undefined && 
    invite.usedCount >= invite.maxUses;

  // Form definition
  const form = useForm<InviteSignupData>({
    resolver: zodResolver(inviteSignupSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
    },
  });

  // Mutation for creating a user account from invite
  const signupMutation = useMutation({
    mutationFn: async (data: Omit<InviteSignupData, "confirmPassword">) => {
      return await apiRequest(`/api/invites/use/${inviteCode}`, {
        ...data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Account created successfully",
        description: "Your account has been created. You can now sign in.",
      });
      // Redirect to login page
      setLocation("/login");
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to create account";
      setSignupError(errorMessage);
      toast({
        variant: "destructive",
        title: "Account creation failed",
        description: errorMessage,
      });
    },
  });

  // Submit handler
  const onSubmit = async (data: InviteSignupData) => {
    if (isLoading) return;
    setSignupError(null);
    setIsLoading(true);

    // Remove confirmPassword before sending to API
    const { confirmPassword, ...signupData } = data;
    
    try {
      await signupMutation.mutateAsync(signupData);
    } catch (err) {
      console.error("Signup error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle invite error or expiration
  if (inviteError || isExpired || isFullyUsed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950">
        <Card className="w-full max-w-md bg-slate-900 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400">Invalid Invite</CardTitle>
            <CardDescription>This invite cannot be used</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {isExpired ? "This invite has expired." : 
                 isFullyUsed ? "This invite has reached its maximum number of uses." : 
                 "This invite code is invalid or has been revoked."}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => setLocation("/login")}
            >
              Return to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoadingInvite) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white">Loading invite...</h3>
        </div>
      </div>
    );
  }

  // Render the signup form
  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-slate-950">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center fade-in">
            <div className="flex items-center justify-center mb-4">
              <Film className="h-14 w-14 text-primary blue-glow" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 blue-text-glow">
              Create Your Account
            </h1>
            {invite?.userLabel && (
              <p className="text-gray-300">
                Welcome {invite.userLabel}! Set up your Jellyfin account.
              </p>
            )}
          </div>
          
          <div className="fade-in" style={{ animationDelay: "0.2s" }}>
            <Card className="bg-slate-900 border-primary/30 shadow-lg">
              <CardContent className="pt-6">
                {invite && (
                  <div className="mb-6">
                    <div className="flex items-center text-teal-400 mb-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      <span>Valid invite</span>
                    </div>
                    {invite.label && (
                      <p className="text-gray-300 text-sm mb-2">
                        {invite.label}
                      </p>
                    )}
                    
                    {/* Show account expiration information if enabled */}
                    {invite.userExpiryEnabled && (
                      <div className="mt-2 text-xs text-amber-400 bg-amber-900/30 p-2 rounded-md flex items-start">
                        <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">Time-limited account</span>
                          <p className="text-amber-300/80 mt-1">
                            This account will expire after{' '}
                            {invite.userExpiryMonths ? `${invite.userExpiryMonths} month${invite.userExpiryMonths !== 1 ? 's' : ''}` : ''}
                            {invite.userExpiryMonths && invite.userExpiryDays ? ' and ' : ''}
                            {invite.userExpiryDays ? `${invite.userExpiryDays} day${invite.userExpiryDays !== 1 ? 's' : ''}` : ''}
                            {((invite.userExpiryMonths || invite.userExpiryDays) && invite.userExpiryHours) ? ' and ' : ''}
                            {invite.userExpiryHours ? `${invite.userExpiryHours} hour${invite.userExpiryHours !== 1 ? 's' : ''}` : ''}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Show invite usage information if limited */}
                    {invite.maxUses !== null && (
                      <div className="mt-2 text-xs text-blue-400 bg-blue-900/30 p-2 rounded-md flex items-center">
                        <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          This invite can be used {invite.usesRemaining} more time{invite.usesRemaining !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {signupError && (
                  <Alert variant="destructive" className="mb-4 bg-red-900/50 border-red-800 text-white">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{signupError}</AlertDescription>
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
                              placeholder="Choose a username" 
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
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Email (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter your email" 
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
                              placeholder="Create a strong password" 
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
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm your password" 
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
                        {isLoading ? "Creating Account..." : "Create Account"}
                        {!isLoading && <ArrowRight className="ml-2 h-4 w-4 inline" />}
                      </span>
                      <span className="absolute inset-0 w-0 bg-blue-700 transition-all duration-500 ease-out group-hover:w-full"></span>
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}