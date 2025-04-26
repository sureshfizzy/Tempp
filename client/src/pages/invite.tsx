import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// UI components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CinemaDecoration } from "@/components/cinema-decoration";
import { Ticket, User, Loader2, AlertCircle, Film, Check } from "lucide-react";

// Form validation schema
const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscore, and dash"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
  confirmPassword: z
    .string()
    .min(8, "Please confirm your password"),
  email: z
    .string()
    .email("Please enter a valid email")
    .optional()
    .or(z.literal(""))
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], 
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function InvitePage() {
  const [location, setLocation] = useLocation();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<{
    valid: boolean;
    label?: string;
    profileId?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Form setup
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
    },
  });

  // Extract invite code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    
    if (code) {
      setInviteCode(code);
      fetchInviteDetails(code);
    } else {
      setIsLoading(false);
      setErrorMessage("No invite code provided. Please use a valid invite link.");
    }
  }, []);

  // Fetch invite details
  const fetchInviteDetails = async (code: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/invites/by-code/${code}`);
      const data = await response.json();
      
      if (response.ok) {
        setInviteDetails(data);
      } else {
        setErrorMessage(data.error || "Invalid or expired invite code.");
      }
    } catch (error) {
      setErrorMessage("Failed to verify invite code. Please try again later.");
      console.error("Error fetching invite details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      if (!inviteCode) throw new Error("No invite code provided");
      
      // Extract the fields needed for the API
      const payload = {
        username: data.username,
        password: data.password,
        email: data.email || undefined
      };
      
      return apiRequest("POST", `/api/invites/register/${inviteCode}`, payload);
    },
    onSuccess: () => {
      setRegistrationComplete(true);
      toast({
        title: "Registration successful!",
        description: "Your account has been created. You can now log in.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create your account. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  // Layout for the cinema-themed invite page
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="fixed inset-0 opacity-10">
        <CinemaDecoration />
      </div>
      
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/80 border border-gray-800 backdrop-blur-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto rounded-full bg-primary/20 p-3 mb-3">
              <Ticket className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-white">Welcome to Jellyfin</CardTitle>
            <CardDescription className="text-gray-400">
              {isLoading ? (
                "Verifying your invitation..."
              ) : inviteDetails?.valid ? (
                inviteDetails.label 
                  ? `You've been invited to join ${inviteDetails.label}`
                  : "You've been invited to join this Jellyfin server"
              ) : (
                "Create your Jellyfin account"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : errorMessage ? (
              <Alert variant="destructive" className="bg-red-950/50 border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : registrationComplete ? (
              <div className="text-center py-6 space-y-4">
                <div className="mx-auto bg-green-900/20 rounded-full p-3 w-16 h-16 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold">Registration Complete!</h3>
                <p className="text-gray-400">
                  Your account has been created successfully. You can now log in to access your Jellyfin media.
                </p>
                <Button 
                  className="mt-4 w-full bg-primary text-white hover:bg-primary/90"
                  onClick={() => setLocation("/login")}
                >
                  Go to Login
                </Button>
              </div>
            ) : inviteDetails?.valid ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Choose a username" 
                            className="border-gray-700 bg-gray-900/50 text-white" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-gray-500">
                          This will be your login username
                        </FormDescription>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Create a strong password" 
                            className="border-gray-700 bg-gray-900/50 text-white" 
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
                        <FormLabel className="text-gray-300">Confirm Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Confirm your password" 
                            className="border-gray-700 bg-gray-900/50 text-white" 
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
                        <FormLabel className="text-gray-300">Email (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="Your email address (optional)" 
                            className="border-gray-700 bg-gray-900/50 text-white" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-gray-500">
                          Used for password recovery (optional)
                        </FormDescription>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-center w-full text-sm text-gray-500">
              {!registrationComplete && !errorMessage && (
                <>
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center justify-center mt-4">
              <Film className="h-4 w-4 text-primary mr-1" />
              <span className="text-xs text-gray-600">Jellyfin User Management</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}