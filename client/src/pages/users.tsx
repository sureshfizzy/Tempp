import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  getUsers, 
  deleteUser, 
  getUserRole, 
  getUserWatchTime,
  formatWatchTime
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
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { formatDate } from "@/lib/jellyfin";
import { debounce } from "@/lib/utils";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
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

export default function UsersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userWatchTimes, setUserWatchTimes] = useState<Record<string, number>>({});
  const isMobile = useIsMobile();

  // Get all users
  const usersQuery = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: getUsers,
    refetchInterval: 30000, // Refetch every 30 seconds
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

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
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
    <div className="min-h-screen bg-neutral-50">
      {/* Header/Nav */}
      <header className="bg-primary text-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Jellyfin User Management</h1>
          </div>
          
          {/* Mobile menu button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={toggleMobileMenu}
            >
              <Menu className="h-6 w-6" />
            </Button>
          )}
        </div>
      </header>

      {/* Sidebar and Main Content */}
      <div className="flex flex-col md:flex-row">
        {/* Mobile sidebar */}
        {isMobile && (
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="fixed top-14 left-0 w-3/4 h-screen bg-white border-r shadow-lg z-20 p-4"
              >
                <nav className="space-y-1">
                  <Link to="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100">
                    <Settings className="mr-2 h-5 w-5" />
                    Dashboard
                  </Link>
                  
                  <Link to="/users" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-primary bg-opacity-10 text-primary">
                    <Users className="mr-2 h-5 w-5" />
                    User Accounts
                  </Link>
                </nav>
              </motion.aside>
            )}
          </AnimatePresence>
        )}

        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="hidden md:block w-64 bg-white border-r shadow-sm p-4">
            <nav className="space-y-1">
              <Link to="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100">
                <Settings className="mr-2 h-5 w-5" />
                Dashboard
              </Link>
              
              <Link to="/users" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-primary bg-opacity-10 text-primary">
                <Users className="mr-2 h-5 w-5" />
                User Accounts
              </Link>
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <motion.main 
          className="flex-1 p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold">Accounts</h1>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-grow md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search accounts..."
                  className="pl-9"
                  onChange={handleSearch}
                />
              </div>
              <Button variant="outline">Filters</Button>
            </div>
          </div>

          <motion.div 
            className="bg-gray-50 border rounded-md p-4 mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-3">ACTIONS</h2>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setIsAddModalOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add user
            </Button>
          </motion.div>

          {/* Users Table */}
          <motion.div 
            className="bg-white border rounded-md overflow-hidden"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
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
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Last Active</TableHead>
                    <TableHead className="hidden md:table-cell">Watch Time</TableHead>
                    <TableHead className="hidden md:table-cell">Expiry</TableHead>
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
                          <Users className="h-10 w-10 text-gray-300" />
                          <span>No users found</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.Id} className="hover:bg-gray-50">
                        <TableCell>
                          <Checkbox 
                            checked={selectedUsers.includes(user.Id)}
                            onCheckedChange={() => handleSelectUser(user.Id)}
                            aria-label={`Select ${user.Name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.Name}</span>
                            {getUserStatus(user)}
                          </div>
                          <div className="md:hidden mt-1 space-y-1">
                            <div className="flex items-center gap-1">
                              <Badge variant={user.Policy?.IsAdministrator ? "default" : "secondary"} className="mr-2">
                                {getUserRole(user)}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatDate(user.LastActivityDate)}
                              </span>
                            </div>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <Clock className="h-3 w-3 mr-1 text-gray-400" />
                              {userWatchTimes[user.Id] !== undefined ? (
                                <span>{formatWatchTime(userWatchTimes[user.Id])}</span>
                              ) : (
                                <div className="h-3 w-6 bg-gray-200 animate-pulse rounded"></div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={user.Policy?.IsAdministrator ? "default" : "secondary"}>
                            {getUserRole(user)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-gray-400">
                            {user.Name?.includes('@') ? user.Name : "No email"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatDate(user.LastActivityDate)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {userWatchTimes[user.Id] !== undefined ? (
                              <span>{formatWatchTime(userWatchTimes[user.Id])}</span>
                            ) : (
                              <div className="h-4 w-8 bg-gray-200 animate-pulse rounded"></div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isMobile ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                                onClick={() => handleDeleteUser(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </motion.main>
      </div>

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

      {/* Delete Confirmation Modal */}
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