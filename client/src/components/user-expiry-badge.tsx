import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Ban, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState, useMemo } from "react";

interface UserExpiryBadgeProps {
  expiresAt?: string | null;
  disabled?: boolean;
  small?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

// Calculate time difference between two dates in a more detailed way
function getTimeRemaining(endDate: Date): TimeRemaining {
  const total = endDate.getTime() - Date.now();
  const seconds = Math.max(0, Math.floor((total / 1000) % 60));
  const minutes = Math.max(0, Math.floor((total / 1000 / 60) % 60));
  const hours = Math.max(0, Math.floor((total / (1000 * 60 * 60)) % 24));
  const days = Math.max(0, Math.floor(total / (1000 * 60 * 60 * 24)));
  
  return {
    total,
    days,
    hours,
    minutes,
    seconds
  };
}

// Format the time remaining in a human-readable way
function formatTimeRemaining(time: TimeRemaining, small: boolean): string {
  if (time.total <= 0) {
    return "Expired";
  }
  
  if (small) {
    // For small badges, show the most significant unit
    if (time.days > 0) return `${time.days}d`;
    if (time.hours > 0) return `${time.hours}h`;
    return `${time.minutes}m`;
  }
  
  // For regular badges
  if (time.days > 0) {
    return time.days === 1 ? "1 day" : `${time.days} days`;
  }
  
  if (time.hours > 0) {
    return time.hours === 1 ? "1 hour" : `${time.hours} hours`;
  }
  
  return time.minutes === 1 ? "1 minute" : `${time.minutes} minutes`;
}

export function UserExpiryBadge({ expiresAt, disabled, small = false }: UserExpiryBadgeProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  
  // Parse the expiry date once
  const expiryDate = useMemo(() => expiresAt ? new Date(expiresAt) : null, [expiresAt]);
  
  // Check if expired
  const isExpired = useMemo(() => {
    if (!timeRemaining) return false;
    return timeRemaining.total <= 0;
  }, [timeRemaining]);
  
  // Update the countdown timer every minute
  useEffect(() => {
    if (!expiryDate) return;
    
    // Function to update the time remaining
    const updateTime = () => {
      setTimeRemaining(getTimeRemaining(expiryDate));
    };
    
    // Initial calculation
    updateTime();
    
    // Set up an interval to update every minute
    const intervalId = setInterval(updateTime, 60000); // 60000ms = 1 minute
    
    return () => clearInterval(intervalId);
  }, [expiryDate]);
  
  // If the account is expired, we should trigger the disable process 
  useEffect(() => {
    if (isExpired && expiryDate && expiresAt) {
      // Only attempt to disable once when component mounts and is expired
      const disableExpiredUser = async () => {
        try {
          // Get the Jellyfin user ID from the expiry date string
          const jellyfinUserId = expiresAt.split('_')[0]; // Get the ID if it's part of the string
          
          if (!jellyfinUserId) return;
          
          // Call our simplified disable endpoint that handles everything in one request
          const response = await fetch(`/api/users/${jellyfinUserId}/disable`, {
            method: "POST"
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`Auto-disabled expired user: ${result.userName} (${jellyfinUserId})`);
          } else {
            console.error(`Failed to disable user: ${await response.text()}`);
          }
        } catch (error) {
          console.error("Failed to auto-disable expired user:", error);
        }
      };
      
      disableExpiredUser();
    }
  }, [isExpired, expiryDate, expiresAt]);
  
  // Permanent account (no expiry)
  if (!expiresAt && !disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-green-500 border-green-500 bg-green-500/10">
              <CheckCircle className={`${small ? 'h-2 w-2' : 'h-3 w-3'} mr-1`} />
              {small ? "Perm" : "Permanent"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">This account does not expire</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Disabled account
  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="text-red-500 border-red-500 bg-red-500/10">
              <Ban className={`${small ? 'h-2 w-2' : 'h-3 w-3'} mr-1`} />
              Disabled
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Account has been disabled</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (!expiryDate || !timeRemaining) {
    return null; // Loading state
  }
  
  if (isExpired) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="text-red-500 border-red-500 bg-red-500/10">
              <AlertTriangle className={`${small ? 'h-2 w-2' : 'h-3 w-3'} mr-1`} />
              Expired
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Account expired on {expiryDate.toLocaleDateString()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Show warning if close to expiring (within 7 days)
  const warningThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const isExpiringSoon = timeRemaining.total <= warningThreshold && timeRemaining.total > 0;
  
  // Format detailed tooltip text
  const detailedTimeText = timeRemaining.days > 0 
    ? `${timeRemaining.days} days, ${timeRemaining.hours} hours, ${timeRemaining.minutes} minutes` 
    : timeRemaining.hours > 0
      ? `${timeRemaining.hours} hours, ${timeRemaining.minutes} minutes`
      : `${timeRemaining.minutes} minutes`;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isExpiringSoon ? "outline" : "secondary"} 
            className={isExpiringSoon ? "text-amber-500 border-amber-500 bg-amber-500/10" : ""}
          >
            <Clock className={`${small ? 'h-2 w-2' : 'h-3 w-3'} mr-1`} />
            {formatTimeRemaining(timeRemaining, small)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">
            {isExpiringSoon 
              ? `Account will expire in ${detailedTimeText}` 
              : `Account expires on ${expiryDate.toLocaleDateString()} at ${expiryDate.toLocaleTimeString()}`
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}