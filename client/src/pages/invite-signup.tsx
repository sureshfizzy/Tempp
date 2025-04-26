import { useState, useEffect } from "react";
import { useLocation, useRoute, useRouter } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { CinemaDecoration } from "@/components/cinema-decoration";
import { MovieBackground } from "@/components/movie-background";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

// Form schema for registration
const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Please enter a valid email address"),
  inviteCode: z.string().min(1, "Invite code is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function InviteSignupPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/invite/:code");
  const [inviteInfo, setInviteInfo] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Get the invite code from URL params
  const inviteCode = params?.code || "";
  
  // Initialize form with the invite code
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      inviteCode,
    },
  });
  
  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/register", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to register");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSuccess("Your account has been created successfully! You will be redirected to the dashboard shortly.");
      // Show success toast
      toast({
        title: "Registration successful!",
        description: "Your account has been created successfully. Redirecting to the dashboard...",
        variant: "default",
      });
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to register");
      toast({
        title: "Registration failed",
        description: error.message || "Failed to register",
        variant: "destructive",
      });
    },
  });
  
  // Fetch invite info on component mount
  useEffect(() => {
    async function fetchInviteInfo() {
      if (!inviteCode) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/invites/by-code/${inviteCode}`);
        
        if (!response.ok) {
          throw new Error(response.statusText || "Failed to fetch invite information");
        }
        
        const data = await response.json();
        setInviteInfo(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch invite information");
        toast({
          title: "Error",
          description: "This invite code is invalid or has expired.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchInviteInfo();
  }, [inviteCode, toast]);
  
  // Handle form submission
  const onSubmit = (data: FormData) => {
    registerMutation.mutate(data);
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MovieBackground variant="dark" />
      
      <div className="container mx-auto py-8 flex flex-1 flex-col md:flex-row gap-6 items-center relative z-10">
        {/* Left column - invite information */}
        <div className="flex-1 hidden md:block">
          <div className="max-w-md mx-auto">
            <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
              You're invited to join!
            </h1>
            
            <div className="space-y-6">
              <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Invitation Details</h2>
                
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {error}
                    </AlertDescription>
                  </Alert>
                ) : inviteInfo ? (
                  <div className="space-y-4">
                    {inviteInfo.label && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Invitation Name</p>
                        <p className="text-lg font-medium">{inviteInfo.label}</p>
                      </div>
                    )}
                    
                    {inviteInfo.userLabel && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">User Type</p>
                        <p className="text-lg font-medium">{inviteInfo.userLabel}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Invite Code</p>
                      <p className="text-lg font-medium">{inviteCode}</p>
                    </div>
                    
                    {inviteInfo.expiresAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Expires</p>
                        <p className="text-lg font-medium">
                          {new Date(inviteInfo.expiresAt).toLocaleDateString()} 
                          {" "}
                          {new Date(inviteInfo.expiresAt).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No invite information available.</p>
                )}
              </div>
              
              <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 shadow-md">
                <CinemaDecoration simplified />
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column - sign up form */}
        <div className="flex-1 w-full md:w-auto md:max-w-md">
          <Card className="shadow-lg border-0 bg-card/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
              <CardDescription>
                Register using the invitation code to access the platform
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {success ? (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Success!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {success}
                  </AlertDescription>
                </Alert>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your username" 
                              {...field} 
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter your email" 
                              {...field} 
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Create a password" 
                              {...field} 
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="inviteCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invite Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your invite code" 
                              {...field} 
                              disabled={true}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Separator />
              <div className="flex justify-between items-center w-full">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/auth")}
                  disabled={registerMutation.isPending}
                >
                  Back to Login
                </Button>
                <ThemeToggle />
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}