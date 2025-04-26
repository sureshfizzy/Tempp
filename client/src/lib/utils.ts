import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  if (!name) return "";
  
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getStatusColor(isDisabled?: boolean): { bgColor: string, textColor: string } {
  if (isDisabled) {
    return { bgColor: "bg-neutral-400", textColor: "text-neutral-700" };
  }
  return { bgColor: "bg-green-500", textColor: "text-green-800" };
}

export function getRoleColor(role: string): { bgColor: string, textColor: string } {
  switch (role) {
    case "Administrator":
      return { bgColor: "bg-blue-100", textColor: "text-blue-800" };
    case "ContentManager":
      return { bgColor: "bg-green-100", textColor: "text-green-800" };
    default:
      return { bgColor: "bg-purple-100", textColor: "text-purple-800" };
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function filterUsers(users: Array<any>, searchQuery: string) {
  if (!searchQuery.trim()) return users;
  
  const query = searchQuery.toLowerCase();
  return users.filter(user => {
    return (
      user.Name?.toLowerCase().includes(query) ||
      (user.Configuration?.AudioLanguagePreference || "").toLowerCase().includes(query)
    );
  });
}
