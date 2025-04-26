import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";
import { AlertTriangle, X } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  user: User;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({ 
  isOpen, 
  user, 
  isDeleting,
  onConfirm, 
  onCancel 
}: DeleteConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Confirm Delete</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onCancel}
            disabled={isDeleting}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="p-1">
          <div className="flex items-center text-destructive mb-4">
            <AlertTriangle className="text-3xl mr-3 h-8 w-8" />
            <div className="text-neutral-800 font-medium">Delete User Account?</div>
          </div>
          
          <p className="text-neutral-700 mb-6">
            Are you sure you want to delete the user "<span className="font-medium">{user.Name}</span>"? This action cannot be undone and will permanently remove the user from your Jellyfin server.
          </p>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-current"></div>
                Deleting...
              </>
            ) : (
              "Delete User"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
