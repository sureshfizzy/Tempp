import React, { useState } from "react";
import { Link } from "wouter";
import { 
  Users, 
  Home, 
  Server, 
  Activity,
  LogOut, 
  Menu as MenuIcon
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MobileMenu } from "@/components/mobile-menu";

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
  title = "Jellyfin User Management", 
  subtitle,
  user,
  onDisconnect,
  isDisconnecting,
  isAdmin = false
}: AppHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-10">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {/* Mobile menu - Sheet component for better UX */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85%] sm:w-[350px]">
              <div className="py-4">
                <MobileMenu 
                  onClose={() => setIsMenuOpen(false)} 
                  onDisconnect={onDisconnect}
                  isDisconnecting={isDisconnecting}
                />
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            <span className="font-semibold">{title}</span>
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </Link>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-5 text-sm">
            <Link href="/users" className="text-muted-foreground hover:text-foreground transition-colors">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </div>
            </Link>
            <Link href="/activity" className="text-muted-foreground hover:text-foreground transition-colors">
              <div className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                <span>Activity</span>
              </div>
            </Link>
            {isAdmin && (
              <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
                <div className="flex items-center gap-1">
                  <Server className="h-4 w-4" />
                  <span>Settings</span>
                </div>
              </Link>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="hidden md:flex"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="md:hidden p-2"
          >
            <LogOut className="h-4 w-4" />
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