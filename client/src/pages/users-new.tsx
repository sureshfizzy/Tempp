import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  getUsers, 
  deleteUser, 
  getUserRole, 
  getUserWatchTime,
  formatWatchTime,
  getConnectionStatus
} from "@/lib/jellyfin";
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
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userWatchTimes, setUserWatchTimes] = useState<Record<string, number>>({});
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
  
  // Fetch watch time data for users
  useEffect(() => {
    async function fetchWatchTimes() {
      if (!filteredUsers.length) return;
      
      const watchTimes: Record<string, number> = {};
      
      // Only fetch for a reasonable number of users to avoid too many requests
      const usersToFetch = filteredUsers.slice(0, 10);
      
      for (const user of usersToFetch) {
        try {
          const watchTime = await getUserWatchTime(user.Id);
          watchTimes[user.Id] = watchTime;
        } catch (error) {
          console.error(`Error fetching watch time for user ${user.Name}:`, error);
          watchTimes[user.Id] = 0;
        }
      }
      
      setUserWatchTimes(watchTimes);
    }
    
    fetchWatchTimes();
  }, [filteredUsers]);

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
    if (user.Policy?.IsDisabled) {
      return <Badge variant="destructive">Disabled</Badge>;
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
        title="Jellyfin User Management"
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
                    <TableHead className="hidden md:table-cell">Watch Time</TableHead>
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
                              <div className="font-medium">{user.Name}</div>
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
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {userWatchTimes[user.Id] !== undefined ? (
                              <span>{formatWatchTime(userWatchTimes[user.Id])}</span>
                            ) : (
                              <div className="h-4 w-8 bg-muted animate-pulse rounded"></div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end md:justify-start items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
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
    </div>
  );
}