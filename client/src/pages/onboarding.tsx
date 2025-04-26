import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { connectToJellyfin, validateJellyfinUrl } from "@/lib/jellyfin";
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
import { ArrowRight, CheckCircle, Settings } from "lucide-react";

// Step 1: Server URL form schema
const urlFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

// Step 2: Credentials form schema
const credentialsFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type UrlFormData = z.infer<typeof urlFormSchema>;
type CredentialsFormData = z.infer<typeof credentialsFormSchema>;

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [serverUrl, setServerUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Step 1: Server URL form
  const urlForm = useForm<UrlFormData>({
    resolver: zodResolver(urlFormSchema),
    defaultValues: {
      url: "",
    },
  });

  // Step 2: Credentials form
  const credentialsForm = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Handle Step 1 submission (server URL)
  const onSubmitUrl = async (data: UrlFormData) => {
    setIsLoading(true);
    try {
      // Validate the Jellyfin server URL
      await validateJellyfinUrl(data.url);
      
      // Store the URL for step 2
      setServerUrl(data.url);
      
      // Move to step 2
      setStep(2);
      
      toast({
        title: "Server validated",
        description: "Your Jellyfin server is reachable. Please enter your credentials.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Server validation failed",
        description: error instanceof Error ? error.message : "Failed to validate Jellyfin server URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2 submission (credentials)
  const onSubmitCredentials = async (data: CredentialsFormData) => {
    setIsLoading(true);
    try {
      await connectToJellyfin(serverUrl, data.username, data.password);
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
            <Form {...urlForm}>
              <form onSubmit={urlForm.handleSubmit(onSubmitUrl)} className="space-y-4">
                <FormField
                  control={urlForm.control}
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
                    Server: <strong>{serverUrl}</strong>
                  </span>
                </div>
              
                <FormField
                  control={credentialsForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your Jellyfin username" 
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
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Your Jellyfin password" 
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
