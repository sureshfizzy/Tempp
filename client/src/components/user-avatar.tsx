import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { User } from "@shared/schema";

interface UserAvatarProps {
  user: User;
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({ user, size = "md" }: UserAvatarProps) {
  const initials = getInitials(user.Name);
  
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-xl"
  };
  
  // Generate a consistent color based on the user ID
  const colorIndex = user.Id?.charCodeAt(0) || 0;
  const bgColors = [
    "bg-primary-light", // Primary from design
    "bg-secondary-light", // Secondary from design
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-indigo-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-red-500",
    "bg-orange-500"
  ];
  
  const bgColor = bgColors[colorIndex % bgColors.length];
  
  return (
    <Avatar className={`${sizeClasses[size]} ${bgColor} text-white font-medium flex-shrink-0`}>
      <AvatarFallback className={`${bgColor} text-white`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
