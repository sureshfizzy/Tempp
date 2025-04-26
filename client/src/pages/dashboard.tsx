import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getUsers, disconnectFromJellyfin, getConnectionStatus, getUserRole, deleteUser, formatDate } from "@/lib/jellyfin";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/user-avatar";
import { StatusBadge, RoleBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, LogOut, Check, CheckCircle } from "lucide-react";
import { User } from "@shared/schema";
import { debounce, filterUsers } from "@/lib/utils";
import AddUserModal from "@/components/add-user-modal";
import EditUserModal from "@/components/edit-user-modal";
import UserDetailsModal from "@/components/user-details-modal";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isViewingUserDetails, setIsViewingUserDetails] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Get Jellyfin connection status
  const connectionStatusQuery = useQuery<{ connected: boolean; url?: string }>({
    queryKey: ["/api/connection-status"],
    staleTime: 300000, // 5 minutes
  });

  // Get all users
  const usersQuery = useQuery<User[]>({
    queryKey: ["/api/users"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Handle search debounced
  const debouncedSearch = debounce((value: string) => {
    setSearchQuery(value);
  }, 300);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: disconnectFromJellyfin,
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "You have been disconnected from the Jellyfin server",
      });
      setLocation("/");
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
      setIsDeletingUser(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Filter users when search query or users change
  useEffect(() => {
    if (usersQuery.data && Array.isArray(usersQuery.data)) {
      setFilteredUsers(filterUsers(usersQuery.data, searchQuery));
    } else {
      setFilteredUsers([]);
    }
  }, [searchQuery, usersQuery.data]);

  // Handle disconnect
  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  // Handler for viewing user details
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewingUserDetails(true);
  };

  // Handler for editing user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditingUser(true);
  };

  // Handler for deleting user
  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeletingUser(true);
  };

  // Handler for confirming delete
  const handleConfirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.Id);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header/Nav */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="material-icons text-2xl">people</span>
            <h1 className="text-xl font-semibold">Jellyfin User Management</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm flex items-center">
              <CheckCircle className="text-green-300 mr-1 h-4 w-4" />
              <span className="hidden md:inline">Connected to:</span>
              <span className="font-medium ml-1 max-w-xs truncate">
                {connectionStatusQuery.data?.url || "Jellyfin Server"}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span>Disconnect</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 space-y-4 md:space-y-0">
          <div>
            <h2 className="text-xl font-semibold text-neutral-800">User Management</h2>
            <p className="text-neutral-600">Manage your Jellyfin users</p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-1 sm:flex-none sm:min-w-[260px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
              <Input 
                type="search" 
                className="pl-10"
                placeholder="Search users..."
                onChange={handleSearch}
              />
            </div>
            
            <Button 
              className="bg-primary hover:bg-primary-dark text-white"
              onClick={() => setIsAddingUser(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              <span>Add User</span>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {usersQuery.isLoading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-neutral-600">Loading users from Jellyfin...</p>
          </div>
        )}

        {/* Error State */}
        {usersQuery.isError && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block p-4 rounded-full bg-red-100 mb-4">
              <span className="material-icons text-4xl text-red-500">error_outline</span>
            </div>
            <h3 className="text-lg font-medium text-neutral-800 mb-2">Error Loading Users</h3>
            <p className="text-neutral-600 mb-6">
              {usersQuery.error instanceof Error ? usersQuery.error.message : "An error occurred while loading users."}
            </p>
            <Button 
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/users"] })}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!usersQuery.isLoading && !usersQuery.isError && filteredUsers.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block p-4 rounded-full bg-neutral-100 mb-4">
              <span className="material-icons text-4xl text-neutral-500">person_off</span>
            </div>
            <h3 className="text-lg font-medium text-neutral-800 mb-2">No Users Found</h3>
            <p className="text-neutral-600 mb-6">
              {searchQuery ? "Your search returned no results." : "There are no users in your Jellyfin server."}
            </p>
            <Button 
              className="bg-primary hover:bg-primary-dark text-white"
              onClick={() => setIsAddingUser(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              <span>Add Your First User</span>
            </Button>
          </div>
        )}

        {/* Users Table */}
        {!usersQuery.isLoading && !usersQuery.isError && filteredUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-neutral-50">
                  <TableRow>
                    <TableHead className="text-neutral-500">User</TableHead>
                    <TableHead className="text-neutral-500">Role</TableHead>
                    <TableHead className="text-neutral-500">Last Active</TableHead>
                    <TableHead className="text-neutral-500">Status</TableHead>
                    <TableHead className="text-right text-neutral-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.Id} className="hover:bg-neutral-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center">
                          <UserAvatar user={user} />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-neutral-900">{user.Name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={getUserRole(user)} />
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {formatDate(user.LastActivityDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge user={user} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-neutral-600 hover:text-primary hover:bg-neutral-100"
                            onClick={() => handleViewUser(user)}
                            title="View Details"
                          >
                            <span className="material-icons text-xl">visibility</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-neutral-600 hover:text-primary hover:bg-neutral-100"
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                          >
                            <span className="material-icons text-xl">edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-neutral-600 hover:text-destructive hover:bg-neutral-100"
                            onClick={() => handleDeleteUser(user)}
                            title="Delete User"
                          >
                            <span className="material-icons text-xl">delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-6 py-3 bg-white border-t flex items-center justify-between">
              <div className="text-sm text-neutral-500">
                Showing <span className="font-medium">{filteredUsers.length}</span> of{" "}
                <span className="font-medium">{usersQuery.data && Array.isArray(usersQuery.data) ? usersQuery.data.length : 0}</span> users
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AddUserModal
        isOpen={isAddingUser}
        onClose={() => setIsAddingUser(false)}
      />

      {selectedUser && (
        <>
          <EditUserModal
            isOpen={isEditingUser}
            user={selectedUser}
            onClose={() => {
              setIsEditingUser(false);
              setSelectedUser(null);
            }}
          />

          <UserDetailsModal
            isOpen={isViewingUserDetails}
            user={selectedUser}
            onClose={() => {
              setIsViewingUserDetails(false);
              setSelectedUser(null);
            }}
            onEdit={() => {
              setIsViewingUserDetails(false);
              setIsEditingUser(true);
            }}
          />

          <DeleteConfirmationModal
            isOpen={isDeletingUser}
            user={selectedUser}
            isDeleting={deleteUserMutation.isPending}
            onConfirm={handleConfirmDelete}
            onCancel={() => {
              setIsDeletingUser(false);
              setSelectedUser(null);
            }}
          />
        </>
      )}
    </div>
  );
}
