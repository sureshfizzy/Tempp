import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
// Import the new users page instead of the old one
import UsersPage from "@/pages/users-new";
import LoginPage from "@/pages/login";
import UserProfilePage from "@/pages/user-profile";
import ActivityPage from "@/pages/activity";
import SettingsPage from "@/pages/settings";
import { useToast } from "@/hooks/use-toast";
import { ThemeProvider } from "@/hooks/use-theme";

// Helper function to check if the user is connected to Jellyfin
const checkConnectionStatus = async () => {
  try {
    const res = await fetch("/api/connection-status");
    if (!res.ok) return { connected: false, isAdmin: false, configured: false };
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error checking connection status:", error);
    return { connected: false, isAdmin: false, configured: false };
  }
};

function Router() {
  const [connectionStatus, setConnectionStatus] = useState<{ 
    connected: boolean; 
    isAdmin?: boolean;
    configured?: boolean;
  } | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Track URL changes to refresh auth state
  const [location] = useLocation();

  useEffect(() => {
    const loadConnectionStatus = async () => {
      const status = await checkConnectionStatus();
      setConnectionStatus(status);
      
      // Handle redirects based on connection status
      const path = window.location.pathname;
      
      // If system is configured but not on login page, redirect to login instead of onboarding
      if (!status.connected && status.configured && path === '/onboarding') {
        setLocation('/login');
      }
      // If not connected and on a protected page, redirect to login
      else if (!status.connected && path !== '/' && path !== '/login' && path !== '/onboarding') {
        setLocation('/login');
      } 
      // If connected and on root, redirect to appropriate dashboard
      else if (status.connected && path === '/') {
        setLocation(status.isAdmin ? '/dashboard' : '/user-profile');
      }
    };

    loadConnectionStatus();
    
    // Set up an interval to periodically check connection status
    // Longer interval (30 seconds) to avoid disrupting user interactions
    const intervalId = setInterval(loadConnectionStatus, 30000);
    
    // Clean up the interval on unmount
    return () => clearInterval(intervalId);
  }, [setLocation, location]);

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
              <Route path="/activity" component={ActivityPage} />
              <Route path="/settings" component={SettingsPage} />
            </>
          )}
        </>
      )}
      
      {/* Default redirect based on connection status */}
      <Route path="/">
        {() => {
          if (!connectionStatus.connected) {
            // If not connected but system is configured, go to login
            if (connectionStatus.configured) {
              return <LoginPage />;
            } else {
              // If not configured, go to onboarding
              return <Onboarding />;
            }
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
      <ThemeProvider defaultTheme="system">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
