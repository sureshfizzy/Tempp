import { User, NewUser, UserActivity } from "@shared/schema";

// Connect to Jellyfin API
export async function connectToJellyfin(url: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("/api/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, apiKey }),
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
export async function disconnectFromJellyfin(): Promise<boolean> {
  try {
    const response = await fetch("/api/disconnect", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to disconnect from Jellyfin server");
    }

    return true;
  } catch (error) {
    console.error("Error disconnecting from Jellyfin:", error);
    throw error;
  }
}

// Get connection status
export async function getConnectionStatus(): Promise<{ connected: boolean; url?: string }> {
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
    const response = await fetch("/api/users");
    
    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }

    return await response.json();
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
export function getUserRole(user: User): "Administrator" | "User" | "ContentManager" {
  if (user.Policy?.IsAdministrator) {
    return "Administrator";
  } else if (user.Policy?.EnableMediaPlayback && user.Policy?.EnableContentDeletion) {
    return "ContentManager";
  } else {
    return "User";
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
