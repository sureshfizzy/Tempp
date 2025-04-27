import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getConnectionStatus } from "@/lib/jellyfin";
import { Card } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";

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
      <AppHeader 
        title={connectionStatusQuery.data?.serverName || "Jellyfin User Management"}
        subtitle={connectionStatusQuery.data?.serverUrl}
        user={{
          username: connectionStatusQuery.data?.isAdmin ? "Admin" : "User", 
          jellyfinUserId: undefined
        }}
        onDisconnect={handleDisconnect}
        isDisconnecting={false}
        isAdmin={connectionStatusQuery.data?.isAdmin}
      />

      <div className="container px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Activity</h2>
            <p className="text-muted-foreground mt-1">View all server activity and event logs</p>
          </div>
        </div>

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
  );
}

export default ActivityPage;