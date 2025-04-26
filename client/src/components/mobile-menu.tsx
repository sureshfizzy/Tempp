import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Users, 
  Home, 
  Settings, 
  Activity, 
  LogOut, 
  Film,
  UserCircle2,
  History,
  Ticket
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MobileMenuProps {
  onClose?: () => void;
  onDisconnect: () => void;
  isDisconnecting: boolean;
  isAdmin?: boolean;
}

export function MobileMenu({ onClose, onDisconnect, isDisconnecting, isAdmin = false }: MobileMenuProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path || location.startsWith(path + '/');
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Main navigation */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Main Menu</h3>
        
        <Link 
          href="/dashboard" 
          onClick={onClose}
          className={`flex items-center rounded-md p-3 ${isActive("/dashboard") ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
        >
          <Home className="h-5 w-5 mr-3" />
          <span>Dashboard</span>
        </Link>
        
        <Link 
          href="/users" 
          onClick={onClose}
          className={`flex items-center rounded-md p-3 ${isActive("/users") ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
        >
          <Users className="h-5 w-5 mr-3" />
          <span>Users</span>
        </Link>
        
        <Link 
          href="/activity" 
          onClick={onClose}
          className={`flex items-center rounded-md p-3 ${isActive("/activity") ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
        >
          <Activity className="h-5 w-5 mr-3" />
          <span>Activity</span>
        </Link>
        
        <Link 
          href="/user-profile" 
          onClick={onClose}
          className={`flex items-center rounded-md p-3 ${isActive("/user-profile") ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
        >
          <UserCircle2 className="h-5 w-5 mr-3" />
          <span>My Profile</span>
        </Link>
      </div>
      
      <Separator className="my-4" />
      
      {/* Admin section */}
      <div className="space-y-1">
        <div className="flex items-center px-1 mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Admin</h3>
          {isAdmin && <Badge className="ml-2 bg-primary/10 text-primary border-primary/20">Admin</Badge>}
        </div>
        
        <Link 
          href="/settings" 
          onClick={onClose}
          className={`flex items-center rounded-md p-3 ${isActive("/settings") ? "bg-primary/10 text-primary" : isAdmin ? "hover:bg-muted" : "text-muted-foreground/50 cursor-not-allowed"}`}
          aria-disabled={!isAdmin}
        >
          <Settings className="h-5 w-5 mr-3" />
          <span>Settings</span>
        </Link>

        <Link 
          href="/invites" 
          onClick={onClose}
          className={`flex items-center rounded-md p-3 ${isActive("/invites") ? "bg-primary/10 text-primary" : isAdmin ? "hover:bg-muted" : "text-muted-foreground/50 cursor-not-allowed"}`}
          aria-disabled={!isAdmin}
        >
          <Ticket className="h-5 w-5 mr-3" />
          <span>Invites</span>
        </Link>
        
        <Link 
          href="/history" 
          onClick={onClose}
          className={`flex items-center rounded-md p-3 ${isActive("/history") ? "bg-primary/10 text-primary" : isAdmin ? "hover:bg-muted" : "text-muted-foreground/50 cursor-not-allowed"}`}
          aria-disabled={!isAdmin}
        >
          <History className="h-5 w-5 mr-3" />
          <span>Watch History</span>
        </Link>
      </div>
      
      <Separator className="my-4" />
      
      {/* Account actions */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Account</h3>
        
        <Button
          variant="ghost"
          className="flex items-center justify-start w-full rounded-md p-3 hover:bg-destructive/10 hover:text-destructive"
          onClick={onDisconnect}
          disabled={isDisconnecting}
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>Disconnect Server</span>
          {isDisconnecting && (
            <span className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
          )}
        </Button>
      </div>
    </div>
  );
}