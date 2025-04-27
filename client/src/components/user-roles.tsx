import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserRole } from "@shared/schema";
import { Loader2, PlusCircle, Save, Trash, Edit } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Custom fetch wrapper for handling authentication properly
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  // Ensure credentials are included for session cookies
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  };
  
  return fetch(url, fetchOptions);
};

export const UserRolesList: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRole, setNewRole] = useState({ name: "", description: "", isDefault: false });
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  
  // Fetch all user roles
  const { data: roles, isLoading } = useQuery<UserRole[]>({
    queryKey: ["/api/user-roles"],
    refetchOnWindowFocus: false,
  });
  
  // Create a new role
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: { name: string, description: string, isDefault: boolean }) => {
      const res = await authenticatedFetch("/api/user-roles", {
        method: "POST",
        body: JSON.stringify(roleData)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create role");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Role created",
        description: "The role has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
      setNewRole({ name: "", description: "", isDefault: false });
      setShowNewRoleForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating role",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });
  
  // Update an existing role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<UserRole> }) => {
      const res = await authenticatedFetch(`/api/user-roles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update role");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "The role has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
      setEditingRole(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating role",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });
  
  // Delete a role
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await authenticatedFetch(`/api/user-roles/${id}`, {
        method: "DELETE"
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to delete role");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Role deleted",
        description: "The role has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting role",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });
  
  const handleCreateRole = () => {
    if (!newRole.name.trim()) {
      toast({
        title: "Validation error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }
    
    createRoleMutation.mutate(newRole);
  };
  
  const handleUpdateRole = () => {
    if (!editingRole || !editingRole.name.trim()) {
      toast({
        title: "Validation error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }
    
    updateRoleMutation.mutate({
      id: editingRole.id,
      data: {
        name: editingRole.name,
        description: editingRole.description,
        isDefault: editingRole.isDefault,
      },
    });
  };
  
  const handleDeleteRole = (id: number) => {
    deleteRoleMutation.mutate(id);
  };
  
  const startEdit = (role: UserRole) => {
    setEditingRole({ ...role });
  };
  
  const cancelEdit = () => {
    setEditingRole(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">User Roles</h2>
        {!showNewRoleForm && (
          <Button 
            onClick={() => setShowNewRoleForm(true)} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <PlusCircle size={16} />
            <span>New Role</span>
          </Button>
        )}
      </div>

      {/* New Role Form */}
      {showNewRoleForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Role</CardTitle>
            <CardDescription>
              Define a new user role with specific permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="e.g., Premium User"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                value={newRole.description || ""}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="Describe what this role is for"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="role-default"
                checked={newRole.isDefault}
                onCheckedChange={(checked) => setNewRole({ ...newRole, isDefault: checked })}
              />
              <Label htmlFor="role-default">Set as default role for new users</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowNewRoleForm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRole} 
              disabled={createRoleMutation.isPending}
              className="flex items-center gap-2"
            >
              {createRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Role
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles?.map((role) => (
          <Card key={role.id} className={role.isDefault ? "border-primary" : ""}>
            {editingRole && editingRole.id === role.id ? (
              // Edit mode
              <>
                <CardHeader>
                  <CardTitle>Edit Role</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`edit-name-${role.id}`}>Role Name</Label>
                    <Input
                      id={`edit-name-${role.id}`}
                      value={editingRole.name}
                      onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-desc-${role.id}`}>Description</Label>
                    <Textarea
                      id={`edit-desc-${role.id}`}
                      value={editingRole.description || ""}
                      onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`edit-default-${role.id}`}
                      checked={editingRole.isDefault || false}
                      onCheckedChange={(checked) => setEditingRole({ ...editingRole, isDefault: checked })}
                    />
                    <Label htmlFor={`edit-default-${role.id}`}>Default role</Label>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateRole} 
                    disabled={updateRoleMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Save size={16} />
                    Save Changes
                  </Button>
                </CardFooter>
              </>
            ) : (
              // View mode
              <>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{role.name}</CardTitle>
                    {role.isDefault && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <CardDescription>{role.description}</CardDescription>
                  )}
                </CardHeader>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(role)}
                    className="flex items-center gap-1"
                  >
                    <Edit size={14} />
                    Edit
                  </Button>
                  
                  {!role.isDefault && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Trash size={14} />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the "{role.name}" role. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteRole(role.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardFooter>
              </>
            )}
          </Card>
        ))}
      </div>

      {roles?.length === 0 && (
        <Alert>
          <AlertTitle>No roles found</AlertTitle>
          <AlertDescription>
            Create your first user role to start managing user permissions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default UserRolesList;