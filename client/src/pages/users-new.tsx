import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  getUsers, 
  deleteUser, 
  updateUser,
  disableUser,
  getUserRole, 
  getConnectionStatus
} from "@/lib/jellyfin";
import { UserExpiryBadge } from "@/components/user-expiry-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Edit,
  UserPlus,
  Trash2,
  Users,
  Clock,
  Filter,
  Settings,
  CalendarClock,
  X,
  Ban,
  Pencil,
  Info,
  ChevronDown,
  Check,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/jellyfin";
import { debounce } from "@/lib/utils";
import { User } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import AddUserModal from "@/components/add-user-modal";
import EditUserModal from "@/components/edit-user-modal";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatusBadge, RoleBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppHeader } from "@/components/app-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UsersPage() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isModifySettingsModalOpen, setIsModifySettingsModalOpen] = useState(false);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("profile");
  const [selectedProfile, setSelectedProfile] = useState<string>("basic-profile");
  const [applyHomescreenLayout, setApplyHomescreenLayout] = useState(true);
  const [expiryMonths, setExpiryMonths] = useState<string>("0");
  const [expiryDays, setExpiryDays] = useState<string>("0");
  const [expiryHours, setExpiryHours] = useState<string>("0");
  const [expiryMinutes, setExpiryMinutes] = useState<string>("0");
  const isMobile = useIsMobile();

  // Get connection status
  const connectionQuery = useQuery({
    queryKey: ["/api/connection-status"],
    queryFn: getConnectionStatus,
  });

  // Get user data to check if admin
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
  const usersQuery = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: getUsers,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/disconnect", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Disconnected",
        description: "You have been disconnected from the Jellyfin server",
      });
      
      // Redirect based on whether we have stored configuration
      if (data.configured) {
        navigate("/login");
      } else {
        navigate("/onboarding");
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

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setSelectedUsers([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    },
  });
  
  // Disable user mutation
  const disableUserMutation = useMutation({
    mutationFn: ({ userId, disabled }: { userId: string; disabled: boolean }) => 
      disableUser(userId, disabled),
    onSuccess: () => {
      toast({
        title: "User status updated",
        description: "The user has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDisableModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user status",
        variant: "destructive",
      });
    },
  });
  
  // Expiry date state for the direct date picker
  const [expiryDate, setExpiryDate] = useState<string>("");
  
  // Calculate expiry date based on selected months, days, hours, minutes
  const calculateExpiryDate = useCallback(() => {
    const months = parseInt(expiryMonths || "0", 10);
    const days = parseInt(expiryDays || "0", 10);
    const hours = parseInt(expiryHours || "0", 10);
    const minutes = parseInt(expiryMinutes || "0", 10);
    
    if (months === 0 && days === 0 && hours === 0 && minutes === 0) {
      return null; // No expiry
    }
    
    // Create a new date object for now
    const now = new Date();
    
    // Calculate milliseconds for each time unit (more accurate than using setMonth/setDate)
    const monthsMs = months * 30 * 24 * 60 * 60 * 1000; // Approximate - 30 days per month
    const daysMs = days * 24 * 60 * 60 * 1000;
    const hoursMs = hours * 60 * 60 * 1000;
    const minutesMs = minutes * 60 * 1000;
    
    // Add all milliseconds to the current time
    const totalMs = now.getTime() + monthsMs + daysMs + hoursMs + minutesMs;
    const expiryDate = new Date(totalMs);
    
    console.log(`Setting expiry: ${months} months, ${days} days, ${hours} hours, ${minutes} minutes`);
    console.log(`Expiry date: ${expiryDate.toLocaleString()}`);
    
    return expiryDate.toISOString();
  }, [expiryMonths, expiryDays, expiryHours, expiryMinutes]);

  // Set expiry mutation
  const setExpiryMutation = useMutation({
    mutationFn: async ({ userId, expiryDate }: { userId: string; expiryDate: string | null }) => {
      // First get the app user ID by Jellyfin user ID
      const appUserResponse = await fetch(`/api/app-users/by-jellyfin-id/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!appUserResponse.ok) {
        throw new Error("Failed to find app user");
      }
      
      const appUser = await appUserResponse.json();
      
      // Then update the app user's expiry date
      const updateResponse = await fetch(`/api/app-users/${appUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expiresAt: expiryDate
        }),
      });
      
      if (!updateResponse.ok) {
        throw new Error("Failed to update expiry date");
      }
      
      // Return the updated user
      return await updateResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Expiry updated",
        description: "User expiry has been set successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsExpiryModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set expiry",
        variant: "destructive",
      });
    },
  });

  // Handle disconnect
  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  // Handle search debounced
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value);
    }, 300),
    []
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Filter users when search query or users change
  useEffect(() => {
    if (usersQuery.data && Array.isArray(usersQuery.data)) {
      const filtered = usersQuery.data.filter(user => {
        if (!searchQuery) return true;
        return user.Name?.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [searchQuery, usersQuery.data]);
  
  // Handle select all users
  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.Id));
    }
  };

  // Handle select individual user
  const handleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(userId => userId !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };
  
  // Get selected users objects
  const getSelectedUsersObjects = useCallback(() => {
    return filteredUsers.filter(user => selectedUsers.includes(user.Id));
  }, [filteredUsers, selectedUsers]);

  // Handle edit user
  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setIsEditModalOpen(true);
  };

  // Handle delete user
  const handleDeleteUser = (user: User) => {
    setCurrentUser(user);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete user
  const confirmDeleteUser = () => {
    if (currentUser) {
      deleteUserMutation.mutate(currentUser.Id);
      setIsDeleteModalOpen(false);
    }
  };

  // Get status badge for users
  const getUserStatus = (user: User) => {
    // Check if user is disabled (using both Policy.IsDisabled and our local disabled flag)
    if (user.Policy?.IsDisabled === true || user.disabled === true) {
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">Disabled</Badge>;
    }
    
    // For tickets or invites - can be customized further
    if (user.Name?.includes('Ticket')) {
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">Ticket</Badge>;
    }
    
    if (user.Name?.includes('Basic')) {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Invite</Badge>;
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title={connectionQuery.data?.serverName || "Jellyfin User Management"}
        subtitle={connectionQuery.data?.serverUrl}
        user={userQuery.data}
        onDisconnect={handleDisconnect}
        isDisconnecting={disconnectMutation.isPending}
        isAdmin={userQuery.data?.isAdmin}
      />

      {/* Main Content */}
      <main className="container py-6 px-4">
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground mt-1">
              Manage Jellyfin user accounts
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:max-w-xs relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-9 w-full"
                onChange={handleSearch}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button 
                className="flex-shrink-0"
                onClick={() => setIsAddModalOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                <span>Add User</span>
              </Button>
            </div>
          </div>
          
          {/* Selected Users Actions */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 bg-muted p-3 rounded-md">
              <div className="mr-2 flex items-center">
                <span className="font-medium">{selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected:</span>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  const selectedUsersObjects = getSelectedUsersObjects();
                  if (selectedUsersObjects.length > 0) {
                    setCurrentUser(selectedUsersObjects[0]);
                    setIsModifySettingsModalOpen(true);
                  }
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Modify Settings
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  const selectedUsersObjects = getSelectedUsersObjects();
                  if (selectedUsersObjects.length > 0) {
                    setCurrentUser(selectedUsersObjects[0]);
                    setIsExpiryModalOpen(true);
                    setExpiryMonths("0");
                    setExpiryDays("0");
                    setExpiryHours("0");
                    setExpiryMinutes("0");
                  }
                }}
              >
                <CalendarClock className="h-4 w-4 mr-2" />
                Set Expiry
              </Button>
              {(() => {
                const selectedUsersObjects = getSelectedUsersObjects();
                const firstSelected = selectedUsersObjects.length > 0 ? selectedUsersObjects[0] : null;
                const isDisabled = firstSelected?.Policy?.IsDisabled;
                
                return (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className={isDisabled ? "text-green-600 border-green-200 hover:bg-green-50" : "text-amber-600 border-amber-200 hover:bg-amber-50"}
                    onClick={() => {
                      if (firstSelected) {
                        setCurrentUser(firstSelected);
                        setIsDisableModalOpen(true);
                      }
                    }}
                  >
                    {isDisabled ? (
                      <>
                        <Activity className="h-4 w-4 mr-2" />
                        Enable
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4 mr-2" />
                        Disable
                      </>
                    )}
                  </Button>
                );
              })()}
              <Button 
                variant="secondary"
                size="sm" 
                className="text-destructive border-red-200 hover:bg-red-50"
                onClick={() => {
                  const selectedUsersObjects = getSelectedUsersObjects();
                  if (selectedUsersObjects.length > 0) {
                    setCurrentUser(selectedUsersObjects[0]);
                    setIsDeleteModalOpen(true);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all users"
                      />
                    </TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead className="hidden md:table-cell">Access</TableHead>
                    <TableHead className="hidden md:table-cell">Last Active</TableHead>
                    <TableHead className="hidden md:table-cell">Account Expiry</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <span className="ml-2">Loading users...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Users className="h-10 w-10 text-muted-foreground" />
                          <span>No users found</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.Id} className="hover:bg-muted/50">
                        <TableCell>
                          <Checkbox 
                            checked={selectedUsers.includes(user.Id)}
                            onCheckedChange={() => handleSelectUser(user.Id)}
                            aria-label={`Select ${user.Name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`/api/users/${user.Id}/image`} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {user.Name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {user.Name}
                                {(user.Policy?.IsDisabled || user.disabled) && (
                                  <span className="inline-block bg-orange-100 text-orange-800 text-xs px-1.5 py-0.5 rounded border border-orange-300 font-medium">
                                    Disabled
                                  </span>
                                )}
                              </div>
                              <div className="md:hidden flex items-center gap-2 mt-1">
                                <Badge variant={user.Policy?.IsAdministrator ? "default" : "secondary"} className="text-xs">
                                  {getUserRole(user)}
                                </Badge>
                                {getUserStatus(user)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={user.Policy?.IsAdministrator ? "default" : "secondary"}>
                            {getUserRole(user)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatDate(user.LastActivityDate)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {user.expiresAt ? (
                            <UserExpiryBadge expiresAt={user.expiresAt} small />
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Clock className="h-3 w-3 mr-1" />
                              Permanent
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end md:justify-start items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[180px]">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setCurrentUser(user);
                                    setIsModifySettingsModalOpen(true);
                                  }}
                                >
                                  <Settings className="h-4 w-4 mr-2" />
                                  Modify Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setCurrentUser(user);
                                    setIsExpiryModalOpen(true);
                                    setExpiryMonths("0");
                                    setExpiryDays("0");
                                    setExpiryHours("0");
                                    setExpiryMinutes("0");
                                  }}
                                >
                                  <CalendarClock className="h-4 w-4 mr-2" />
                                  Set Expiry
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setCurrentUser(user);
                                    setIsDisableModalOpen(true);
                                  }}
                                  className={user.Policy?.IsDisabled ? "text-green-600" : "text-amber-600"}
                                >
                                  {user.Policy?.IsDisabled ? (
                                    <>
                                      <Activity className="h-4 w-4 mr-2" />
                                      Enable
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="h-4 w-4 mr-2" />
                                      Disable
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setCurrentUser(user);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit User Modal */}
      {currentUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          user={currentUser}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {/* Delete User Modal */}
      {currentUser && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          user={currentUser}
          isDeleting={deleteUserMutation.isPending}
          onConfirm={confirmDeleteUser}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}

      {/* Disable/Enable User Modal */}
      {currentUser && (
        <Dialog open={isDisableModalOpen} onOpenChange={setIsDisableModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {currentUser.Policy?.IsDisabled ? "Enable" : "Disable"} {selectedUsers.length > 0 ? `${selectedUsers.length} users` : "1 user"}
              </DialogTitle>
              <DialogDescription>
                {currentUser.Policy?.IsDisabled 
                  ? "Enabling this user will restore their access to the server." 
                  : "Disabling this user will prevent them from accessing the server."}
              </DialogDescription>
            </DialogHeader>
            {/* Send notification checkbox removed as this feature is not implemented */}
            <DialogFooter className="sm:justify-between">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              {currentUser.Policy?.IsDisabled ? (
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    if (currentUser) {
                      disableUserMutation.mutate({ 
                        userId: currentUser.Id, 
                        disabled: false 
                      });
                    }
                  }}
                  disabled={disableUserMutation.isPending}
                >
                  {disableUserMutation.isPending ? "Enabling..." : "Enable"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (currentUser) {
                      disableUserMutation.mutate({ 
                        userId: currentUser.Id, 
                        disabled: true 
                      });
                    }
                  }}
                  disabled={disableUserMutation.isPending}
                >
                  {disableUserMutation.isPending ? "Disabling..." : "Disable"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modify Settings Modal */}
      {currentUser && (
        <Dialog open={isModifySettingsModalOpen} onOpenChange={setIsModifySettingsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modify Settings for {selectedUsers.length > 0 ? `${selectedUsers.length} users` : "1 user"}</DialogTitle>
              <DialogDescription>
                Apply settings from an existing profile, or source them directly from a user.
              </DialogDescription>
            </DialogHeader>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="user">User</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic-profile">Basic Profile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="apply-homescreen"
                      checked={applyHomescreenLayout}
                      onCheckedChange={(checked) => setApplyHomescreenLayout(!!checked)}
                    />
                    <label htmlFor="apply-homescreen" className="text-sm font-medium cursor-pointer">Apply homescreen layout</label>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="user" className="py-4">
                <div className="space-y-4">
                  <Select defaultValue={currentUser.Name}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={currentUser.Name}>{currentUser.Name}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="sm:justify-between">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button">
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Set Expiry Modal */}
      {currentUser && (
        <Dialog open={isExpiryModalOpen} onOpenChange={setIsExpiryModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set expiry for {selectedUsers.length > 0 ? `${selectedUsers.length} users` : "1 user"}</DialogTitle>
              <DialogDescription>
                Set an expiration date for the user account. The account will be automatically disabled when it expires.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Set Expiry</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setExpiryDate("");
                      setExpiryMonths("0");
                      setExpiryDays("0");
                      setExpiryHours("0");
                      setExpiryMinutes("0");
                    }}
                  >
                    Clear
                  </Button>
                </div>
                <Input 
                  placeholder="Enter an expiry"
                  type="datetime-local"
                  min={new Date().toISOString().slice(0, 16)}
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Extend Expiry</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs">Months</label>
                    <Select value={expiryMonths} onValueChange={setExpiryMonths}>
                      <SelectTrigger>
                        <SelectValue placeholder="0" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={`month-${i}`} value={i.toString()}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs">Days</label>
                    <Select value={expiryDays} onValueChange={setExpiryDays}>
                      <SelectTrigger>
                        <SelectValue placeholder="0" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={`day-${i}`} value={i.toString()}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs">Hours</label>
                    <Select value={expiryHours} onValueChange={setExpiryHours}>
                      <SelectTrigger>
                        <SelectValue placeholder="0" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={`hour-${i}`} value={i.toString()}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs">Minutes</label>
                    <Select value={expiryMinutes} onValueChange={setExpiryMinutes}>
                      <SelectTrigger>
                        <SelectValue placeholder="0" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 60 }, (_, i) => (
                          <SelectItem key={`minute-${i}`} value={i.toString()}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                type="button" 
                variant="default"
                onClick={() => {
                  if (currentUser) {
                    // If we have an exact date entered, use it; 
                    // otherwise calculate from relative time fields
                    let calculatedDate = null;
                    
                    if (expiryDate) {
                      calculatedDate = new Date(expiryDate).toISOString();
                    } else {
                      calculatedDate = calculateExpiryDate();
                    }
                    
                    setExpiryMutation.mutate({
                      userId: currentUser.Id,
                      expiryDate: calculatedDate
                    });
                  }
                }}
                disabled={setExpiryMutation.isPending}
              >
                {setExpiryMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}