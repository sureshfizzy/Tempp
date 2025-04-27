import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Users, 
  Home, 
  Server, 
  Activity,
  LogOut, 
  Settings,
  Menu as MenuIcon,
  Film
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { MobileMenu } from "@/components/mobile-menu";
import { Badge } from "@/components/ui/badge";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  user?: {
    username: string;
    jellyfinUserId?: string;
  };
  onDisconnect: () => void;
  isDisconnecting: boolean;
  isAdmin?: boolean;
}

export function AppHeader({ 
  title = "Jellyfin Manager", 
  subtitle,
  user,
  onDisconnect,
  isDisconnecting,
  isAdmin = false
}: AppHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();

  // Determine active path for navigation highlighting
  const isActive = (path: string) => {
    return location === path || location.startsWith(path + '/');
  };

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {/* Mobile menu - Sheet component for better UX */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                aria-label="Open menu"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0">
              <SheetHeader className="p-6 border-b">
                <div className="flex items-center gap-3">
                  <Film className="h-6 w-6 text-primary" />
                  <div>
                    <SheetTitle>{title}</SheetTitle>
                    {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
                  </div>
                </div>
              </SheetHeader>
              <div className="py-6 px-6">
                <MobileMenu 
                  onClose={() => setIsMenuOpen(false)} 
                  onDisconnect={onDisconnect}
                  isDisconnecting={isDisconnecting}
                  isAdmin={isAdmin}
                />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            <span className="font-semibold hidden sm:inline-block">{title}</span>
            <span className="font-semibold sm:hidden">JellyManager</span>
            {subtitle && (
              <span className="hidden md:inline-block text-xs text-muted-foreground max-w-[150px] truncate">
                {subtitle}
              </span>
            )}
          </div>
          
          {/* Desktop navigation - tabs style */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link href="/dashboard" className={`px-3 py-2 rounded-md transition-colors ${isActive("/dashboard") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
              <div className="flex items-center gap-1.5">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </div>
            </Link>

            <Link href="/users" className={`px-3 py-2 rounded-md transition-colors ${isActive("/users") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </div>
            </Link>

            <Link href="/activity" className={`px-3 py-2 rounded-md transition-colors ${isActive("/activity") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
              <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4" />
                <span>Activity</span>
              </div>
            </Link>

            {isAdmin && (
              <Link href="/settings" className={`px-3 py-2 rounded-md transition-colors ${isActive("/settings") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                <div className="flex items-center gap-1.5">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </div>
              </Link>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle />
          
          {isAdmin && (
            <Badge variant="outline" className="hidden md:flex bg-primary/10 text-primary border-primary/20">
              Admin
            </Badge>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="hidden md:flex"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect</span>
            {isDisconnecting && (
              <span className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="md:hidden"
            aria-label="Disconnect"
          >
            <LogOut className="h-4 w-4" />
            {isDisconnecting && (
              <span className="absolute top-1 right-1 h-2 w-2 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
            )}
          </Button>
          
          {user && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.jellyfinUserId ? `/api/users/${user.jellyfinUserId}/image` : undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline-block">
                {user.username}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}