import { User as BaseUser, NewUser, UserActivity, Invite, InsertInvite, UserProfile } from "@shared/schema";

// Extended User interface with role information
export interface User extends BaseUser {
  roleName?: string;
  appUserId?: number;
}

// Connection status interface
export interface ConnectionStatus {
  connected: boolean;
  isAdmin: boolean;
  configured: boolean;
  serverUrl?: string;
  serverName?: string;
  apiKey?: string;
}

// Validate Jellyfin server URL is reachable
export async function validateJellyfinUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch("/api/validate-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to validate Jellyfin server URL");
    }

    return true;
  } catch (error) {
    console.error("Error validating Jellyfin URL:", error);
    throw error;
  }
}

// Connect to Jellyfin API using username/password
export async function connectToJellyfin(url: string, username: string, password: string): Promise<boolean> {
  try {
    const response = await fetch("/api/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to connect to Jellyfin server");
    }

    return true;
  } catch (error) {
    console.error("Error connecting to Jellyfin:", error);
    throw error;
  }
}

// Disconnect from Jellyfin API
export async function disconnectFromJellyfin(): Promise<{ message: string; configured: boolean }> {
  try {
    const response = await fetch("/api/disconnect", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to disconnect from Jellyfin server");
    }

    return await response.json();
  } catch (error) {
    console.error("Error disconnecting from Jellyfin:", error);
    throw error;
  }
}

// Get connection status
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  try {
    const response = await fetch("/api/connection-status");
    
    if (!response.ok) {
      throw new Error("Failed to get connection status");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting connection status:", error);
    throw error;
  }
}

