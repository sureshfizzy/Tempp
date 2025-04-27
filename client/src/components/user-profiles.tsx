import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2, Edit, Copy, AlertCircle, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

const profileFormSchema = z.object({
  name: z.string().min(1, "Profile name is required"),
  sourceUserId: z.string().min(1, "Base user is required"),
  sourceName: z.string().optional(),
  isDefault: z.boolean().default(false)
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface UserProfile {
  id: number;
  name: string;
  sourceUserId: string;
  sourceName: string; // The name of the base user
  isDefault: boolean;
  libraryCount: number; // will be a number
  createdAt: string;
}

export function UserProfiles() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get Jellyfin users (to use as base for profiles)
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Get profiles
  const { data: profiles, isLoading: isLoadingProfiles } = useQuery<UserProfile[]>({
    queryKey: ["/api/user-profiles"]
  });

  // Form definition
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      sourceUserId: "",
      isDefault: false
    }
  });

  // Store the selected user name
  const [selectedUserName, setSelectedUserName] = useState<string | undefined>();

  // Update selected user name when sourceUserId changes
  useEffect(() => {
    const sourceUserId = form.watch("sourceUserId");
    if (sourceUserId && users) {
      const selectedUser = users.find(u => u.Id === sourceUserId);
      setSelectedUserName(selectedUser?.Name);
    }
  }, [form.watch("sourceUserId"), users]);

  // Create profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return await apiRequest<any>("/api/user-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-profiles"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "User profile created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user profile",
        variant: "destructive",
      });
    },
  });

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest<any>(`/api/user-profiles/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-profiles"] });
      setIsDeleteDialogOpen(false);
      setSelectedProfile(null);
      toast({
        title: "Success",
        description: "User profile deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user profile",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: ProfileFormValues) => {
    // Find the selected user to get the name
    const selectedUser = users?.find(u => u.Id === data.sourceUserId);
    
    // Add sourceName to the data
    const submitData = {
      ...data,
      sourceName: selectedUser?.Name || 'Unknown User'
    };
    
    createProfileMutation.mutate(submitData);
  };

  // Handle profile deletion
  const handleDeleteProfile = () => {
    if (selectedProfile) {
      deleteProfileMutation.mutate(selectedProfile.id);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Profiles</CardTitle>
            <CardDescription>
              Manage user profiles that can be applied when creating new accounts
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Profile
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingProfiles ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : !profiles || profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserCog className="mb-4 h-16 w-16 text-muted-foreground/50" />
              <p className="mb-2 text-lg font-medium">No User Profiles</p>
              <p className="mb-4 text-muted-foreground max-w-md">
                User profiles allow you to define a set of library access rights and homescreen layout 
                that can be applied when creating new user accounts.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Your First Profile
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile Name</TableHead>
                    <TableHead>Based On</TableHead>
                    <TableHead>Libraries</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.name}</TableCell>
                      <TableCell>{profile.sourceName}</TableCell>
                      <TableCell>
                        {typeof profile.libraryCount === "string" && profile.libraryCount === "All" 
                          ? "All Libraries" 
                          : `${profile.libraryCount} ${profile.libraryCount === 1 ? 'Library' : 'Libraries'}`}
                      </TableCell>
                      <TableCell>
                        {profile.isDefault && (
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              // Edit functionality to be implemented
                              toast({
                                title: "Coming Soon",
                                description: "Edit functionality is under development",
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedProfile(profile);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Profile Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User Profile</DialogTitle>
            <DialogDescription>
              Create a profile by copying settings from an existing user
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Basic Profile" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for this user profile
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base User</FormLabel>
                    <FormControl>
                      <div className="relative rounded-md border border-input bg-background">
                        <div className="max-h-[240px] overflow-y-auto p-2">
                          {isLoadingUsers ? (
                            <div className="flex justify-center py-4">
                              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            </div>
                          ) : !users || users.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              No users available
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {users.map((user) => (
                                <div 
                                  key={user.Id} 
                                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${field.value === user.Id ? 'bg-primary/10 border border-primary/30' : 'border border-transparent'}`}
                                  onClick={() => field.onChange(user.Id)}
                                >
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    {user.Name?.charAt(0).toUpperCase() || "U"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user.Name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {user.Policy?.IsAdministrator ? "Administrator" : "Regular User"}
                                    </p>
                                  </div>
                                  {field.value === user.Id && (
                                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select a user whose library access and home layout will be used as a template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Make Default</FormLabel>
                      <FormDescription>
                        This profile will be automatically selected for new user creation
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={createProfileMutation.isPending || !form.formState.isValid}
                >
                  {createProfileMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                      Creating...
                    </>
                  ) : (
                    "Create Profile"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              Delete Profile
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this profile? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedProfile && (
            <div className="py-4">
              <p className="mb-2">
                <span className="font-medium">Profile:</span> {selectedProfile.name}
              </p>
              <p className="mb-2">
                <span className="font-medium">Based on:</span> {selectedProfile.sourceName}
              </p>
              {selectedProfile.isDefault && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                  This is the default profile
                </Badge>
              )}
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={handleDeleteProfile}
              disabled={deleteProfileMutation.isPending}
            >
              {deleteProfileMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                "Delete Profile"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}