import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import { useToast } from "@/hooks/use-toast";

// Helper function to check if the user is connected to Jellyfin
const checkConnectionStatus = async () => {
  try {
    const res = await fetch("/api/connection-status");
    if (!res.ok) return false;
    
    const data = await res.json();
    return data.connected;
  } catch (error) {
    console.error("Error checking connection status:", error);
    return false;
  }
};

function Router() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadConnectionStatus = async () => {
      const connected = await checkConnectionStatus();
      setIsConnected(connected);
    };

    loadConnectionStatus();
  }, []);

  // Show a loading state while checking connection
  if (isConnected === null) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isConnected ? (
        <Route path="/" component={Onboarding} />
      ) : (
        <Route path="/" component={Dashboard} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
