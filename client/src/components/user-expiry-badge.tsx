import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Ban, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserExpiryBadgeProps {
  expiresAt?: string | null;
  disabled?: boolean;
  small?: boolean;
}

export function UserExpiryBadge({ expiresAt, disabled, small = false }: UserExpiryBadgeProps) {
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
  
  // Check if expired
  const expiryDate = expiresAt ? new Date(expiresAt) : null;
  const now = new Date();
  const isExpired = expiryDate && expiryDate < now;
  
  // Calculate days remaining
  const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
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
  const warningThreshold = 7;
  const isExpiringSoon = daysRemaining <= warningThreshold && daysRemaining > 0;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isExpiringSoon ? "outline" : "secondary"} 
            className={isExpiringSoon ? "text-amber-500 border-amber-500 bg-amber-500/10" : ""}
          >
            <Clock className={`${small ? 'h-2 w-2' : 'h-3 w-3'} mr-1`} />
            {daysRemaining} {small ? 'd' : 'days'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">
            {isExpiringSoon 
              ? `Account will expire in ${daysRemaining} days` 
              : `Account expires on ${expiryDate?.toLocaleDateString()}`
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}