// Get all users
export async function getUsers(): Promise<User[]> {
  try {
    const response = await authenticatedFetch("/api/users");
    
    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }
    
    // Get basic users
    const users = await response.json();
    
    try {
      // Fetch all app users to get role information
      const appUsersRes = await authenticatedFetch("/api/app-users");
      if (appUsersRes.ok) {
        const appUsers = await appUsersRes.json();
        
        // Get all roles first to avoid multiple requests
        const rolesRes = await authenticatedFetch("/api/user-roles");
        const roles = rolesRes.ok ? await rolesRes.json() : [];
        
        // Map role names to users
        for (const user of users) {
          const appUser = appUsers.find((au: any) => au.jellyfinUserId === user.Id);
          if (appUser && appUser.roleId) {
            // Find role from our cached roles
            const role = roles.find((r: any) => r.id === appUser.roleId);
            if (role) {
              // Add role name and appUserId to user object
              user.roleName = role.name;
              user.appUserId = appUser.id;
            }
          }
        }
      }
    } catch (appErr) {
      console.error("Error fetching app users or roles:", appErr);
      // Continue with basic users even if app users fetch fails
    }
    
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

// Get user by ID
export async function getUserById(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch user");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}

// Create a new user
export async function createUser(user: NewUser): Promise<User> {
  try {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create user");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Update a user
export async function updateUser(id: string, userData: Partial<NewUser>): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update user");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

// Delete a user
export async function deleteUser(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/users/${id}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete user");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

// Get user activity
export async function getUserActivity(id: string, limit: number = 10): Promise<{ Items: UserActivity[], TotalRecordCount: number }> {
  try {
    const response = await fetch(`/api/users/${id}/activity?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch user activity");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user activity:", error);
    throw error;
  }
}

// Helper function to determine user role from policy
export function getUserRole(user: User): string {
  // First check if we have a custom role name stored
  if (user.roleName) {
    return user.roleName;
  }
  
  // Otherwise fallback to system-determined roles
  if (user.Policy?.IsAdministrator) {
    return "Administrator";
  } else if (user.Policy?.EnableMediaPlayback && user.Policy?.EnableContentDeletion) {
    return "ContentManager";
  } else {
    return "User";
  }
}

// Function to ensure authenticated API requests
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  };
  
  try {
    const response = await fetch(url, fetchOptions);
    
    if (response.status === 401) {
      console.error('Authentication required for this request');
      throw new Error('Authentication required');
    }
    
    return response;
  } catch (error) {
    console.error(`Error during authenticated fetch to ${url}:`, error);
    throw error;
  }
};

// Get all user roles
export async function getUserRoles(): Promise<any[]> {
  try {
    const response = await authenticatedFetch('/api/user-roles');
    
    if (!response.ok) {
      console.error('Failed to fetch user roles:', response.statusText);
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }
}

// Get role for a specific user
export async function getUserRoleById(userId: number): Promise<any> {
  try {
    const response = await authenticatedFetch(`/api/users/${userId}/role`);
    
    if (!response.ok) {
      console.error(`Failed to fetch role for user ${userId}:`, response.statusText);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching role for user ${userId}:`, error);
    return null;
  }
}

// Assign role to user
export async function assignRoleToUser(userId: number, roleId: number): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`/api/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ roleId }),
    });
    
    if (!response.ok) {
      console.error(`Failed to assign role to user ${userId}:`, response.statusText);
      throw new Error(response.statusText || "Failed to assign role");
    }
    
    return true;
  } catch (error) {
    console.error(`Error assigning role to user ${userId}:`, error);
    throw error;
  }
}

// Format date for display
export function formatDate(dateString?: string): string {
  if (!dateString) return "Never";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (error) {
    return "Invalid date";
  }
}

// Get user total watch time (in minutes)
export async function getUserWatchTime(id: string): Promise<number> {
  try {
    const response = await fetch(`/api/users/${id}/watch-time`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch user watch time");
    }
    
    const data = await response.json();
    return data.totalMinutes || 0;
  } catch (error) {
    console.error(`Error fetching watch time for user ${id}:`, error);
    return 0; // Return 0 minutes as fallback
  }
}

// Format minutes into a readable time string (e.g. 2h 15m)
export function formatWatchTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.floor(minutes % 60);
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

// Get all user profiles
export async function getUserProfiles(): Promise<UserProfile[]> {
  try {
    const response = await fetch('/api/user-profiles');
    
    if (!response.ok) {
      throw new Error("Failed to fetch user profiles");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user profiles:", error);
    throw error;
  }
}

// Get all invites
export async function getInvites(): Promise<Invite[]> {
  try {
    const response = await fetch('/api/invites');
    
    if (!response.ok) {
      throw new Error("Failed to fetch invites");
    }

    const invites = await response.json();
    
    // Calculate uses remaining for each invite
    return invites.map((invite: Invite) => ({
      ...invite,
      usesRemaining: invite.maxUses === null ? null : (invite.maxUses - (invite.usedCount || 0)),
      
      // Ensure we have values for displaying expiry info
      userExpiryMonths: invite.userExpiryMonths || 0,
      userExpiryDays: invite.userExpiryDays || 0
    }));
  } catch (error) {
    console.error("Error fetching invites:", error);
    throw error;
  }
}

// Create a new invite
export async function createInvite(inviteData: Partial<InsertInvite>): Promise<Invite> {
  try {
    const response = await fetch('/api/invites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(inviteData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create invite");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating invite:", error);
    throw error;
  }
}

// Delete an invite
export async function deleteInvite(id: number): Promise<void> {
  try {
    const response = await fetch(`/api/invites/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error("Failed to delete invite");
    }
  } catch (error) {
    console.error("Error deleting invite:", error);
    throw error;
  }
}

// Format expiration time for display
export function formatExpiryTime(months: number | null = 0, days: number | null = 0, hours: number | null = 0): string {
  // Handle null/undefined values
  const safeMonths = months || 0;
  const safeDays = days || 0;
  const safeHours = hours || 0;
  
  if (safeMonths === 0 && safeDays === 0 && safeHours === 0) {
    return "Never expires";
  }
  
  const parts = [];
  
  if (safeMonths > 0) {
    parts.push(`${safeMonths} month${safeMonths > 1 ? 's' : ''}`);
  }
  
  if (safeDays > 0) {
    parts.push(`${safeDays} day${safeDays > 1 ? 's' : ''}`);
  }
  
  if (safeHours > 0) {
    parts.push(`${safeHours} hour${safeHours > 1 ? 's' : ''}`);
  }
  
  return parts.join(', ') || "Custom expiry";
}

// Disable user (sets IsDisabled property in user policy)
export async function disableUser(userId: string, disable: boolean = true): Promise<User> {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        IsDisabled: disable
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to ${disable ? 'disable' : 'enable'} user`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error ${disable ? 'disabling' : 'enabling'} user:`, error);
    throw error;
  }
}
