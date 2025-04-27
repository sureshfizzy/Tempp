import { User } from "@shared/schema";

interface StatusBadgeProps {
  user: User;
}

export function StatusBadge({ user }: StatusBadgeProps) {
  const isDisabled = user.Policy?.IsDisabled;
  
  return (
    <span className="inline-flex items-center space-x-1">
      <span className={`h-2.5 w-2.5 rounded-full ${isDisabled ? 'bg-neutral-400' : 'bg-green-500'}`}></span>
      <span className="text-sm font-medium text-neutral-700">
        {isDisabled ? 'Disabled' : 'Active'}
      </span>
    </span>
  );
}

interface RoleBadgeProps {
  role: "Administrator" | "User" | "ContentManager";
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const roleStyles = {
    Administrator: "bg-blue-100 text-blue-800",
    User: "bg-purple-100 text-purple-800",
    ContentManager: "bg-green-100 text-green-800"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleStyles[role]}`}>
      {role}
    </span>
  );
}
