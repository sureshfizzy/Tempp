import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { insertJellyfinCredentialsSchema, userSchema, newUserSchema, userActivitySchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";

// Extend the session type to include our custom properties
declare module 'express-session' {
  interface SessionData {
    connected?: boolean;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  const MemoryStoreSession = MemoryStore(session);
  app.use(
    session({
      secret: "jellyfin-manager-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 },
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Connect to Jellyfin API - save credentials and test connection
  app.post("/api/connect", async (req: Request, res: Response) => {
    try {
      const credentials = insertJellyfinCredentialsSchema.parse(req.body);
      
      // Format API URL
      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      // Step 1: Get authentication headers
      const deviceId = "jellyfin-user-manager";
      const deviceName = "Jellyfin User Manager";
      const clientName = "Jellyfin User Manager";
      const clientVersion = "1.0.0";
      const authHeaderValue = `MediaBrowser Client="${clientName}", Device="${deviceName}", DeviceId="${deviceId}", Version="${clientVersion}"`;
      
      // Step 2: Authenticate to get a token
      const authResponse = await fetch(`${apiUrl}/Users/AuthenticateByName`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Emby-Authorization": authHeaderValue
        },
        body: JSON.stringify({
          Username: credentials.username,
          Pw: credentials.password
        })
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        return res.status(401).json({ 
          message: `Authentication failed: ${authResponse.statusText}`,
          details: errorText 
        });
      }

      const authData = await authResponse.json() as {
        AccessToken: string;
        User: {
          Id: string;
          Name: string;
          Policy?: {
            IsAdministrator?: boolean;
          }
        }
      };
      
      const accessToken = authData.AccessToken;
      const userId = authData.User.Id;

      // Verify this user has admin privileges
      if (!authData.User.Policy?.IsAdministrator) {
        return res.status(403).json({ 
          message: "You must log in with an administrator account to manage users" 
        });
      }

      // Save credentials with token and userId
      const credentialsToSave = {
        ...credentials,
        accessToken,
        userId
      };

      await storage.saveJellyfinCredentials(credentialsToSave);
      
      // Store in session
      if (req.session) {
        req.session.connected = true;
      }

      return res.status(200).json({ 
        message: "Connected successfully",
        user: {
          id: userId,
          name: authData.User.Name
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      if (error instanceof Error) {
        return res.status(500).json({ message: `Failed to connect: ${error.message}` });
      }
      return res.status(500).json({ message: "Failed to connect to Jellyfin server" });
    }
  });

  // Disconnect from Jellyfin - clear session
  app.post("/api/disconnect", (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to disconnect" });
        }
        res.status(200).json({ message: "Disconnected successfully" });
      });
    } else {
      res.status(200).json({ message: "Already disconnected" });
    }
  });

  // Check connection status
  app.get("/api/connection-status", async (req: Request, res: Response) => {
    try {
      const isConnected = req.session?.connected === true;
      const credentials = await storage.getJellyfinCredentials();
      
      if (isConnected && credentials) {
        return res.status(200).json({ 
          connected: true,
          url: credentials.url
        });
      }
      
      return res.status(200).json({ connected: false });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get connection status" });
    }
  });

  // Get all users
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const credentials = await storage.getJellyfinCredentials();
      
      if (!credentials) {
        return res.status(401).json({ message: "Not connected to Jellyfin server" });
      }

      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      const response = await fetch(`${apiUrl}/Users`, {
        headers: {
          "X-Emby-Token": credentials.accessToken || "" || "",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ 
          message: `Failed to fetch users: ${response.statusText}` 
        });
      }

      const users = await response.json();
      // Validate the response with zod
      const parsedUsers = z.array(userSchema).parse(users);
      
      return res.status(200).json(parsedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const credentials = await storage.getJellyfinCredentials();
      
      if (!credentials) {
        return res.status(401).json({ message: "Not connected to Jellyfin server" });
      }

      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      const response = await fetch(`${apiUrl}/Users/${id}`, {
        headers: {
          "X-Emby-Token": credentials.accessToken || "",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ 
          message: `Failed to fetch user: ${response.statusText}` 
        });
      }

      const user = await response.json();
      // Validate the response with zod
      const parsedUser = userSchema.parse(user);
      
      return res.status(200).json(parsedUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create a new user
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const newUser = newUserSchema.parse(req.body);
      const credentials = await storage.getJellyfinCredentials();
      
      if (!credentials) {
        return res.status(401).json({ message: "Not connected to Jellyfin server" });
      }

      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      // Create user in Jellyfin
      const response = await fetch(`${apiUrl}/Users/New`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Emby-Token": credentials.accessToken || "",
        },
        body: JSON.stringify({
          Name: newUser.Name,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ 
          message: `Failed to create user: ${response.statusText}`,
          details: errorText
        });
      }

      const createdUser = await response.json() as { Id: string };
      const userId = createdUser.Id;

      // Set password
      if (newUser.Password) {
        const pwResponse = await fetch(`${apiUrl}/Users/${userId}/Password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Emby-Token": credentials.accessToken || "",
          },
          body: JSON.stringify({
            Id: userId,
            CurrentPw: "",
            NewPw: newUser.Password,
          }),
        });

        if (!pwResponse.ok) {
          console.error(`Failed to set password: ${pwResponse.statusText}`);
        }
      }

      // Update user policy
      if (newUser.Role || newUser.IsDisabled !== undefined) {
        // First get the current policy
        const policyResponse = await fetch(`${apiUrl}/Users/${userId}/Policy`, {
          headers: {
            "X-Emby-Token": credentials.accessToken || "",
          },
        });

        if (policyResponse.ok) {
          const currentPolicy = await policyResponse.json() as { 
            IsAdministrator: boolean;
            IsDisabled: boolean;
          };
          
          // Update policy based on role and disabled status
          if (newUser.Role === "Administrator") {
            currentPolicy.IsAdministrator = true;
          } else {
            currentPolicy.IsAdministrator = false;
          }

          if (newUser.IsDisabled !== undefined) {
            currentPolicy.IsDisabled = newUser.IsDisabled;
          }

          // Update policy
          const updatePolicyResponse = await fetch(`${apiUrl}/Users/${userId}/Policy`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Emby-Token": credentials.accessToken || "",
            },
            body: JSON.stringify(currentPolicy),
          });

          if (!updatePolicyResponse.ok) {
            console.error(`Failed to update user policy: ${updatePolicyResponse.statusText}`);
          }
        }
      }

      // Get the updated user details
      const updatedUserResponse = await fetch(`${apiUrl}/Users/${userId}`, {
        headers: {
          "X-Emby-Token": credentials.accessToken || "",
        },
      });

      if (!updatedUserResponse.ok) {
        return res.status(200).json(createdUser); // Return original user if we can't fetch updated
      }

      const updatedUser = await updatedUserResponse.json();
      return res.status(201).json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update a user
  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const credentials = await storage.getJellyfinCredentials();
      
      if (!credentials) {
        return res.status(401).json({ message: "Not connected to Jellyfin server" });
      }

      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      // Name update
      if (updateData.Name) {
        const response = await fetch(`${apiUrl}/Users/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Emby-Token": credentials.accessToken || "",
          },
          body: JSON.stringify({
            Name: updateData.Name,
          }),
        });

        if (!response.ok) {
          return res.status(response.status).json({ 
            message: `Failed to update user name: ${response.statusText}` 
          });
        }
      }

      // Password update
      if (updateData.Password) {
        const pwResponse = await fetch(`${apiUrl}/Users/${id}/Password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Emby-Token": credentials.accessToken || "",
          },
          body: JSON.stringify({
            Id: id,
            CurrentPw: "",
            NewPw: updateData.Password,
            ResetPassword: true
          }),
        });

        if (!pwResponse.ok) {
          console.error(`Failed to update password: ${pwResponse.statusText}`);
        }
      }

      // Update user policy
      if (updateData.Role || updateData.IsDisabled !== undefined) {
        // First get the current policy
        const policyResponse = await fetch(`${apiUrl}/Users/${id}/Policy`, {
          headers: {
            "X-Emby-Token": credentials.accessToken || "",
          },
        });

        if (policyResponse.ok) {
          const currentPolicy = await policyResponse.json() as { 
            IsAdministrator: boolean;
            IsDisabled: boolean;
          };
          
          // Update policy based on role and disabled status
          if (updateData.Role === "Administrator") {
            currentPolicy.IsAdministrator = true;
          } else if (updateData.Role) {
            currentPolicy.IsAdministrator = false;
          }

          if (updateData.IsDisabled !== undefined) {
            currentPolicy.IsDisabled = updateData.IsDisabled;
          }

          // Update policy
          const updatePolicyResponse = await fetch(`${apiUrl}/Users/${id}/Policy`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Emby-Token": credentials.accessToken || "",
            },
            body: JSON.stringify(currentPolicy),
          });

          if (!updatePolicyResponse.ok) {
            console.error(`Failed to update user policy: ${updatePolicyResponse.statusText}`);
          }
        }
      }

      // Get the updated user details
      const updatedUserResponse = await fetch(`${apiUrl}/Users/${id}`, {
        headers: {
          "X-Emby-Token": credentials.accessToken || "",
        },
      });

      if (!updatedUserResponse.ok) {
        return res.status(updatedUserResponse.status).json({ 
          message: `Failed to fetch updated user: ${updatedUserResponse.statusText}` 
        });
      }

      const updatedUser = await updatedUserResponse.json();
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete a user
  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const credentials = await storage.getJellyfinCredentials();
      
      if (!credentials) {
        return res.status(401).json({ message: "Not connected to Jellyfin server" });
      }

      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      const response = await fetch(`${apiUrl}/Users/${id}`, {
        method: "DELETE",
        headers: {
          "X-Emby-Token": credentials.accessToken || "",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ 
          message: `Failed to delete user: ${response.statusText}` 
        });
      }

      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Get user activity
  app.get("/api/users/:id/activity", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const credentials = await storage.getJellyfinCredentials();
      
      if (!credentials) {
        return res.status(401).json({ message: "Not connected to Jellyfin server" });
      }

      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      // Query params for activity
      const limit = req.query.limit || 10;
      
      const response = await fetch(
        `${apiUrl}/System/ActivityLog/Entries?userId=${id}&limit=${limit}`, 
        {
          headers: {
            "X-Emby-Token": credentials.accessToken || "",
          },
        }
      );

      if (!response.ok) {
        return res.status(response.status).json({ 
          message: `Failed to fetch user activity: ${response.statusText}` 
        });
      }

      const activityData = await response.json();
      // Validate the response
      const parsedActivity = z.object({
        Items: z.array(userActivitySchema),
        TotalRecordCount: z.number()
      }).parse(activityData);
      
      return res.status(200).json(parsedActivity);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      return res.status(500).json({ message: "Failed to fetch user activity" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
