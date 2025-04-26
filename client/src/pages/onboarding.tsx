import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { validateJellyfinUrl } from "@/lib/jellyfin";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowRight, CheckCircle, Settings, Key } from "lucide-react";

// Step 1: Server URL & API Key form schema
const serverConfigSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  apiKey: z.string().min(1, "API Key is required"),
});

// Step 2: Admin Credentials form schema
const credentialsFormSchema = z.object({
  adminUsername: z.string().min(1, "Username is required"),
  adminPassword: z.string().min(1, "Password is required"),
});

type ServerConfigData = z.infer<typeof serverConfigSchema>;
type CredentialsFormData = z.infer<typeof credentialsFormSchema>;

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [serverConfig, setServerConfig] = useState<{url: string, apiKey: string}>({url: "", apiKey: ""});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Use direct API calls
  const apiRequest = async (endpoint: string, options?: RequestInit) => {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${res.status}`);
    }
    
    return res.json();
  };

  // Step 1: Server Configuration form
  const serverForm = useForm<ServerConfigData>({
    resolver: zodResolver(serverConfigSchema),
    defaultValues: {
      url: "",
      apiKey: "",
    },
  });

  // Step 2: Admin Credentials form
  const credentialsForm = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsFormSchema),
    defaultValues: {
      adminUsername: "",
      adminPassword: "",
    },
  });

  // Handle Step 1 submission (server config)
  const onSubmitServerConfig = async (data: ServerConfigData) => {
    setIsLoading(true);
    try {
      // First validate the URL is reachable
      await validateJellyfinUrl(data.url);
      
      // Then save the server configuration to our database
      await apiRequest("/api/system/setup", {
        method: "POST",
        body: JSON.stringify(data),
      });
      
      // Store the config for step 2
      setServerConfig(data);
      
      // Move to step 2
      setStep(2);
      
      toast({
        title: "Server configured",
        description: "Your Jellyfin server is properly configured. Please enter your admin credentials.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Server setup failed",
        description: error instanceof Error ? error.message : "Failed to set up Jellyfin server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2 submission (admin credentials)
  const onSubmitCredentials = async (data: CredentialsFormData) => {
    setIsLoading(true);
    try {
      // Connect to Jellyfin with admin credentials
      await apiRequest("/api/connect", {
        method: "POST",
        body: JSON.stringify(data),
      });
      
      toast({
        title: "Connected successfully",
        description: "You are now connected to your Jellyfin server.",
        variant: "default",
      });
      
      // Navigate to dashboard after a short delay to allow toast to show
      setTimeout(() => {
        setLocation("/dashboard");
      }, 1000);
    } catch (error) {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to Jellyfin server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4">
              <Settings className="text-white h-10 w-10" />
            </div>
            <h1 className="text-2xl font-semibold text-neutral-800">Jellyfin User Management</h1>
            <p className="text-neutral-600 mt-2">Connect to your Jellyfin server to manage users</p>
            
            {/* Step indicator */}
            <div className="flex justify-center items-center mt-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 1 ? 'bg-primary text-white' : 'bg-primary-light text-primary'
              }`}>
                1
              </div>
              <div className="w-10 h-1 bg-gray-200">
                <div className={`h-full ${step === 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
            </div>
          </div>

          {step === 1 ? (
            <Form {...serverForm}>
              <form onSubmit={serverForm.handleSubmit(onSubmitServerConfig)} className="space-y-4">
                <FormField
                  control={serverForm.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Jellyfin Server URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://your-jellyfin-server.com" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <p className="text-xs text-neutral-500">Enter the base URL of your Jellyfin server</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={serverForm.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your Jellyfin API key" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <p className="text-xs text-neutral-500">Enter your Jellyfin API key (found in server dashboard under Advanced/API Keys)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-md transition-colors duration-300 mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-current"></div>
                      Validating...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...credentialsForm}>
              <form onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-md mb-4 flex items-center">
                  <CheckCircle className="text-green-500 mr-2 h-4 w-4" />
                  <span className="text-sm text-gray-700 truncate">
                    Server: <strong>{serverConfig.url}</strong>
                  </span>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md mb-4 flex items-center">
                  <Key className="text-blue-500 mr-2 h-4 w-4" />
                  <span className="text-sm text-gray-700">
                    API Key: <strong>••••••{serverConfig.apiKey.slice(-4)}</strong>
                  </span>
                </div>
              
                <FormField
                  control={credentialsForm.control}
                  name="adminUsername"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Admin Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Admin username" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <p className="text-xs text-neutral-500">Enter your Jellyfin administrator username</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={credentialsForm.control}
                  name="adminPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Admin Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Admin password" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <p className="text-xs text-neutral-500">Enter your Jellyfin administrator password</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  
                  <Button 
                    type="submit" 
                    className="flex-1 bg-primary hover:bg-primary-dark text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-current"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        Connect
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}