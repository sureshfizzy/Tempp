import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { validateJellyfinUrl } from "@/lib/jellyfin";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  ArrowRight, 
  CheckCircle, 
  Settings, 
  Key, 
  Ticket, 
  AlertCircle, 
  User
} from "lucide-react";

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

// Add interface for invite data
interface InviteData {
  id: number;
  code: string;
  label: string | null;
  userLabel: string | null;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  userExpiryEnabled: boolean;
  userExpiryHours: number;
  isExpired: boolean;
  isFullyUsed: boolean;
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [serverConfig, setServerConfig] = useState<{url: string, apiKey: string}>({url: "", apiKey: ""});
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Extract invite code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    
    if (code) {
      setInviteCode(code);
      fetchInviteData(code);
    }
  }, []);
  
  // Fetch invite details if code is present
  const fetchInviteData = async (code: string) => {
    setInviteLoading(true);
    setInviteError(null);
    
    try {
      const data = await apiRequest(`/api/invites/${code}`);
      setInviteData(data);
      
      // If invite is invalid (expired/used up), show error
      if (data.isExpired || data.isFullyUsed) {
        setInviteError(data.isExpired 
          ? "This invite has expired." 
          : "This invite has reached its maximum usage limit.");
      }
    } catch (error) {
      setInviteError("Invalid or expired invite code.");
      console.error("Error fetching invite:", error);
    } finally {
      setInviteLoading(false);
    }
  };
  
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
      // If connecting with an invite code, include it in the request
      const requestBody = inviteCode 
        ? { ...data, inviteCode } 
        : data;
      
      // Connect to Jellyfin with admin credentials
      await apiRequest("/api/connect", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });
      
      // If this was an invite, try to use/redeem it
      if (inviteCode && !inviteError) {
        try {
          await apiRequest(`/api/invites/${inviteCode}/use`, {
            method: "POST",
            body: JSON.stringify({ username: data.adminUsername }),
          });
        } catch (error) {
          console.error("Failed to process invite:", error);
          // Continue even if invite processing fails
        }
      }
      
      toast({
        title: "Connected successfully",
        description: inviteCode && !inviteError 
          ? "You have successfully joined the Jellyfin server via invite." 
          : "You are now connected to your Jellyfin server.",
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
              {inviteCode && !inviteError ? (
                <Ticket className="text-white h-10 w-10" />
              ) : (
                <Settings className="text-white h-10 w-10" />
              )}
            </div>
            <h1 className="text-2xl font-semibold text-neutral-800">
              {inviteCode && !inviteError ? "Join Jellyfin Server" : "Jellyfin User Management"}
            </h1>
            <p className="text-neutral-600 mt-2">
              {inviteCode && !inviteError
                ? "You've been invited to join a Jellyfin server"
                : "Connect to your Jellyfin server to manage users"}
            </p>
            
            {/* Invite information section */}
            {inviteCode && (
              <div className="mt-4">
                {inviteLoading ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent border-primary"></div>
                    <span className="ml-2 text-sm text-neutral-600">Validating invite...</span>
                  </div>
                ) : inviteError ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Invalid Invite</AlertTitle>
                    <AlertDescription>{inviteError}</AlertDescription>
                  </Alert>
                ) : inviteData && (
                  <div className="bg-primary/5 rounded-md p-4 border border-primary/20 mt-2 mb-4">
                    <div className="flex items-center mb-2">
                      <Ticket className="h-5 w-5 text-primary mr-2" />
                      <h3 className="font-medium text-sm">Valid Invite</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                      {inviteData.label && (
                        <p className="text-left">
                          <span className="text-neutral-500">Invite name:</span> {inviteData.label}
                        </p>
                      )}
                      <p className="text-left">
                        <span className="text-neutral-500">Created by:</span> {inviteData.createdBy}
                      </p>
                      {inviteData.userLabel && (
                        <p className="text-left">
                          <span className="text-neutral-500">User role:</span> {inviteData.userLabel}
                        </p>
                      )}
                      <p className="text-left">
                        <span className="text-neutral-500">Expires:</span> {new Date(inviteData.expiresAt).toLocaleDateString()}
                      </p>
                      <p className="text-left">
                        <span className="text-neutral-500">Uses:</span> {inviteData.usedCount}/{inviteData.maxUses === 0 ? "∞" : inviteData.maxUses}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
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