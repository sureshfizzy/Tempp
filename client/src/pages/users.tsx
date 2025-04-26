import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getUsers, deleteUser, getUserRole } from "@/lib/jellyfin";
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
  LogOut,
  Users,
  Settings
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { formatDate } from "@/lib/jellyfin";
import { debounce } from "@/lib/utils";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function UsersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

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
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Jellyfin User Management</h1>
          </div>
        </div>
      </header>

      {/* Sidebar and Main Content */}
      <div className="flex flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-white border-r shadow-sm p-4">
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

        {/* Main Content */}
        <main className="flex-1 p-6">
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

          <div className="bg-gray-50 border rounded-md p-4 mb-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-3">ACTIONS</h2>
            <Button className="bg-primary">
              <UserPlus className="mr-2 h-4 w-4" />
              Add user
            </Button>
          </div>

          {/* Users Table */}
          <div className="bg-white border rounded-md overflow-hidden">
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
                    <TableHead>Access</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No users found
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
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.Policy?.IsAdministrator ? "default" : "secondary"}>
                            {getUserRole(user)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* In a real app, we'd store email addresses in our app_users table */}
                            <span className="text-gray-400">
                              {user.Name?.includes('@') ? user.Name : "No email"}
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* User expiry is not directly available in Jellyfin API */}
                          {user.Policy?.EnableAllFolders === false ? "2/28/2025" : ""}
                        </TableCell>
                        <TableCell>
                          {formatDate(user.LastActivityDate)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}