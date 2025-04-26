import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { getConnectionStatus } from "@/lib/jellyfin";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Settings } from "lucide-react";

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
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Get connection status to check if we have a server URL configured
  const connectionQuery = useQuery({
    queryKey: ["/api/connection-status"],
    queryFn: getConnectionStatus,
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
      
      // Redirect based on admin status
      if (data.user.isAdmin) {
        setLocation("/dashboard");
      } else {
        setLocation("/user-profile");
      }
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid username or password",
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

  // Submit handler
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reconnect (if the server connection is lost)
  const handleReconnect = () => {
    setLocation("/onboarding");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="w-full max-w-md px-4">
        <Card className="shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold">Login to Jellyfin</CardTitle>
            <CardDescription>
              {connectionQuery.data?.connected ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>Connected to {connectionQuery.data.serverUrl}</span>
                </div>
              ) : (
                <div className="text-orange-500">
                  Not connected to a Jellyfin server
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!connectionQuery.data?.connected ? (
              <div className="text-center py-4">
                {connectionQuery.data?.configured ? (
                  <>
                    <p className="mb-4 text-gray-600">
                      Your Jellyfin server is configured but you are not connected.
                      Please log in with your credentials.
                    </p>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your username" {...field} />
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
                                <Input type="password" placeholder="Enter your password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full mt-4" 
                          disabled={isLoading}
                        >
                          {isLoading ? "Logging in..." : "Login"}
                          {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                      </form>
                    </Form>
                    <div className="mt-4 pt-4 border-t text-center">
                      <p className="text-sm text-gray-500 mb-2">
                        Need to connect to a different server?
                      </p>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={handleReconnect}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Reconfigure Server
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-4 text-gray-600">
                      You need to connect to a Jellyfin server first before you can log in.
                    </p>
                    <Button onClick={handleReconnect}>
                      Connect to Server
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
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
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full mt-4" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Logging in..." : "Login"}
                      {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </form>
                </Form>
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm text-gray-500 mb-2">
                    Need to connect to a different server?
                  </p>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={handleReconnect}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Reconfigure Server
                  </Button>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4">
            <p className="text-sm text-gray-500">
              Need help? Contact your Jellyfin administrator.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}