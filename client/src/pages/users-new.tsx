import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  getUsers, 
  deleteUser, 
  getUserRole,
  disableUser
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
  LogOut,
  Users,
  Settings,
  Menu,
  UserCog
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { UserExpiryBadge } from "@/components/user-expiry-badge";
import { formatDate } from "@/lib/jellyfin";
import { debounce } from "@/lib/utils";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import AddUserModal from "@/components/add-user-modal";
import EditUserModal from "@/components/edit-user-modal";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge, RoleBadge } from "@/components/status-badge";

export default function UsersNewPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 30000, // 30 seconds
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await deleteUser(userId);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDeleteModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disableUserMutation = useMutation({
    mutationFn: async ({ userId, disable }: { userId: string; disable: boolean }) => {
      return await disableUser(userId, disable);
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.disable ? "User disabled" : "User enabled",
        description: `The user has been ${variables.disable ? "disabled" : "enabled"} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDisableModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(
    (user: User) =>
      user.Name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setCurrentUser(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = () => {
    if (currentUser) {
      deleteUserMutation.mutate(currentUser.Id);
    }
  };

  const handleToggleDisable = (user: User) => {
    setCurrentUser(user);
    setIsDisableModalOpen(true);
  };

  const confirmToggleDisable = () => {
    if (currentUser) {
      const isCurrentlyDisabled = !!currentUser.Policy?.IsDisabled;
      disableUserMutation.mutate({
        userId: currentUser.Id,
        disable: !isCurrentlyDisabled,
      });
    }
  };

  const handleSelectUser = (user: User) => {
    if (selectedUsers.some((u) => u.Id === user.Id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.Id !== user.Id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers([...filteredUsers]);
    }
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  return (
    <main className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center">
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <div className="flex items-center space-x-2">
              <div className="btn-animate">
                <Button 
                  variant="default" 
                  onClick={() => setIsAddModalOpen(true)}
                  className="transition-all duration-300"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-x-4 md:space-y-0">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-10"
                onChange={handleSearchChange}
              />
            </div>

            <div className="flex items-center justify-between md:justify-end space-x-2">
              {selectedUsers.length > 0 && (
                <div className="badge-animate">
                  <Badge variant="outline" className="mr-2">
                    {selectedUsers.length} selected
                  </Badge>
                </div>
              )}
              {selectedUsers.length > 0 && (
                <div className="btn-animate">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setCurrentUser(selectedUsers[0]);
                      setIsDisableModalOpen(true);
                    }}
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    {selectedUsers[0]?.Policy?.IsDisabled ? "Enable" : "Disable"} {selectedUsers.length > 1 ? `(${selectedUsers.length})` : ""}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        filteredUsers.length > 0 &&
                        selectedUsers.length === filteredUsers.length
                      }
                      onCheckedChange={handleSelectAllUsers}
                      aria-label="Select all users"
                      className="user-checkbox"
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead className="hidden md:table-cell">Last Login</TableHead>
                  <TableHead className="hidden md:table-cell">Expiry</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user: User) => {
                    const isSelected = selectedUsers.some((u) => u.Id === user.Id);
                    const role = getUserRole(user);

                    return (
                      <TableRow 
                        key={user.Id} 
                        className={`user-table-row ${isSelected ? "bg-muted/50" : ""}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectUser(user)}
                            aria-label={`Select ${user.Name}`}
                            className="user-checkbox"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <div className="user-avatar relative h-8 w-8 overflow-hidden rounded-full bg-muted">
                              {user.PrimaryImageTag ? (
                                <img
                                  src={`/api/users/${user.Id}/image`}
                                  alt={user.Name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                                  {user.Name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{user.Name}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {user.Id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="badge-animate">
                            <RoleBadge role={role} />
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {user.LastActivityDate ? formatDate(user.LastActivityDate) : "Never"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="badge-animate">
                            <UserExpiryBadge user={user} />
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <StatusBadge user={user} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {isMobile ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Menu className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggleDisable(user)}
                                    className={
                                      user.Policy?.IsDisabled ? "text-success" : "text-destructive"
                                    }
                                  >
                                    <UserCog className="mr-2 h-4 w-4" />
                                    {user.Policy?.IsDisabled ? "Enable" : "Disable"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteUser(user)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <>
                                <div className="btn-animate">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditUser(user)}
                                  >
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                </div>
                                <div className="btn-animate">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleToggleDisable(user)}
                                    className={
                                      user.Policy?.IsDisabled ? "text-success" : "text-destructive"
                                    }
                                  >
                                    <UserCog className="h-4 w-4" />
                                    <span className="sr-only">
                                      {user.Policy?.IsDisabled ? "Enable" : "Disable"}
                                    </span>
                                  </Button>
                                </div>
                                <div className="btn-animate">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteUser(user)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <AddUserModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      )}

      {currentUser && isEditModalOpen && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={currentUser}
        />
      )}

      {currentUser && isDeleteModalOpen && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDeleteUser}
          title="Delete User"
          description={`Are you sure you want to delete ${currentUser.Name}? This action cannot be undone.`}
        />
      )}

      {currentUser && isDisableModalOpen && (
        <DeleteConfirmationModal
          isOpen={isDisableModalOpen}
          onClose={() => setIsDisableModalOpen(false)}
          onConfirm={confirmToggleDisable}
          title={currentUser.Policy?.IsDisabled ? "Enable User" : "Disable User"}
          description={`Are you sure you want to ${
            currentUser.Policy?.IsDisabled ? "enable" : "disable"
          } ${currentUser.Name}?`}
          confirmText={currentUser.Policy?.IsDisabled ? "Enable" : "Disable"}
          confirmVariant={currentUser.Policy?.IsDisabled ? "default" : "destructive"}
        />
      )}
    </main>
  );
}