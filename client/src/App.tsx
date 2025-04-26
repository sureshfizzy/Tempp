import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import UsersPage from "@/pages/users";
import LoginPage from "@/pages/login";
import UserProfilePage from "@/pages/user-profile";
import { useToast } from "@/hooks/use-toast";

// Helper function to check if the user is connected to Jellyfin
const checkConnectionStatus = async () => {
  try {
    const res = await fetch("/api/connection-status");
    if (!res.ok) return { connected: false, isAdmin: false };
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error checking connection status:", error);
    return { connected: false, isAdmin: false };
  }
};

function Router() {
  const [connectionStatus, setConnectionStatus] = useState<{ 
    connected: boolean; 
    isAdmin?: boolean; 
  } | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const loadConnectionStatus = async () => {
      const status = await checkConnectionStatus();
      setConnectionStatus(status);
      
      // Handle redirects based on connection status
      const path = window.location.pathname;
      
      if (!status.connected && path !== '/' && path !== '/login' && path !== '/onboarding') {
        // If not connected and not on onboarding/login, redirect to login
        setLocation('/login');
      } else if (status.connected && path === '/') {
        // If connected and on root, redirect to appropriate dashboard
        setLocation(status.isAdmin ? '/dashboard' : '/user-profile');
      }
    };

    loadConnectionStatus();
  }, [setLocation]);

  // Show a loading state while checking connection
  if (connectionStatus === null) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/login" component={LoginPage} />
      <Route path="/onboarding" component={Onboarding} />
      
      {/* Protected routes - only when connected */}
      {connectionStatus.connected && (
        <>
          {/* Routes for all users */}
          <Route path="/user-profile" component={UserProfilePage} />
          
          {/* Admin-only routes */}
          {connectionStatus.isAdmin && (
            <>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/users" component={UsersPage} />
            </>
          )}
        </>
      )}
      
      {/* Default redirect based on connection status */}
      <Route path="/">
        {() => {
          if (!connectionStatus.connected) {
            return <LoginPage />;
          } else if (connectionStatus.isAdmin) {
            return <Dashboard />;
          } else {
            return <UserProfilePage />;
          }
        }}
      </Route>
      
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
