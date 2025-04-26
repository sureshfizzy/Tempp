import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { connectToJellyfin } from "@/lib/jellyfin";
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

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Onboarding() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await connectToJellyfin(data.url, data.username, data.password);
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
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
                control={form.control}
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

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-md transition-colors duration-300 mt-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-current"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect to Jellyfin
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
