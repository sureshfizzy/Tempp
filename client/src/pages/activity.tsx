import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { getConnectionStatus } from "@/lib/jellyfin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, Settings, CheckCircle, Users, Search, X, FileBarChart } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Activity data structure
interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  inviteCode?: string;
  username?: string;
  userId?: number;
  createdBy?: string;
  metadata?: Record<string, any>;
}

// Function to fetch activities from API
const fetchActivities = async (): Promise<ActivityItem[]> => {
  const response = await fetch('/api/activity');
  if (!response.ok) {
    throw new Error('Failed to fetch activity logs');
  }
  return response.json();
};

function ActivityPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [activityFilter, setActivityFilter] = useState("all");
  
  // Get Jellyfin connection status
  const connectionStatusQuery = useQuery({
    queryKey: ["/api/connection-status"],
    queryFn: getConnectionStatus,
    staleTime: 300000, // 5 minutes
  });
  
  // Fetch activity data
  const activityQuery = useQuery({
    queryKey: ["/api/activity"],
    queryFn: fetchActivities,
    staleTime: 60000, // 1 minute
  });

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      const res = await fetch("/api/disconnect", { method: "POST" });
      if (res.ok) {
        setLocation("/login");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  // Process activities data
  const activities = activityQuery.data || [];
  
  // Filter activities based on search query and activity type
  const filteredActivities = activities.filter((activity: ActivityItem) => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        activity.message.toLowerCase().includes(query) ||
        activity.inviteCode?.toLowerCase().includes(query) ||
        activity.username?.toLowerCase().includes(query) ||
        activity.createdBy?.toLowerCase().includes(query)
      );
      
      if (!matchesSearch) return false;
    }
    
    // Apply activity type filter
    if (activityFilter === 'all') return true;
    if (activityFilter === 'accounts' && (
      activity.type === 'account_created' || 
      activity.type === 'user_updated' || 
      activity.type === 'user_deleted' ||
      activity.type === 'user_disabled' ||
      activity.type === 'user_enabled'
    )) return true;
    if (activityFilter === 'invites' && activity.type.includes('invite_')) return true;
    if (activityFilter === 'system' && activity.type === 'system') return true;
    
    return false;
  });

  // Sort activities based on timestamp
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
  });
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header/Nav */}
      <header className="border-b border-border/40 bg-background">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/dashboard" className="hover:opacity-80">
              <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Jellyfin User Management
              </h1>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm flex items-center">
              <CheckCircle className="text-green-500 mr-1 h-4 w-4" />
              <span className="hidden md:inline">Connected to:</span>
              <span className="font-medium ml-1 max-w-xs truncate">
                {connectionStatusQuery.data?.serverUrl || "Jellyfin Server"}
              </span>
            </div>
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDisconnect}
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span>Disconnect</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Sidebar and Main Content */}
      <div className="flex flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-card border-r shadow-sm p-4">
          <nav className="space-y-1">
            <Link to="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-accent">
              <Settings className="mr-2 h-5 w-5" />
              Dashboard
            </Link>
            
            <Link to="/users" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-accent">
              <Users className="mr-2 h-5 w-5" />
              User Accounts
            </Link>
            
            <Link to="/activity" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-primary bg-opacity-10 text-primary">
              <FileBarChart className="mr-2 h-5 w-5" />
              Activity
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Activity</h2>
              <p className="text-muted-foreground mt-1">View all server activity and event logs</p>
            </div>
          </div>

          {/* Activity records */}
          <div className="space-y-4">
            {activityQuery.isLoading && (
              <p>Loading activity logs...</p>
            )}
            
            {activityQuery.isError && (
              <p>Error loading activity logs</p>
            )}
            
            {activityQuery.isSuccess && sortedActivities.length > 0 && (
              <div className="space-y-4">
                {sortedActivities.map((activity) => (
                  <Card key={activity.id} className="p-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{activity.message}</p>
                        <p className="text-sm text-muted-foreground">Type: {activity.type}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            {activityQuery.isSuccess && sortedActivities.length === 0 && (
              <p className="text-center p-4">No activity logs found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActivityPage;