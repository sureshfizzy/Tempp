import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { getConnectionStatus } from "@/lib/jellyfin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Settings, CheckCircle, Users, Search, X, FileBarChart } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
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
      activity.type === 'user_disabled'
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
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Jellyfin User Management</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm flex items-center">
              <CheckCircle className="text-green-300 mr-1 h-4 w-4" />
              <span className="hidden md:inline">Connected to:</span>
              <span className="font-medium ml-1 max-w-xs truncate">
                {connectionStatusQuery.data?.serverUrl || "Jellyfin Server"}
              </span>
            </div>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white"
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
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Activity</h2>
            <p className="text-muted-foreground">View all server activity and event logs</p>
          </div>

          {/* Activity Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="w-full md:w-1/3 relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="pl-8 w-full" 
                    placeholder="Search" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2" 
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Filters</span>
                    <Select 
                      value={activityFilter}
                      onValueChange={(value) => setActivityFilter(value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="accounts">Accounts</SelectItem>
                        <SelectItem value="invites">Invites</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Sort Direction</span>
                    <Select 
                      value={sortDirection}
                      onValueChange={(value) => setSortDirection(value as "asc" | "desc")}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Newest first" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Newest first</SelectItem>
                        <SelectItem value="asc">Oldest first</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading state */}
          {activityQuery.isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="ml-3 text-muted-foreground">Loading activity logs...</p>
            </div>
          )}

          {/* Error state */}
          {activityQuery.isError && (
            <div className="text-center py-8 bg-destructive/10 rounded-md text-destructive">
              <p>Error loading activity logs. Please try again later.</p>
            </div>
          )}

          {/* Activity Listing - only show when data is loaded */}
          {activityQuery.isSuccess && (
            <div>
              <div className="text-sm text-muted-foreground mb-4">
                {filteredActivities.length} TOTAL RECORDS {filteredActivities.length} LOADED {filteredActivities.length} SHOWN
              </div>
              
              <div className="space-y-4">
                {sortedActivities.map((activity) => {
                  // Replace the dynamic color classes with fixed ones based on activity type
                  let bgColorClass = 'bg-blue-500'; 
                  let textColorClass = 'text-white';
                  
                  // Set appropriate colors based on activity type
                  if (activity.type.includes('expired')) {
                    bgColorClass = 'bg-amber-500';
                  } else if (activity.type === 'account_created') {
                    bgColorClass = 'bg-blue-500';
                  } else if (activity.type.includes('invite_')) {
                    bgColorClass = 'bg-green-500';
                  } else if (activity.type === 'user_updated') {
                    bgColorClass = 'bg-purple-500';
                  } else if (activity.type === 'user_deleted') {
                    bgColorClass = 'bg-red-500';
                  } else if (activity.type === 'user_disabled') {
                    bgColorClass = 'bg-orange-500';
                  } else if (activity.type === 'system') {
                    bgColorClass = 'bg-gray-500';
                  }
                  
                  return (
                    <div 
                      key={activity.id} 
                      className={`${bgColorClass} ${textColorClass} p-4 rounded-md shadow-sm transition-all hover:shadow-md`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{activity.message}</h3>
                          {activity.type === "account_created" && activity.inviteCode && (
                            <p className="text-sm opacity-90">FROM INVITE {activity.inviteCode}</p>
                          )}
                          {activity.createdBy && (
                            <p className="text-sm opacity-90">BY {activity.createdBy}</p>
                          )}
                          {activity.type === "user_disabled" && activity.metadata?.reason && (
                            <p className="text-sm opacity-90">REASON: {activity.metadata.reason}</p>
                          )}
                          {activity.type === "user_updated" && activity.metadata?.updates && Array.isArray(activity.metadata.updates) && (
                            <p className="text-sm opacity-90">UPDATES: {activity.metadata.updates.join(', ')}</p>
                          )}
                          {activity.type === "invite_used" && activity.metadata?.usesLeft !== undefined && (
                            <p className="text-sm opacity-90">USES LEFT: {activity.metadata.usesLeft}</p>
                          )}
                        </div>
                        <div className="text-sm opacity-80">{activity.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
                
                {filteredActivities.length === 0 && (
                  <div className="text-center py-8 bg-card rounded-md">
                    <p className="text-muted-foreground">No activities found matching your search</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ActivityPage;