import React from "react";
import { Link, useLocation } from "wouter";
import { Users, Home, Server, Activity, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface MobileMenuProps {
  onClose?: () => void;
  onDisconnect: () => void;
  isDisconnecting: boolean;
}

export function MobileMenu({ onClose, onDisconnect, isDisconnecting }: MobileMenuProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Navigation</CardTitle>
        <CardDescription>
          Navigate to other sections
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Link 
          href="/" 
          onClick={onClose}
          className={`flex items-center space-x-2 rounded-md p-3 ${isActive("/") ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
        >
          <Home className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>
        <Link 
          href="/users" 
          onClick={onClose}
          className={`flex items-center space-x-2 rounded-md p-3 ${isActive("/users") ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
        >
          <Users className="h-5 w-5" />
          <span>Users</span>
        </Link>
        <Link 
          href="/activity" 
          onClick={onClose}
          className={`flex items-center space-x-2 rounded-md p-3 ${isActive("/activity") ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
        >
          <Activity className="h-5 w-5" />
          <span>Activity</span>
        </Link>
        <Link 
          href="/settings" 
          onClick={onClose}
          className={`flex items-center space-x-2 rounded-md p-3 ${isActive("/settings") ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
        >
          <Server className="h-5 w-5" />
          <span>Settings</span>
        </Link>
        
        <button
          className="flex items-center space-x-2 rounded-md p-3 text-destructive hover:bg-destructive/10 mt-4"
          onClick={onDisconnect}
          disabled={isDisconnecting}
        >
          <LogOut className="h-5 w-5" />
          <span>Disconnect from Server</span>
          {isDisconnecting && (
            <span className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
          )}
        </button>
      </CardContent>
    </Card>
  );
}