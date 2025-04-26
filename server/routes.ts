import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { 
  insertJellyfinCredentialsSchema, 
  userSchema, 
  newUserSchema, 
  userActivitySchema, 
  insertServerConfigSchema,
  loginSchema,
  InsertAppUser
} from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

// Extend the session type to include our custom properties
declare module 'express-session' {
  interface SessionData {
    connected?: boolean;
    userId?: number;
    isAdmin?: boolean;
    jellyfinUserId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware with PostgreSQL
  const PgSession = connectPgSimple(session);
  
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: 'sessions', // Match our schema
        createTableIfMissing: true
      }),
      secret: "jellyfin-manager-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
    })
  );
  
  // Middleware to check if user is authenticated for protected routes
  const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Check if session user exists in database
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      // Clear invalid session
      req.session.destroy((err) => {
        if (err) console.error("Error destroying session:", err);
      });
      return res.status(401).json({ message: "Authentication required" });
    }
    
    next();
  };
  
  // Middleware to check if user is admin
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId || !req.session.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }
    
    // Double-check admin status from database
    const user = await storage.getUserById(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }
    
    next();
  };

  // Check if system has been configured
  app.get("/api/system/status", async (req: Request, res: Response) => {
    try {
      const serverConfig = await storage.getServerConfig();
      const jellyfinCreds = await storage.getJellyfinCredentials();
      
      // Check if the user is logged in
      const isAuthenticated = Boolean(req.session?.userId);
      
      return res.status(200).json({
        configured: Boolean(serverConfig && jellyfinCreds),
        authenticated: isAuthenticated,
        isAdmin: Boolean(req.session?.isAdmin)
      });
    } catch (error) {
      console.error("Error checking system status:", error);
      return res.status(500).json({ message: "Failed to check system status" });
    }
  });

  // Initial server setup - only available if not configured
  app.post("/api/system/setup", async (req: Request, res: Response) => {
    try {
      // Check if already configured
      const existingConfig = await storage.getServerConfig();
      if (existingConfig) {
        return res.status(400).json({ message: "System already configured" });
      }
      
      // Validate server config
      const { url, apiKey } = insertServerConfigSchema.parse(req.body);
      
      // Format API URL
      const apiUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      
      // Verify the Jellyfin server is reachable
      const infoResponse = await fetch(`${apiUrl}/System/Info/Public`, {
        headers: {
          "Accept": "application/json",
          "X-MediaBrowser-Token": apiKey
        }
      });
      
      if (!infoResponse.ok) {
        return res.status(400).json({ 
          message: `Could not connect to Jellyfin server: ${infoResponse.statusText}` 
        });
      }
      
      const serverInfo = await infoResponse.json() as { ServerName?: string; Version?: string };
      
      // Save server configuration to database
      await storage.saveServerConfig({ url: apiUrl, apiKey });
      
      return res.status(200).json({ 
        message: "Server configuration saved successfully",
        serverName: serverInfo.ServerName || "Jellyfin Server",
        version: serverInfo.Version || "Unknown"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      if (error instanceof Error) {
        return res.status(500).json({ 
          message: `Failed to configure server: ${error.message}` 
        });
      }
      return res.status(500).json({ message: "Failed to configure server" });
    }
  });

  // Validate Jellyfin server URL
  app.post("/api/validate-url", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }
      
      // Format API URL
      const apiUrl = url.endsWith('/') 
        ? url.slice(0, -1) 
        : url;
      
      // Try to hit the Jellyfin info endpoint to validate URL
      const response = await fetch(`${apiUrl}/System/Info/Public`, {
        headers: {
          "Accept": "application/json",
        }
      });
      
      if (!response.ok) {
        return res.status(400).json({ 
          message: `Could not connect to Jellyfin server: ${response.statusText}` 
        });
      }
      
      // Successfully validated
      const serverInfo = await response.json() as { ServerName?: string; Version?: string };
      return res.status(200).json({ 
        message: "Jellyfin server validated successfully",
        serverName: serverInfo.ServerName || "",
        version: serverInfo.Version || ""
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ 
          message: `Failed to validate Jellyfin server URL: ${error.message}` 
        });
      }
      return res.status(500).json({ 
        message: "Failed to validate Jellyfin server URL" 
      });
    }
  });

  // Connect to Jellyfin API - save admin credentials
  app.post("/api/connect", async (req: Request, res: Response) => {
    try {
      // Get server config first (required for connection)
      const serverConfig = await storage.getServerConfig();
      if (!serverConfig) {
        return res.status(400).json({ message: "Server not configured. Please set up the server first." });
      }
      
      // Extract API URL and key
      const apiUrl = serverConfig.url;
      const apiKey = serverConfig.apiKey;
      
      // Extract admin credentials from request
      const { adminUsername, adminPassword } = req.body;
      
      if (!adminUsername || !adminPassword) {
        return res.status(400).json({ message: "Admin username and password are required" });
      }
      
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
          Username: adminUsername,
          Pw: adminPassword
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

      // Save Jellyfin credentials with token and userId
      await storage.saveJellyfinCredentials({
        url: apiUrl,
        apiKey,
        adminUsername,
        adminPassword,
        accessToken,
        userId
      });
      
      // Create admin user in our system if it doesn't exist
      const existingUser = await storage.getUserByUsername(adminUsername);
      
      if (!existingUser) {
        // Create an admin user in our system
        const appUser = await storage.createUser({
          username: adminUsername,
          password: adminPassword,
          email: `${adminUsername}@admin.local`, // Placeholder email
          isAdmin: true,
          jellyfinUserId: userId
        });
        
        // Set session
        if (req.session) {
          req.session.connected = true;
          req.session.userId = appUser.id;
          req.session.isAdmin = true;
          req.session.jellyfinUserId = userId;
        }
      } else {
        // Set session with existing user
        if (req.session) {
          req.session.connected = true;
          req.session.userId = existingUser.id;
          req.session.isAdmin = existingUser.isAdmin;
          req.session.jellyfinUserId = existingUser.jellyfinUserId;
        }
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

  // Disconnect from Jellyfin - log out but keep server config
  app.post("/api/disconnect", async (req: Request, res: Response) => {
    try {
      // Instead of destroying the session, we just clear the connected status
      // This allows us to keep server connection info but require login again
      if (req.session) {
        req.session.connected = false;
        req.session.userId = undefined;
        req.session.isAdmin = undefined;
        req.session.jellyfinUserId = undefined;
        
        // Check if we have server config preserved in database
        const serverConfig = await storage.getServerConfig();
        const jellyfinCreds = await storage.getJellyfinCredentials();
        
        // Report back status including if we have stored credentials
        return res.status(200).json({
          message: "Disconnected successfully",
          configured: Boolean(serverConfig && jellyfinCreds)
        });
      } else {
        return res.status(200).json({ 
          message: "Already disconnected", 
          configured: false 
        });
      }
    } catch (error) {
      console.error("Error during disconnect:", error);
      return res.status(500).json({ message: "Failed to disconnect properly" });
    }
  });

  // Check connection status
  app.get("/api/connection-status", async (req: Request, res: Response) => {
    try {
      const isAuthenticated = Boolean(req.session?.userId);
      const isAdmin = Boolean(req.session?.isAdmin);
      const serverConfig = await storage.getServerConfig();
      const jellyfinCreds = await storage.getJellyfinCredentials();
      
      return res.status(200).json({ 
        connected: isAuthenticated,
        isAdmin,
        configured: Boolean(serverConfig && jellyfinCreds),
        serverUrl: serverConfig?.url
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get connection status" });
    }
  });
  
  // Get server settings
  app.get("/api/system/status", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const serverConfig = await storage.getServerConfig();
      if (!serverConfig) {
        return res.status(404).json({ message: "Server configuration not found" });
      }
      
      const jellyfinCreds = await storage.getJellyfinCredentials();
      if (!jellyfinCreds) {
        return res.status(404).json({ message: "Jellyfin credentials not found" });
      }
      
      return res.status(200).json({
        serverName: serverConfig.serverName || "Jellyfin Server",
        serverUrl: serverConfig.url,
        apiKey: jellyfinCreds.apiKey,
        logoUrl: serverConfig.logoUrl || null,
        features: serverConfig.features || {
          enableThemeSwitcher: true,
          enableWatchHistory: true,
          enableActivityLog: true
        },
        inviteDuration: serverConfig.inviteDuration || 24
      });
    } catch (error) {
      console.error("Error fetching server settings:", error);
      return res.status(500).json({ message: "Failed to get server settings" });
    }
  });
  
  // Update server settings
  app.post("/api/system/settings", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { 
        serverName, 
        serverUrl, 
        apiKey, 
        logoUrl, 
        enableThemeSwitcher,
        enableWatchHistory,
        enableActivityLog,
        inviteDuration
      } = req.body;
      
      // Start by getting existing config
      const existingConfig = await storage.getServerConfig();
      if (!existingConfig) {
        return res.status(404).json({ message: "Server configuration not found" });
      }
      
      // Prepare features object
      const features = {
        enableThemeSwitcher: Boolean(enableThemeSwitcher),
        enableWatchHistory: Boolean(enableWatchHistory),
        enableActivityLog: Boolean(enableActivityLog)
      };
      
      // Update server config
      const updatedConfig = await storage.saveServerConfig({
        url: serverUrl || existingConfig.url,
        apiKey: existingConfig.apiKey, // Keep existing API key as it won't change here
        serverName: serverName || existingConfig.serverName,
        logoUrl: logoUrl !== undefined ? logoUrl : existingConfig.logoUrl,
        inviteDuration: inviteDuration || existingConfig.inviteDuration,
        features
      });
      
      // If API key is changing, also update Jellyfin credentials
      if (apiKey) {
        const jellyfinCreds = await storage.getJellyfinCredentials();
        if (jellyfinCreds) {
          await storage.saveJellyfinCredentials({
            ...jellyfinCreds,
            apiKey,
            url: serverUrl || jellyfinCreds.url,
          });
        }
      }
      
      return res.status(200).json({
        message: "Settings updated successfully",
        serverName: updatedConfig.serverName,
        logoUrl: updatedConfig.logoUrl,
        features: updatedConfig.features
      });
    } catch (error) {
      console.error("Error updating server settings:", error);
      return res.status(500).json({ message: "Failed to update server settings" });
    }
  });
  
  // User login
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      console.log("Login attempt with body:", JSON.stringify(req.body));
      
      // Validate login data
      const loginData = loginSchema.parse(req.body);
      console.log("Parsed login data:", JSON.stringify(loginData));
      
      // Verify user exists
      const user = await storage.getUserByUsername(loginData.username);
      console.log("Found user:", user ? JSON.stringify({ id: user.id, username: user.username, isAdmin: user.isAdmin }) : "null");
      
      if (!user) {
        // For security reasons, let's add a more informative message but still return 401
        // Now let's try to see if user exists in Jellyfin but not in our db
        try {
          const credentials = await storage.getJellyfinCredentials();
          if (credentials) {
            const apiUrl = credentials.url.endsWith('/') 
              ? credentials.url.slice(0, -1) 
              : credentials.url;
            
            // Try to get all users from Jellyfin
            const response = await fetch(`${apiUrl}/Users`, {
              headers: {
                "X-Emby-Token": credentials.accessToken || "",
              },
            });
            
            if (response.ok) {
              const jellyfinUsers = await response.json() as Array<{
                Id: string;
                Name: string;
                Policy?: {
                  IsAdministrator?: boolean;
                }
              }>;
              console.log("Jellyfin user count:", jellyfinUsers.length);
              
              // See if a user with this username exists in Jellyfin
              const jellyfinUser = jellyfinUsers.find(u => u.Name.toLowerCase() === loginData.username.toLowerCase());
              console.log("Found Jellyfin user:", jellyfinUser ? "yes" : "no");
              
              if (jellyfinUser) {
                console.log("User exists in Jellyfin but not in local DB, creating local user");
                // This user exists in Jellyfin but not in our local DB
                // Create a local user for them with the provided password
                try {
                  // Try to login to Jellyfin with this username/password to verify credentials
                  const jellyfinLoginResponse = await fetch(`${apiUrl}/Users/AuthenticateByName`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Emby-Authorization": `MediaBrowser Client="Jellyfin Web", Device="Browser", DeviceId="TempDevice", Version="10.8.0"`
                    },
                    body: JSON.stringify({
                      Username: loginData.username,
                      Pw: loginData.password
                    })
                  });
                  
                  if (!jellyfinLoginResponse.ok) {
                    console.log("Jellyfin login failed for new user");
                    return res.status(401).json({ 
                      message: "Invalid username or password", 
                      details: "The credentials you provided could not be verified with the Jellyfin server."
                    });
                  }
                  
                  const jellyfinLoginData = await jellyfinLoginResponse.json();
                  console.log("Jellyfin login successful for new user");
                  
                  // The password will be hashed by storage.createUser
                  const newLocalUser = await storage.createUser({
                    username: jellyfinUser.Name,
                    password: loginData.password, // Password will be hashed in storage.createUser
                    email: `${jellyfinUser.Name.toLowerCase().replace(/[^a-z0-9]/g, '')}@jellyfin.local`,
                    isAdmin: Boolean(jellyfinUser.Policy?.IsAdministrator),
                    jellyfinUserId: jellyfinUser.Id
                  });
                  
                  console.log("Created local user with ID:", newLocalUser.id);
                  
                  // Continue with the created user
                  if (req.session) {
                    req.session.connected = true;
                    req.session.userId = newLocalUser.id;
                    req.session.isAdmin = newLocalUser.isAdmin;
                    req.session.jellyfinUserId = newLocalUser.jellyfinUserId;
                  }
                  
                  return res.status(200).json({
                    message: "Login successful",
                    user: {
                      id: newLocalUser.id,
                      username: newLocalUser.username,
                      isAdmin: newLocalUser.isAdmin
                    }
                  });
                } catch (err) {
                  console.error("Error creating local user during login:", err);
                }
              }
            }
          }
        } catch (err) {
          console.error("Error checking Jellyfin users during login:", err);
        }
        
        return res.status(401).json({ 
          message: "Invalid username or password",
          details: "The credentials you provided are incorrect. Note that usernames and passwords are case-sensitive."
        });
      }
      
      // Verify password
      const isPasswordValid = await storage.validatePassword(user, loginData.password);
      console.log("Password valid:", isPasswordValid);
      
      if (!isPasswordValid) {
        // Try Jellyfin authentication as a fallback
        try {
          console.log("Local password validation failed, trying Jellyfin authentication as fallback");
          const credentials = await storage.getJellyfinCredentials();
          
          if (credentials) {
            const apiUrl = credentials.url.endsWith('/') 
              ? credentials.url.slice(0, -1) 
              : credentials.url;
              
            // Try to authenticate directly with Jellyfin
            const jellyfinLoginResponse = await fetch(`${apiUrl}/Users/AuthenticateByName`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Emby-Authorization": `MediaBrowser Client="Jellyfin Web", Device="Browser", DeviceId="TempDevice", Version="10.8.0"`
              },
              body: JSON.stringify({
                Username: loginData.username,
                Pw: loginData.password
              })
            });
            
            if (jellyfinLoginResponse.ok) {
              // Jellyfin authentication succeeded but local password didn't match
              // Update local password to match
              console.log("Jellyfin authentication succeeded, updating local password to match");
              await storage.updateUser(user.id, {
                password: loginData.password // Will be hashed by updateUser
              });
              
              // Continue with login since Jellyfin auth worked
              console.log("Updated local password hash for user", user.username);
            } else {
              // Both local and Jellyfin authentication failed
              console.log("Both local and Jellyfin authentication failed");
              return res.status(401).json({ 
                message: "Invalid username or password",
                details: "The credentials you provided are incorrect. Note that usernames and passwords are case-sensitive."
              });
            }
          } else {
            // No Jellyfin credentials, can't try fallback
            console.log("No Jellyfin credentials available for fallback authentication");
            return res.status(401).json({ 
              message: "Invalid username or password",
              details: "The credentials you provided are incorrect. Note that usernames and passwords are case-sensitive."
            });
          }
        } catch (err) {
          console.error("Error during fallback authentication:", err);
          return res.status(401).json({ 
            message: "Invalid username or password",
            details: "The credentials you provided are incorrect. Note that usernames and passwords are case-sensitive."
          });
        }
      }
      
      // Setup session
      if (req.session) {
        req.session.connected = true;
        req.session.userId = user.id;
        req.session.isAdmin = user.isAdmin;
        req.session.jellyfinUserId = user.jellyfinUserId;
      }
      
      return res.status(200).json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Login validation error:", error.errors);
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors.map(err => `${err.path}: ${err.message}`).join(', ')
        });
      }
      console.error("Login error:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to login due to server error" 
      });
    }
  });
  
  // Get current user info
  app.get("/api/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session!.userId!;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        jellyfinUserId: user.jellyfinUserId
      });
    } catch (error) {
      console.error("Error fetching current user:", error);
      return res.status(500).json({ message: "Failed to fetch user information" });
    }
  });

  // Get all users
  app.get("/api/users", requireAuth, async (req: Request, res: Response) => {
    try {
      const credentials = await storage.getJellyfinCredentials();
      
      if (!credentials) {
        return res.status(401).json({ message: "Not connected to Jellyfin server" });
      }

      const apiUrl = credentials.url;
      
      const response = await fetch(`${apiUrl}/Users`, {
        headers: {
          "X-Emby-Token": credentials.accessToken || "",
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
      
      // Synchronize Jellyfin users with local database
      try {
        // Get existing app users
        const appUsers = await storage.getAllUsers();
        const appUsersByJellyfinId = new Map(
          appUsers
            .filter(user => user.jellyfinUserId)
            .map(user => [user.jellyfinUserId, user])
        );
        
        // For each Jellyfin user, create an app user if one doesn't exist
        for (const jellyfinUser of parsedUsers) {
          if (!appUsersByJellyfinId.has(jellyfinUser.Id)) {
            console.log(`Syncing user: Creating local user for ${jellyfinUser.Name} with Jellyfin ID ${jellyfinUser.Id}`);
            
            // Make an educated guess about admin status
            const isAdmin = Boolean(jellyfinUser.Policy?.IsAdministrator);
            
            // Generate a secure random password - it will be hashed by createUser
            const tempPassword = "changeme" + Math.random().toString(36).substring(2, 10);
            await storage.createUser({
              username: jellyfinUser.Name,
              password: tempPassword, // Random temporary password, will be hashed in storage.createUser
              email: `${jellyfinUser.Name.toLowerCase().replace(/[^a-z0-9]/g, '')}@jellyfin.local`,
              isAdmin: isAdmin,
              jellyfinUserId: jellyfinUser.Id
            });
            console.log(`Created local user for ${jellyfinUser.Name} with temporary password`);
          }
        }
      } catch (err) {
        console.error("Error syncing users to local database:", err);
        // Continue even if sync fails - we'll still return the Jellyfin users
      }
      
      // If admin, return all users
      // If regular user, only return own info
      if (req.session?.isAdmin) {
        return res.status(200).json(parsedUsers);
      } else {
        // Only return the current user's data
        const jellyfinUserId = req.session?.jellyfinUserId;
        const currentUserData = parsedUsers.find(user => user.Id === jellyfinUserId);
        
        if (!currentUserData) {
          return res.status(404).json({ message: "User not found" });
        }
        
        return res.status(200).json([currentUserData]);
      }
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
      
      // Also create the user in our local database for authentication
      try {
        const isAdmin = newUser.Role === "Administrator";
        // The provided password will be properly hashed by the storage.createUser method
        await storage.createUser({
          username: newUser.Name,
          password: newUser.Password || "changeme" + Math.random().toString(36).substring(2, 10), // Unique password if none provided
          email: newUser.Email || `${newUser.Name.toLowerCase().replace(/[^a-z0-9]/g, '')}@jellyfin.local`,
          isAdmin: isAdmin,
          jellyfinUserId: userId
        });
        
        console.log(`Created local user for ${newUser.Name} with Jellyfin ID ${userId}`);
      } catch (err) {
        console.error("Error creating local user:", err);
        // Continue even if local user creation fails - we'll still return the Jellyfin user
      }
      
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
      
      // Update user in our local database too if they exist
      try {
        // Find the local user by jellyfin ID
        const allUsers = await storage.getAllUsers();
        const localUser = allUsers.find(user => user.jellyfinUserId === id);
        
        if (localUser) {
          // Update relevant fields in local database
          const updates: Partial<InsertAppUser> = {};
          
          if (updateData.Name) {
            updates.username = updateData.Name;
          }
          
          // If password is updated, it will be properly hashed by the updateUser method
          if (updateData.Password) {
            updates.password = updateData.Password;
          }
          
          if (updateData.Role) {
            updates.isAdmin = updateData.Role === "Administrator";
          }
          
          if (Object.keys(updates).length > 0) {
            await storage.updateUser(localUser.id, updates);
            console.log(`Updated local user ${localUser.username} with Jellyfin ID ${id}`);
          }
        } else {
          console.log(`Local user not found for Jellyfin ID ${id}`);
        }
      } catch (err) {
        console.error("Error updating local user:", err);
        // Continue even if local user update fails - we'll still return the Jellyfin user
      }
      
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

      // Also delete the user from our local database if they exist
      try {
        // Find the local user by jellyfin ID
        const allUsers = await storage.getAllUsers();
        const localUser = allUsers.find(user => user.jellyfinUserId === id);
        
        if (localUser) {
          await storage.deleteUser(localUser.id);
          console.log(`Deleted local user ${localUser.username} with Jellyfin ID ${id}`);
        }
      } catch (err) {
        console.error("Error deleting local user:", err);
        // Continue even if local user deletion fails - we'll still return success
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
  
  // Get user watch history
  app.get("/api/users/:id/watch-history", async (req: Request, res: Response) => {
    try {
      // Check if connected to Jellyfin
      if (!req.session.connected) {
        console.log("Watch history: Not connected to Jellyfin");
        return res.status(401).json({ message: "Not connected to Jellyfin" });
      }

      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      console.log(`Watch history: Fetching for user ${id} with limit ${limit}`);
      
      // Get credentials
      const credentials = await storage.getJellyfinCredentials();
      if (!credentials || !credentials.accessToken) {
        console.log("Watch history: No Jellyfin credentials available");
        return res.status(401).json({ message: "No Jellyfin credentials available" });
      }

      // Use the credentials URL instead of the server config URL
      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      // The correct Jellyfin API endpoint for watch history (recently watched/in progress)
      const url = `${apiUrl}/Users/${id}/Items/Resume?Limit=${limit}&Fields=PrimaryImageAspectRatio,BasicSyncInfo&ImageTypeLimit=1&EnableImageTypes=Primary,Backdrop,Thumb`;
      console.log(`Watch history: Making request to ${url}`);
      
      const response = await fetch(url, {
        headers: {
          "X-Emby-Token": credentials.accessToken
        }
      });
      
      if (!response.ok) {
        console.log(`Watch history: Failed with status ${response.status}: ${response.statusText}`);
        return res.status(response.status).json({ 
          message: `Failed to fetch watch history from Jellyfin: ${response.statusText}` 
        });
      }
      
      // Process the response to a consistent format for the client
      const rawData = await response.json() as {
        Items?: Array<{
          Name?: string;
          Id?: string;
          Type?: string;
          UserData?: { LastPlayedDate?: string };
          ImageTags?: { Primary?: string };
          SeriesName?: string;
          SeasonName?: string;
          ProductionYear?: number;
        }>;
        TotalRecordCount?: number;
      };
      
      // Transform into the expected format
      const watchHistory = {
        Items: (rawData.Items || []).map((item) => ({
          Name: item.Name || 'Unknown Title',
          Id: item.Id || '',
          Type: item.Type || 'Episode',
          Date: item.UserData?.LastPlayedDate || new Date().toISOString(),
          ImageTag: item.ImageTags?.Primary || '',
          SeriesName: item.SeriesName || '',
          SeasonName: item.SeasonName || '',
          ProductionYear: item.ProductionYear || new Date().getFullYear()
        })),
        TotalRecordCount: rawData.TotalRecordCount || 0
      };
      
      console.log(`Watch history: Successfully fetched ${watchHistory.Items.length} items`);
      return res.status(200).json(watchHistory);
    } catch (error) {
      console.error("Watch history error:", error);
      return res.status(500).json({ message: "Failed to get user watch history" });
    }
  });

  // ---- Activity Logging Endpoints ----
  
  // Get activity logs
  app.get("/api/activity", async (req: Request, res: Response) => {
    try {
      if (!req.session.connected) {
        return res.status(401).json({ message: "Not connected to Jellyfin" });
      }
      
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Admin privileges required" });
      }
      
      // For a first version, let's return sample data
      // In the future, we'll update the schema.ts and storage.ts to handle this data
      const sampleActivities = [
        {
          id: "1",
          type: "account_created",
          message: "Account created: Mrcoffee",
          timestamp: "4/26/2025 01:29 PM",
          username: "Mrcoffee",
          inviteCode: "TNyWg96ZGdwu8gkEiPViRR"
        },
        {
          id: "2",
          type: "invite_expired",
          message: "Invite expired: TNyWg96ZGdwu8gkEiPViRR",
          timestamp: "4/26/2025 01:29 PM",
          inviteCode: "TNyWg96ZGdwu8gkEiPViRR",
          createdBy: "JFA-GO"
        },
        {
          id: "3",
          type: "invite_created",
          message: "Invite created: TNyWg96ZGdwu8gkEiPViRR",
          timestamp: "4/26/2025 11:30 AM",
          inviteCode: "TNyWg96ZGdwu8gkEiPViRR",
          createdBy: "blackhat"
        },
        {
          id: "4",
          type: "invite_expired",
          message: "Invite expired: vqeRwjEBUftTLhi5MSgc4C",
          timestamp: "4/26/2025 10:51 AM",
          inviteCode: "vqeRwjEBUftTLhi5MSgc4C",
          createdBy: "JFA-GO"
        },
        {
          id: "5",
          type: "account_created",
          message: "Account created: Gaurav",
          timestamp: "4/26/2025 12:25 AM",
          username: "Gaurav",
          inviteCode: "gsxK79GDwB69eUjVFYRs39"
        },
        {
          id: "6",
          type: "invite_expired",
          message: "Invite expired: gsxK79GDwB69eUjVFYRs39",
          timestamp: "4/26/2025 12:25 AM",
          inviteCode: "gsxK79GDwB69eUjVFYRs39",
          createdBy: "JFA-GO"
        }
      ];
      
      res.json(sampleActivities);
    } catch (error) {
      console.error("Error getting activity logs:", error);
      res.status(500).json({ message: "Error getting activity logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
