import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { 
  getUsers, 
  disconnectFromJellyfin, 
  getConnectionStatus, 
  getUserProfiles,
  createInvite,
  getInvites,
  deleteInvite,
  formatExpiryTime,
  getUserRoles
} from "@/lib/jellyfin";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  LogOut, 
  User, 
  UserCheck, 
  Settings, 
  CheckCircle,
  AlertCircle, 
  Users, 
  Film, 
  Infinity, 
  Copy, 
  Trash, 
  Loader2,
  Clock,
  Code
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { AppHeader } from "@/components/app-header";
import { Switch } from "@/components/ui/switch";
import { InsertInvite } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Invite form state
  const [inviteMonths, setInviteMonths] = useState<number>(0);
  const [inviteDays, setInviteDays] = useState<number>(7);
  const [inviteHours, setInviteHours] = useState<number>(0);
  const [inviteMinutes, setInviteMinutes] = useState<number>(0);
  const [inviteLabel, setInviteLabel] = useState<string>("");
  const [userLabel, setUserLabel] = useState<string>("");
  const [numberOfUses, setNumberOfUses] = useState<number | null>(1);
  const [isInfiniteUses, setIsInfiniteUses] = useState<boolean>(false);
  const [userExpiryEnabled, setUserExpiryEnabled] = useState<boolean>(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [deleteInviteId, setDeleteInviteId] = useState<number | null>(null);

  // Get Jellyfin connection status
  const connectionStatusQuery = useQuery({
    queryKey: ["/api/connection-status"],
    queryFn: getConnectionStatus,
    staleTime: 300000, // 5 minutes
  });
  
  // Get current user data
  const userQuery = useQuery<{
    id: number;
    username: string;
    email: string;
    isAdmin: boolean;
    jellyfinUserId: string;
  }>({
    queryKey: ["/api/me"],
  });

  // Get all users
  const usersQuery = useQuery({
    queryKey: ["/api/users"],
    queryFn: getUsers,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Get all invites
  const invitesQuery = useQuery({
    queryKey: ["/api/invites"],
    queryFn: getInvites,
    enabled: connectionStatusQuery.data?.isAdmin === true,
  });
  
  // Get user profiles
  const profilesQuery = useQuery({
    queryKey: ["/api/user-profiles"],
    queryFn: getUserProfiles,
    enabled: connectionStatusQuery.data?.isAdmin === true,
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: (data: Partial<InsertInvite>) => createInvite(data),
    onSuccess: () => {
      toast({
        title: "Invite Created",
        description: "New invite has been created successfully",
      });
      
      // Reset form
      setInviteMonths(0);
      setInviteDays(7);
      setInviteHours(0);
      setInviteMinutes(0);
      setInviteLabel("");
      setUserLabel("");
      setNumberOfUses(1);
      setIsInfiniteUses(false);
      setUserExpiryEnabled(false);
      setSelectedProfileId(null);
      
      // Refresh invites list
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invite",
        variant: "destructive",
      });
    }
  });
  
  // Delete invite mutation
  const deleteInviteMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeleteInviteId(id);
      return await deleteInvite(id); // This function is imported from @/lib/jellyfin
    },
    onSuccess: () => {
      toast({
        title: "Invite Deleted",
        description: "Invite has been deleted successfully",
      });
      
      // Reset state
      setDeleteInviteId(null);
      
      // Refresh invites list
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete invite",
        variant: "destructive",
      });
      
      // Reset state even on error
      setDeleteInviteId(null);
    }
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: disconnectFromJellyfin,
    onSuccess: (data) => {
      toast({
        title: "Disconnected",
        description: "You have been disconnected from the Jellyfin server",
      });
      
      // Redirect based on whether we have stored configuration
      if (data.configured) {
        // If we have config, go to login page
        setLocation("/login");
      } else {
        // If no config, go to onboarding page
        setLocation("/onboarding");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect",
        variant: "destructive",
      });
    },
  });

  // Handle disconnect
  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };
  
  // Handle create invite
  const handleCreateInvite = () => {
    // Validate form
    if (isInfiniteUses && numberOfUses !== null) {
      // If infinite uses is selected, set numberOfUses to null
      setNumberOfUses(null);
    }
    
    if (!isInfiniteUses && (!numberOfUses || numberOfUses < 1)) {
      toast({
        title: "Validation Error",
        description: "Number of uses must be at least 1",
        variant: "destructive",
      });
      return;
    }
    
    // Create invite data with all required fields
    const inviteData: Partial<InsertInvite> = {
      maxUses: isInfiniteUses ? null : numberOfUses,
      label: inviteLabel || null,
      userLabel: userLabel || null,
      userExpiryEnabled,
      // For invite expiry
      userExpiryMonths: inviteMonths, 
      userExpiryDays: inviteDays,
      userExpiryHours: inviteHours,
      // If user expiry is enabled, include those fields too
      ...(userExpiryEnabled ? {
        userExpiryMonths: inviteMonths,
        userExpiryDays: inviteDays,
        userExpiryHours: inviteHours,
      } : {}),
      profileId: selectedProfileId?.toString() || null
    };
    
    console.log("Creating invite with data:", inviteData);
    createInviteMutation.mutate(inviteData);
  };

  // Filter out invites that are deleted (client-side filtering) for better UI animation
  const filteredInvites = useMemo(() => {
    if (!invitesQuery.data) return [];
    
    // If we're currently deleting an invite, filter it out immediately for smooth animation
    if (deleteInviteId) {
      return invitesQuery.data.filter(invite => invite.id !== deleteInviteId);
    }
    
    return invitesQuery.data;
  }, [invitesQuery.data, deleteInviteId]);
  
  // Fetch user roles to show in dashboard
  const userRolesQuery = useQuery({
    queryKey: ["/api/user-roles"],
    queryFn: getUserRoles,
    enabled: connectionStatusQuery.data?.isAdmin === true,
  });

  // Count users by their roles
  const roleCounts = useMemo(() => {
    if (!usersQuery.data) return { Administrator: 0 };

    // Create a map with all roles initialized to 0
    const counts: Record<string, number> = {};
    
    // Initialize counts for all known roles from the roles table
    if (userRolesQuery.data && Array.isArray(userRolesQuery.data)) {
      userRolesQuery.data.forEach((role: { id: number, name: string }) => {
        counts[role.name] = 0;
      });
    }
    
    // Initialize Administrator role count
    counts["Administrator"] = 0;
    
    // Count users by role
    usersQuery.data.forEach(user => {
      if (user.Policy?.IsAdministrator) {
        // Always count administrators separately
        counts["Administrator"] = (counts["Administrator"] || 0) + 1;
      } else if (user.roleId && Array.isArray(userRolesQuery.data)) {
        // Find role name from role ID
        const role = userRolesQuery.data.find((r: { id: number }) => r.id === user.roleId);
        if (role) {
          counts[role.name] = (counts[role.name] || 0) + 1;
        } else {
          // Check if there's a default role, otherwise use "User"
          const defaultRole = userRolesQuery.data.find((r: { isDefault: boolean }) => r.isDefault);
          if (defaultRole) {
            counts[defaultRole.name] = (counts[defaultRole.name] || 0) + 1;
          } else if (counts["User"] !== undefined) {
            counts["User"] = (counts["User"] || 0) + 1;
          }
        }
      } else {
        // Check if there's a default role, otherwise use "User"
        const defaultRole = userRolesQuery.data?.find((r: { isDefault: boolean }) => r.isDefault);
        if (defaultRole) {
          counts[defaultRole.name] = (counts[defaultRole.name] || 0) + 1;
        } else if (counts["User"] !== undefined) {
          counts["User"] = (counts["User"] || 0) + 1;
        }
      }
    });
    
    return counts;
  }, [usersQuery.data, userRolesQuery.data]);
  
  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title={connectionStatusQuery.data?.serverName || "Jellyfin Manager"}
        subtitle={connectionStatusQuery.data?.serverUrl}
        user={{
          username: userQuery.data?.username || "User",
          jellyfinUserId: userQuery.data?.jellyfinUserId
        }}
        onDisconnect={handleDisconnect}
        isDisconnecting={disconnectMutation.isPending}
        isAdmin={connectionStatusQuery.data?.isAdmin}
      />

      <div className="container px-4 py-6 lg:py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your server management</p>
          </div>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/users"] })}
            variant="outline"
            size="sm"
          >
            Refresh Data
          </Button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <User className="h-5 w-5 mr-2 text-primary" />
                Total Users
              </CardTitle>
              <CardDescription>All users on your Jellyfin server</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {usersQuery.isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  usersQuery.data?.length || 0
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <UserCheck className="h-5 w-5 mr-2 text-green-500" />
                Admin Users
              </CardTitle>
              <CardDescription>Users with administrator access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {usersQuery.isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  roleCounts["Administrator"] || 0
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <User className="h-5 w-5 mr-2 text-blue-500" />
                {userRolesQuery.data?.find((r: { isDefault: boolean }) => r.isDefault)?.name || "Regular Users"}
              </CardTitle>
              <CardDescription>Users with standard access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {usersQuery.isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  userRolesQuery.data && 
                  roleCounts[userRolesQuery.data?.find((r: { isDefault: boolean }) => r.isDefault)?.name || "User"] || 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Custom Roles Cards */}
        {userRolesQuery.data && userRolesQuery.data.filter(role => 
          role.name !== "User" && 
          role.name !== "Administrator" && 
          !role.isDefault
        ).length > 0 && (
          <>
            <h2 className="text-xl font-semibold mb-4">Custom User Roles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {userRolesQuery.data
                .filter(role => {
                  // Filter out Administrator role (already shown in top cards)
                  // Filter out the default role (already shown in top cards)
                  // Filter out "User" role if it exists
                  return role.name !== "User" && 
                         role.name !== "Administrator" && 
                         !role.isDefault;
                })
                .map(role => (
                  <Card key={role.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-lg">
                        <Users className="h-5 w-5 mr-2 text-indigo-500" />
                        {role.name}
                      </CardTitle>
                      <CardDescription>
                        {role.description || `Custom role #${role.id}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {usersQuery.isLoading ? (
                          <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          roleCounts[role.name] || 0
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </>
        )}

        {/* Invite System Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Invites</CardTitle>
            <CardDescription>Create and manage server joining invitations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-md p-4">
                {invitesQuery.isLoading ? (
                  <p className="text-muted-foreground text-sm">Loading invites...</p>
                ) : invitesQuery.error ? (
                  <p className="text-muted-foreground text-sm">Error loading invites</p>
                ) : filteredInvites.length > 0 ? (
                  <div className="space-y-3">
                    {filteredInvites.map(invite => {
                      const inviteUrl = `${window.location.origin}/invite/${invite.code}`;
                      const expiryText = invite.expiresAt 
                        ? formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: false }) 
                        : formatExpiryTime(invite.userExpiryMonths || 0, invite.userExpiryDays || 0, invite.userExpiryHours || 0);

                      return (
                        <div key={invite.id} className="flex flex-col p-4 border rounded-md bg-card">
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-medium">{invite.label || `Invite #${invite.id}`}</p>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(inviteUrl);
                                  toast({
                                    title: "Copied invite link",
                                    description: "The invite URL has been copied to your clipboard",
                                  });
                                }}
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Copy
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => {
                                  setDeleteInviteId(invite.id);
                                  deleteInviteMutation.mutate(invite.id);
                                }}
                                disabled={deleteInviteMutation.isPending && deleteInviteId === invite.id}
                              >
                                {deleteInviteMutation.isPending && deleteInviteId === invite.id 
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Trash className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Code className="h-3 w-3 mr-1" /> 
                                <span className="font-mono">{invite.code}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>Expires in {expiryText}</span>
                              </div>
                            </div>
                            
                            <div className="flex justify-between">
                              <div className="flex items-center">
                                <Users className="h-3 w-3 mr-1" /> 
                                <span>{invite.maxUses === null ? 'Unlimited uses' : `${invite.usesRemaining} of ${invite.maxUses} uses remaining`}</span>
                              </div>
                              
                              {invite.userExpiryEnabled && (
                                <div className="flex items-center text-amber-500">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  <span>
                                    Account expiry: {formatExpiryTime(
                                      invite.userExpiryMonths || 0,
                                      invite.userExpiryDays || 0,
                                      invite.userExpiryHours || 0
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {invite.userLabel && (
                              <div className="flex items-center pt-1 border-t border-border/40">
                                <User className="h-3 w-3 mr-1" />
                                <span>User label: {invite.userLabel}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No invites have been created yet</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Create</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">INVITE DURATION</h4>
                      <p className="text-xs text-muted-foreground mb-2">A specified amount of time after creation, the invite will expire.</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">MONTHS</label>
                          <select 
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={inviteMonths}
                            onChange={(e) => setInviteMonths(parseInt(e.target.value))}
                          >
                            <option value="0">0</option>
                            {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                              <option key={`invite-month-${num}`} value={`${num}`}>{num}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">DAYS</label>
                          <select 
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={inviteDays}
                            onChange={(e) => setInviteDays(parseInt(e.target.value))}
                          >
                            <option value="0">0</option>
                            {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                              <option key={`invite-day-${num}`} value={`${num}`}>{num}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">HOURS</label>
                          <select 
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={inviteHours}
                            onChange={(e) => setInviteHours(parseInt(e.target.value))}
                          >
                            <option value="0">0</option>
                            {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                              <option key={`invite-hour-${num}`} value={`${num}`}>{num}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">MINUTES</label>
                          <select 
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={inviteMinutes}
                            onChange={(e) => setInviteMinutes(parseInt(e.target.value))}
                          >
                            <option value="0">0</option>
                            {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                              <option key={`invite-minute-${num}`} value={`${num}`}>{num}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">USER EXPIRY</h4>
                      <div className="flex items-center mb-4">
                        <Switch 
                          id="userExpiry" 
                          checked={userExpiryEnabled}
                          onCheckedChange={setUserExpiryEnabled}
                          className="mr-2"
                        />
                        <label htmlFor="userExpiry" className="text-sm">Enabled</label>
                      </div>
                      
                      {userExpiryEnabled && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground mb-2">A specified amount of time after each signup, the account will be disabled.</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">MONTHS</label>
                              <select 
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={inviteMonths}
                                onChange={(e) => setInviteMonths(parseInt(e.target.value))}
                              >
                                <option value="0">0</option>
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                                  <option key={`month-${num}`} value={`${num}`}>{num}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">DAYS</label>
                              <select 
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={inviteDays}
                                onChange={(e) => setInviteDays(parseInt(e.target.value))}
                              >
                                <option value="0">0</option>
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                                  <option key={`day-${num}`} value={`${num}`}>{num}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">HOURS</label>
                              <select 
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={inviteHours}
                                onChange={(e) => setInviteHours(parseInt(e.target.value))}
                              >
                                <option value="0">0</option>
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                                  <option key={`hour-${num}`} value={`${num}`}>{num}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!userExpiryEnabled && (
                        <p className="text-xs text-muted-foreground">A specified amount of time after each signup, the account will be disabled.</p>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">LABEL</h4>
                      <input 
                        type="text" 
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="Label for this invite (optional)"
                        value={inviteLabel}
                        onChange={(e) => setInviteLabel(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">USER LABEL</h4>
                      <p className="text-xs text-muted-foreground mb-2">Label to apply to users created with this invite.</p>
                      <input 
                        type="text" 
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="User label (optional)"
                        value={userLabel}
                        onChange={(e) => setUserLabel(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">NUMBER OF USES</h4>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="number" 
                          min="1" 
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                          value={numberOfUses === null ? '' : numberOfUses}
                          onChange={(e) => setNumberOfUses(e.target.value ? parseInt(e.target.value) : 1)}
                          disabled={isInfiniteUses}
                        />
                        <button 
                          className={`rounded-md border p-2 ${isInfiniteUses ? 'bg-primary text-white' : 'bg-background'}`}
                          onClick={() => setIsInfiniteUses(!isInfiniteUses)}
                          type="button"
                        >
                          <Infinity className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">PROFILE</h4>
                      <select 
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedProfileId || ''}
                        onChange={(e) => setSelectedProfileId(e.target.value ? parseInt(e.target.value) : null)}
                      >
                        <option value="">No profile (use default)</option>
                        {profilesQuery.data && profilesQuery.data.map(profile => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex justify-end mt-8">
                      <Button 
                        className="bg-primary text-white w-full mt-8"
                        onClick={handleCreateInvite}
                        disabled={createInviteMutation.isPending}
                      >
                        {createInviteMutation.isPending ? 'CREATING...' : 'CREATE'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Server Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Server Status</CardTitle>
            <CardDescription>Information about your Jellyfin server connection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Server URL</span>
                  <span className="font-medium">{connectionStatusQuery.data?.serverUrl || "Not available"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Connection Status</span>
                  <span className="font-medium flex items-center">
                    {connectionStatusQuery.data?.connected ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        Connected
                      </>
                    ) : (
                      <>
                        <span className="h-4 w-4 text-red-500 mr-1">●</span>
                        Disconnected
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/connection-status"] })}
                    className="mr-2"
                    size="sm"
                  >
                    Refresh Status
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isPending}
                    size="sm"
                  >
                    {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}