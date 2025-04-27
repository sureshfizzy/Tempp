import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getUserRoles, assignRoleToUser } from '@/lib/jellyfin';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface AssignRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  currentRoleId?: number;
}

export function AssignRoleModal({ isOpen, onClose, userId, userName, currentRoleId }: AssignRoleModalProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(currentRoleId?.toString() || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all available roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['/api/user-roles'],
    queryFn: getUserRoles,
    staleTime: 30000,
    enabled: isOpen,
  });

  // Reset selected role when modal opens with new user
  useEffect(() => {
    if (isOpen && currentRoleId) {
      setSelectedRoleId(currentRoleId.toString());
    } else if (isOpen && roles && roles.length > 0) {
      // If we don't have a current role but have available roles, select the first one
      setSelectedRoleId(roles[0].id.toString());
    }
  }, [isOpen, currentRoleId, roles]);

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async (data: { userId: number; roleId: number }) => {
      return assignRoleToUser(data.userId, data.roleId);
    },
    onSuccess: () => {
      toast({
        title: 'Role assigned',
        description: `Role has been updated successfully for ${userName}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to assign role',
        description: error.message || 'An error occurred while assigning the role.',
        variant: 'destructive',
      });
    },
  });

  const handleAssignRole = () => {
    if (!selectedRoleId) {
      toast({
        title: 'No role selected',
        description: 'Please select a role to assign to the user.',
        variant: 'destructive',
      });
      return;
    }

    assignRoleMutation.mutate({
      userId,
      roleId: parseInt(selectedRoleId, 10),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Role to {userName}</DialogTitle>
          <DialogDescription>
            Select a role to assign to this user. The role determines what permissions the user has.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {rolesLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                    {role.isDefault && ' (Default)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignRole}
            disabled={assignRoleMutation.isPending || !selectedRoleId}
            className="ml-2"
          >
            {assignRoleMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Assign Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}