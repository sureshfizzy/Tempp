import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getUserActivity, formatDate, getUserRole } from "@/lib/jellyfin";
import { UserAvatar } from "@/components/user-avatar";
import { RoleBadge, StatusBadge } from "@/components/status-badge";
import { User } from "@shared/schema";
import { X, Video, Tv, AlertTriangle } from "lucide-react";

interface UserDetailsModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onEdit: () => void;
}

export default function UserDetailsModal({ isOpen, user, onClose, onEdit }: UserDetailsModalProps) {
  // Get user activity
  const activityQuery = useQuery({
    queryKey: [`/api/users/${user.Id}/activity`],
    enabled: isOpen, // Only fetch when modal is open
  });

  const activityItems = activityQuery.data?.Items || [];

  // Map activity type to icon
  const getActivityIcon = (type: string) => {
    if (type.includes("Video")) return <Video className="text-neutral-400 mr-2 h-5 w-5 flex-shrink-0" />;
    if (type.includes("TV") || type.includes("Episode")) return <Tv className="text-neutral-400 mr-2 h-5 w-5 flex-shrink-0" />;
    return <span className="material-icons text-neutral-400 mr-2 text-base flex-shrink-0">{type.toLowerCase().includes("audio") ? "music_note" : "movie"}</span>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">User Details</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="p-1 space-y-6">
          <div className="flex items-center">
            <UserAvatar user={user} size="lg" />
            <div className="ml-4">
              <h4 className="text-lg font-medium text-neutral-800">{user.Name}</h4>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <div className="text-sm text-neutral-500">Role</div>
              <div className="mt-1 font-medium">
                <RoleBadge role={getUserRole(user)} />
              </div>
            </div>
            
            <div>
              <div className="text-sm text-neutral-500">Status</div>
              <div className="mt-1 font-medium">
                <StatusBadge user={user} />
              </div>
            </div>
            
            <div>
              <div className="text-sm text-neutral-500">Last Login</div>
              <div className="mt-1 text-sm">{formatDate(user.LastLoginDate)}</div>
            </div>
            
            <div>
              <div className="text-sm text-neutral-500">Last Activity</div>
              <div className="mt-1 text-sm">{formatDate(user.LastActivityDate)}</div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h5 className="text-sm font-medium text-neutral-700 mb-3">Recent Activity</h5>
            
            {activityQuery.isLoading && (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            )}
            
            {activityQuery.isError && (
              <div className="flex items-center justify-center text-sm text-neutral-500 py-4">
                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                Failed to load activity
              </div>
            )}
            
            {!activityQuery.isLoading && !activityQuery.isError && activityItems.length === 0 && (
              <div className="text-center text-sm text-neutral-500 py-4">
                No recent activity found
              </div>
            )}
            
            {!activityQuery.isLoading && !activityQuery.isError && activityItems.length > 0 && (
              <ScrollArea className="max-h-40">
                <div className="space-y-3">
                  {activityItems.map((activity) => (
                    <div key={activity.Id} className="flex items-start text-sm">
                      {getActivityIcon(activity.Type)}
                      <div>
                        <div className="text-neutral-800">{activity.Name}</div>
                        <div className="text-neutral-500 text-xs">{formatDate(activity.Date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
          <Button 
            className="bg-primary hover:bg-primary-dark text-white"
            onClick={onEdit}
          >
            Edit User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
