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

// Sample activity data structure (we'll replace this with real API data when available)
interface ActivityItem {
  id: string;
  type: "account_created" | "invite_expired" | "invite_created";
  message: string;
  timestamp: string;
  inviteCode?: string;
  username?: string;
  createdBy?: string;
  bgColor: string;
  textColor: string;
}

// Sample activity data (will be replaced with API call)
const sampleActivities: ActivityItem[] = [
  {
    id: "1",
    type: "account_created",
    message: "Account created: Mrcoffee",
    timestamp: "4/26/2025 01:29 PM",
    username: "Mrcoffee",
    inviteCode: "TNyWg96ZGdwu8gkEiPViRR",
    bgColor: "bg-blue-500",
    textColor: "text-white"
  },
  {
    id: "2",
    type: "invite_expired",
    message: "Invite expired: TNyWg96ZGdwu8gkEiPViRR",
    timestamp: "4/26/2025 01:29 PM",
    inviteCode: "TNyWg96ZGdwu8gkEiPViRR",
    createdBy: "JFA-GO",
    bgColor: "bg-amber-500",
    textColor: "text-white"
  },
  {
    id: "3",
    type: "invite_created",
    message: "Invite created: TNyWg96ZGdwu8gkEiPViRR",
    timestamp: "4/26/2025 11:30 AM",
    inviteCode: "TNyWg96ZGdwu8gkEiPViRR",
    createdBy: "blackhat",
    bgColor: "bg-blue-500",
    textColor: "text-white"
  },
  {
    id: "4",
    type: "invite_expired",
    message: "Invite expired: vqeRwjEBUftTLhi5MSgc4C",
    timestamp: "4/26/2025 10:51 AM",
    inviteCode: "vqeRwjEBUftTLhi5MSgc4C",
    createdBy: "JFA-GO",
    bgColor: "bg-amber-500",
    textColor: "text-white"
  },
  {
    id: "5",
    type: "account_created",
    message: "Account created: Gaurav",
    timestamp: "4/26/2025 12:25 AM",
    username: "Gaurav",
    inviteCode: "gsxK79GDwB69eUjVFYRs39",
    bgColor: "bg-blue-500",
    textColor: "text-white"
  },
  {
    id: "6",
    type: "invite_expired",
    message: "Invite expired: gsxK79GDwB69eUjVFYRs39",
    timestamp: "4/26/2025 12:25 AM",
    inviteCode: "gsxK79GDwB69eUjVFYRs39",
    createdBy: "JFA-GO",
    bgColor: "bg-amber-500",
    textColor: "text-white"
  }
];

function ActivityPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Get Jellyfin connection status
  const connectionStatusQuery = useQuery({
    queryKey: ["/api/connection-status"],
    queryFn: getConnectionStatus,
    staleTime: 300000, // 5 minutes
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

  // Filter activities based on search query
  const filteredActivities = sampleActivities.filter(activity => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      activity.message.toLowerCase().includes(query) ||
      activity.inviteCode?.toLowerCase().includes(query) ||
      activity.username?.toLowerCase().includes(query) ||
      activity.createdBy?.toLowerCase().includes(query)
    );
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
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="accounts">Accounts</SelectItem>
                        <SelectItem value="invites">Invites</SelectItem>
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

          {/* Activity Listing */}
          <div>
            <div className="text-sm text-muted-foreground mb-4">
              {filteredActivities.length} TOTAL RECORDS {filteredActivities.length} LOADED {filteredActivities.length} SHOWN
            </div>
            
            <div className="space-y-4">
              {sortedActivities.map((activity) => (
                <div 
                  key={activity.id} 
                  className={`${activity.bgColor} ${activity.textColor} p-4 rounded-md shadow-sm transition-all hover:shadow-md`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{activity.message}</h3>
                      {activity.type === "account_created" && (
                        <p className="text-sm opacity-90">FROM INVITE {activity.inviteCode}</p>
                      )}
                      {(activity.type === "invite_expired" || activity.type === "invite_created") && activity.createdBy && (
                        <p className="text-sm opacity-90">BY {activity.createdBy}</p>
                      )}
                    </div>
                    <div className="text-sm opacity-80">{activity.timestamp}</div>
                  </div>
                  
                  <div className="flex justify-end mt-2">
                    <button className="p-1 rounded-full bg-black/10 hover:bg-black/20">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredActivities.length === 0 && (
                <div className="text-center py-8 bg-card rounded-md">
                  <p className="text-muted-foreground">No activities found matching your search</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ActivityPage;