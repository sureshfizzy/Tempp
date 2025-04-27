import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import fetch from "node-fetch";
import { 
  insertJellyfinCredentialsSchema, 
  userSchema, 
  newUserSchema, 
  userActivitySchema, 
  insertServerConfigSchema,
  loginSchema,
  InsertAppUser,
  insertUserProfileSchema,
  UserProfile,
  invites
} from "@shared/schema";
import { eq } from "drizzle-orm";
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
        tableName: 'session', // Match the existing table name in db-init.ts
        createTableIfMissing: false // Table is already created in db-init.ts
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
            apiKey,
            url: serverUrl || jellyfinCreds.url,
            adminUsername: jellyfinCreds.adminUsername,
            adminPassword: jellyfinCreds.adminPassword,
            accessToken: jellyfinCreds.accessToken || undefined,
            userId: jellyfinCreds.userId || undefined
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

      // Define proper type for Jellyfin API response
  interface JellyfinUser {
    Id: string;
    Name: string;
    Policy?: {
      IsAdministrator?: boolean;
      IsDisabled?: boolean;
      EnableAllFolders?: boolean;
      EnabledFolders?: string[];
      [key: string]: any; // For other policy properties
    };
    [key: string]: any; // For other user properties
  }
  
  const users = await response.json() as JellyfinUser[];
      
  // Log the first user's policy data for debugging
  if (users && users.length > 0 && users[0]) {
    const firstUser = users[0];
    console.log("Debug - User Policy structure:", JSON.stringify(firstUser.Policy || {}));
  }
      
      // Get individual user details which include the full policy
      // This is needed because the list API might not return complete policy data
      const usersWithFullPolicy = await Promise.all(users.map(async (user) => {
        try {
          // According to the Jellyfin API documentation, we should fetch the complete user
          // which includes their policy, as there's no GET method for policy directly
          console.log(`Fetching complete user data for ${user.Name} (${user.Id})`);
          const userResponse = await fetch(`${apiUrl}/Users/${user.Id}`, {
            headers: {
              "X-Emby-Token": credentials.accessToken || "",
            },
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            
            // Check for disabled state and log
            if (userData?.Policy?.IsDisabled) {
              console.log(`User ${user.Name} is disabled via Policy.IsDisabled`);
            }
            
            // Return the complete user data
            return userData;
          } else {
            console.error(`Failed to fetch complete data for user ${user.Name}: ${userResponse.statusText}`);
            return user;
          }
        } catch (error) {
          console.error(`Error fetching data for user ${user.Name}:`, error);
          return user;
        }
      }));
      
      // Validate the response with zod 
      const parsedUsers = z.array(userSchema).parse(usersWithFullPolicy);
      
      // Get local app users for expiry information
      const appUsers = await storage.getAllUsers();
      const appUsersByJellyfinId = new Map(
        appUsers
          .filter(user => user.jellyfinUserId)
          .map(user => [user.jellyfinUserId, user])
      );
      
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
            
            try {
              // First check if username already exists in our database
              const existingUser = await storage.getUserByUsername(jellyfinUser.Name);
              if (existingUser) {
                console.log(`Username ${jellyfinUser.Name} already exists in database, skipping auto-creation`);
                continue; // Skip this user and continue with next one
              }
              
              // Make an educated guess about admin status
              const isAdmin = Boolean(jellyfinUser.Policy?.IsAdministrator);
              
              // Generate a secure random password - it will be hashed by createUser
              const tempPassword = "changeme" + Math.random().toString(36).substring(2, 10);
              
              // Generate a unique email to avoid database constraint issues
              const uniqueEmail = `${jellyfinUser.Name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@jellyfin.local`;
              console.log(`Generated unique email for synced user: ${uniqueEmail}`);
              
              await storage.createUser({
                username: jellyfinUser.Name,
                password: tempPassword, // Random temporary password, will be hashed in storage.createUser
                email: uniqueEmail,
                isAdmin: isAdmin,
                jellyfinUserId: jellyfinUser.Id
              });
              console.log(`Created local user for ${jellyfinUser.Name} with temporary password and unique email`);
            } catch (syncError) {
              console.error(`Error auto-creating local user for ${jellyfinUser.Name}:`, syncError);
              // Continue with next user even if one fails
            }
          }
        }
      } catch (err) {
        console.error("Error syncing users to local database:", err);
        // Continue even if sync fails - we'll still return the Jellyfin users
      }
      
      // Enhance users with expiry information from our database
      // Note: We use Policy.IsDisabled from Jellyfin as the source of truth for disabled state
      // but keep our local expiresAt information
      const usersWithExpiry = parsedUsers.map(user => {
        const appUser = appUsersByJellyfinId.get(user.Id);
        if (appUser) {
          // If Jellyfin shows the user as not disabled but our DB says disabled,
          // update our DB to match Jellyfin's state
          if (!user.Policy?.IsDisabled && appUser.disabled) {
            console.log(`Fixing mismatch: Jellyfin shows ${user.Name} as enabled but local DB has disabled=true`);
            storage.updateUser(appUser.id, { disabled: false })
              .catch(err => console.error(`Failed to update disabled state for ${user.Name}:`, err));
          }
          
          return {
            ...user,
            expiresAt: appUser.expiresAt ? appUser.expiresAt.toISOString() : null
            // Don't use appUser.disabled, use Jellyfin's Policy.IsDisabled flag
          };
        }
        return user;
      });
      
      // If admin, return all users
      // If regular user, only return own info
      if (req.session?.isAdmin) {
        return res.status(200).json(usersWithExpiry);
      } else {
        // Only return the current user's data
        const jellyfinUserId = req.session?.jellyfinUserId;
        const currentUserData = usersWithExpiry.find(user => user.Id === jellyfinUserId);
        
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

      const user: any = await response.json();
      
      // The user data retrieved from /Users/{userId} already includes complete policy data
      // We don't need to fetch the policy separately
      try {
        // Check for disabled state and log
        if (user?.Policy?.IsDisabled) {
          console.log(`User ${user.Name} is disabled via Policy.IsDisabled`);
        }
      } catch (error) {
        console.error(`Error checking disabled status for user ${user.Name}:`, error);
      }
      
      // Validate the response with zod
      const parsedUser = userSchema.parse(user);
      
      // Get expiry information from our database
      try {
        const appUsers = await storage.getAllUsers();
        const appUser = appUsers.find(u => u.jellyfinUserId === id);
        
        if (appUser) {
          // If Jellyfin shows the user as not disabled but our DB says disabled,
          // update our DB to match Jellyfin's state
          if (parsedUser.Policy?.IsDisabled === false && appUser.disabled) {
            console.log(`Fixing mismatch: Jellyfin shows ${parsedUser.Name} as enabled but local DB has disabled=true`);
            storage.updateUser(appUser.id, { disabled: false })
              .catch(err => console.error(`Failed to update disabled state for ${parsedUser.Name}:`, err));
          }
          
          return res.status(200).json({
            ...parsedUser,
            expiresAt: appUser.expiresAt ? appUser.expiresAt.toISOString() : null
            // Don't add our DB disabled state, rely on Policy.IsDisabled
          });
        }
      } catch (err) {
        console.error("Error getting local user data:", err);
        // Continue even if we can't get expiry info
      }
      
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
        // First, get the complete user data which includes the current policy
        const userResponse = await fetch(`${apiUrl}/Users/${userId}`, {
          headers: {
            "X-Emby-Token": credentials.accessToken || "",
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          if (userData && userData.Policy) {
            const currentPolicy = userData.Policy;
            
            // Update policy based on role and disabled status
            if (newUser.Role === "Administrator") {
              currentPolicy.IsAdministrator = true;
            } else {
              currentPolicy.IsAdministrator = false;
            }

            if (newUser.IsDisabled !== undefined) {
              currentPolicy.IsDisabled = newUser.IsDisabled;
            }

            // Update policy using the POST endpoint
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
            } else {
              console.log(`Successfully updated policy for new user ${userId}, IsDisabled: ${currentPolicy.IsDisabled}`);
            }
          } else {
            console.error("Unable to retrieve current policy from user data for new user");
          }
        } else {
          console.error(`Failed to get user data for policy update: ${userResponse.statusText}`);
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
        // First check if the username already exists in our database
        const existingUser = await storage.getUserByUsername(newUser.Name);
        if (existingUser) {
          console.log(`Username ${newUser.Name} already exists in database, checking if it matches Jellyfin ID`);
          
          // If the user exists but with a different Jellyfin ID, we need to update it
          if (existingUser.jellyfinUserId !== userId) {
            console.log(`Updating existing user's Jellyfin ID from ${existingUser.jellyfinUserId} to ${userId}`);
            await storage.updateUser(existingUser.id, { jellyfinUserId: userId });
            
            // Log the ID update
            await storage.createActivityLog({
              type: 'account_updated',
              message: `User Jellyfin ID updated: ${newUser.Name}`,
              username: newUser.Name,
              userId: String(existingUser.id),
              createdBy: req.session.userId ? (await storage.getUserById(req.session.userId))?.username || 'Admin' : 'Admin',
              metadata: JSON.stringify({
                oldJellyfinId: existingUser.jellyfinUserId,
                newJellyfinId: userId
              })
            });
          }
        } else {
          // Create new user in our database
          const isAdmin = newUser.Role === "Administrator";
          
          // Generate a unique email if one isn't provided
          let userEmail = newUser.Email;
          if (!userEmail || userEmail.trim() === '') {
            userEmail = `${newUser.Name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@jellyfin.local`;
            console.log(`Generated unique email for new user: ${userEmail}`);
          }
          
          // The provided password will be properly hashed by the storage.createUser method
          const appUser = await storage.createUser({
            username: newUser.Name,
            password: newUser.Password || "changeme" + Math.random().toString(36).substring(2, 10), // Unique password if none provided
            email: userEmail,
            isAdmin: isAdmin,
            jellyfinUserId: userId
          });
          
          // Log the account creation in activity logs
          await storage.createActivityLog({
            type: 'account_created',
            message: `Account created: ${newUser.Name}`,
            username: newUser.Name,
            userId: String(appUser.id),
            createdBy: req.session.userId ? (await storage.getUserById(req.session.userId))?.username || 'Admin' : 'Admin',
            metadata: JSON.stringify({
              isAdmin: isAdmin,
              jellyfinUserId: userId,
              createdVia: 'admin_panel'
            })
          });
          
          console.log(`Created local user for ${newUser.Name} with Jellyfin ID ${userId}`);
        }
      } catch (err) {
        console.error("Error creating or updating local user:", err);
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
        // First, get the complete user data which includes the current policy
        const userResponse = await fetch(`${apiUrl}/Users/${id}`, {
          headers: {
            "X-Emby-Token": credentials.accessToken || "",
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          if (userData && userData.Policy) {
            const currentPolicy = userData.Policy;
            
            // Update policy based on role and disabled status
            if (updateData.Role === "Administrator") {
              currentPolicy.IsAdministrator = true;
            } else if (updateData.Role) {
              currentPolicy.IsAdministrator = false;
            }

            if (updateData.IsDisabled !== undefined) {
              currentPolicy.IsDisabled = updateData.IsDisabled;
            }

            // Update policy using the POST endpoint
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
            } else {
              console.log(`Successfully updated policy for user ${id}, IsDisabled: ${currentPolicy.IsDisabled}`);
            }
          } else {
            console.error("Unable to retrieve current policy from user data");
          }
        } else {
          console.error(`Failed to get user data for policy update: ${userResponse.statusText}`);
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
      
      // The user data retrieved from /Users/{userId} already includes complete policy data
      try {
        const updatedUserTyped = updatedUser as any;
        
        // Check for disabled state and log
        if (updatedUserTyped?.Policy?.IsDisabled) {
          console.log(`Updated user ${updatedUserTyped.Name} is disabled via Policy.IsDisabled`);
        }
      } catch (error) {
        console.error(`Error checking disabled status for updated user:`, error);
      }
      
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
          
          // Sync the disabled state between Jellyfin and local DB
          if (updateData.IsDisabled !== undefined) {
            updates.disabled = updateData.IsDisabled;
            console.log(`Updating disabled state for local user ${localUser.username} to: ${updateData.IsDisabled}`);
            
            // If the user is being enabled, reset their expiry date to null (permanent)
            if (updateData.IsDisabled === false) {
              updates.expiresAt = null;
              console.log(`User ${localUser.username} enabled, resetting expiry to permanent`);
            }
          }
          
          if (Object.keys(updates).length > 0) {
            await storage.updateUser(localUser.id, updates);
            
            // Log the user update in activity logs
            // Use specific activity type for disabling/enabling users
            const activityType = updateData.IsDisabled === true 
              ? 'user_disabled' 
              : updateData.IsDisabled === false 
                ? 'user_enabled' 
                : 'user_updated';

            const activityMessage = updateData.IsDisabled === true 
              ? `User disabled: ${localUser.username}` 
              : updateData.IsDisabled === false 
                ? `User enabled: ${localUser.username}` 
                : `User updated: ${localUser.username}`;

            await storage.createActivityLog({
              type: activityType,
              message: activityMessage,
              username: localUser.username,
              userId: localUser.id,
              createdBy: req.session.userId ? (await storage.getUserById(req.session.userId))?.username || 'Admin' : 'Admin',
              metadata: JSON.stringify({
                updates: Object.keys(updates),
                jellyfinUserId: id,
                expiryReset: updateData.IsDisabled === false ? true : undefined,
                roleChanged: updateData.Role ? true : undefined
              })
            });
            
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
          // Save user info before deletion for logging
          const username = localUser.username;
          const userId = localUser.id;
          
          // Delete the user
          await storage.deleteUser(localUser.id);
          
          // Log the user deletion
          await storage.createActivityLog({
            type: 'user_deleted',
            message: `User deleted: ${username}`,
            username: username,
            createdBy: req.session.userId ? (await storage.getUserById(req.session.userId))?.username || 'Admin' : 'Admin',
            metadata: JSON.stringify({
              jellyfinUserId: id,
              deletedBy: req.session.userId ? 'admin' : 'system',
              wasAdmin: localUser.isAdmin
            })
          });
          
          console.log(`Deleted local user ${username} with Jellyfin ID ${id}`);
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
  
  // Get user watch time
  app.get("/api/users/:id/watch-time", async (req: Request, res: Response) => {
    try {
      // Check if connected to Jellyfin
      if (!req.session.connected) {
        return res.status(401).json({ message: "Not connected to Jellyfin" });
      }

      const { id } = req.params;
      console.log(`Watch time: Calculating for user ${id}`);
      
      // Get credentials
      const credentials = await storage.getJellyfinCredentials();
      if (!credentials || !credentials.accessToken) {
        return res.status(401).json({ message: "No Jellyfin credentials available" });
      }
      
      // Prepare API URL
      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      // First get all played items to calculate total watch time
      // Using higher limit to get a more accurate calculation
      const playedItemsUrl = `${apiUrl}/Users/${id}/Items?IncludeItemTypes=Movie,Episode&Recursive=true&Filters=IsPlayed&fields=MediaSources,RunTimeTicks&limit=50`;
      
      const response = await fetch(playedItemsUrl, {
        headers: {
          "X-Emby-Token": credentials.accessToken,
        },
      });
      
      if (!response.ok) {
        console.error("Watch time: Jellyfin API returned an error:", response.status, response.statusText);
        return res.status(response.status).json({ message: "Failed to fetch watch time from Jellyfin" });
      }
      
      const data = await response.json() as {
        Items?: Array<{
          Id?: string;
          Name?: string;
          Type?: string;
          RunTimeTicks?: number;
        }>;
        TotalRecordCount?: number;
      };
      
      // Calculate total minutes from RunTimeTicks of all items
      let totalMinutes = 0;
      
      if (data.Items && Array.isArray(data.Items)) {
        data.Items.forEach((item) => {
          if (item.RunTimeTicks) {
            // RunTimeTicks is in 100-nanosecond intervals, convert to minutes
            // 1 minute = 60 seconds = 60 * 10^7 ticks
            const minutes = item.RunTimeTicks / (600000000);
            totalMinutes += minutes;
          }
        });
      }
      
      console.log(`Watch time: Calculated ${Math.round(totalMinutes)} minutes for user ${id}`);
      
      return res.status(200).json({
        totalMinutes: Math.round(totalMinutes),
        itemCount: data.Items?.length || 0
      });
    } catch (error) {
      console.error("Error calculating watch time:", error);
      return res.status(500).json({ message: "Failed to calculate watch time", totalMinutes: 0 });
    }
  });
  
  // Get user image
  app.get("/api/users/:id/image", async (req: Request, res: Response) => {
    try {
      // Get credentials
      const credentials = await storage.getJellyfinCredentials();
      if (!credentials || !credentials.url) {
        return res.status(404).send({ error: "No valid Jellyfin server URL found" });
      }

      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      // Forward request to Jellyfin
      const imageUrl = `${apiUrl}/Users/${req.params.id}/Images/Primary`;
      console.log("Fetching user image from:", imageUrl);
      
      const response = await fetch(imageUrl, { 
        headers: { 
          "X-Emby-Token": credentials.accessToken || "",
          "Accept": "image/webp,image/jpeg,image/png,*/*"
        }
      });

      if (!response.ok) {
        // Don't log 404 errors for user images, as they're expected when users don't have avatars
        if (response.status !== 404) {
          console.error(`Failed to fetch user image: ${response.status} ${response.statusText}`);
        }
        
        // Return a SVG fallback avatar with the first letter of the username
        const firstLetter = req.params.id.charAt(0).toUpperCase();
        const colors = ['#4F46E5', '#22C55E', '#EF4444', '#F59E0B', '#6366F1', '#06B6D4'];
        const colorIndex = req.params.id.charCodeAt(0) % colors.length;
        const bgColor = colors[colorIndex];
        
        res.set('Content-Type', 'image/svg+xml');
        return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
          <rect width="80" height="80" fill="${bgColor}" rx="40" />
          <text x="40" y="46" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">${firstLetter}</text>
        </svg>`);
      }

      // Copy content type
      res.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
      
      // Stream the image response
      if (response.body) {
        response.body.pipe(res);
      } else {
        res.status(500).send({ error: "Failed to fetch user image - empty response" });
      }
    } catch (error) {
      console.error("Error fetching user image:", error);
      res.status(500).send({ error: "Failed to fetch user image" });
    }
  });
  
  // Get media item image
  app.get("/api/users/:userId/item-image/:itemId", async (req: Request, res: Response) => {
    try {
      // Get credentials
      const credentials = await storage.getJellyfinCredentials();
      if (!credentials || !credentials.url) {
        return res.status(404).send({ error: "No valid Jellyfin server URL found" });
      }
      
      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      const { itemId } = req.params;
      
      // Construct the URL for the primary image
      const imageUrl = `${apiUrl}/Items/${itemId}/Images/Primary`;
      console.log("Fetching item image from:", imageUrl);
      
      // Forward request to Jellyfin
      const response = await fetch(imageUrl, { 
        headers: { 
          "X-Emby-Token": credentials.accessToken || "",
          "Accept": "image/webp,image/jpeg,image/png,*/*"
        }
      });

      if (!response.ok) {
        // Don't log 404 errors for item images, as they're expected
        if (response.status !== 404) {
          console.error(`Failed to fetch image for item ${itemId}:`, response.status, response.statusText);
        }
        
        // Return a generic media placeholder SVG
        res.set('Content-Type', 'image/svg+xml');
        res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" viewBox="0 0 100 150">
          <rect width="100" height="150" fill="#1F2937" rx="8" />
          <rect x="20" y="20" width="60" height="60" fill="#4B5563" rx="4" />
          <rect x="20" y="90" width="60" height="10" fill="#4B5563" rx="2" />
          <rect x="20" y="110" width="40" height="10" fill="#4B5563" rx="2" />
          <circle cx="40" cy="50" r="15" fill="#6B7280" />
          <rect x="30" y="70" width="40" height="5" fill="#6B7280" rx="2" />
        </svg>`);
      }

      // Set cache headers to improve performance
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Copy content type
      res.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
      
      // Stream the image response
      if (response.body) {
        response.body.pipe(res);
      } else {
        res.status(500).send({ error: "Failed to fetch item image - empty response" });
      }
    } catch (error) {
      console.error("Error fetching item image:", error);
      res.status(500).send({ error: "Failed to fetch item image" });
    }
  });
  
  // Get activity logs
  app.get("/api/activity", async (req: Request, res: Response) => {
    try {
      if (!req.session.connected) {
        return res.status(401).json({ message: "Not connected to Jellyfin" });
      }
      
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Admin privileges required" });
      }
      
      // Get logs from the database
      const logs = await storage.getActivityLogs();
      
      // Format logs for frontend compatibility
      const activities = logs.map(log => ({
        id: log.id.toString(),
        type: log.type,
        message: log.message,
        timestamp: log.timestamp.toLocaleString(),
        username: log.username || undefined,
        userId: log.userId || undefined,
        inviteCode: log.inviteCode || undefined,
        createdBy: log.createdBy || undefined,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined
      }));
      
      // If no logs exist yet, create some sample ones
      if (activities.length === 0) {
        // Create welcome activity log
        await storage.createActivityLog({
          type: 'system',
          message: 'Activity logging system initialized',
          createdBy: 'System'
        });
        
        // Try again
        const newLogs = await storage.getActivityLogs();
        const newActivities = newLogs.map(log => ({
          id: log.id.toString(),
          type: log.type,
          message: log.message,
          timestamp: log.timestamp.toLocaleString(),
          username: log.username || undefined,
          userId: log.userId || undefined,
          inviteCode: log.inviteCode || undefined,
          createdBy: log.createdBy || undefined,
          metadata: log.metadata ? JSON.parse(log.metadata) : undefined
        }));
        
        return res.json(newActivities);
      }
      
      res.json(activities);
    } catch (error) {
      console.error("Error getting activity logs:", error);
      res.status(500).json({ message: "Error getting activity logs" });
    }
  });

  // User Profiles API Endpoints
  // Get all user profiles
  app.get("/api/user-profiles", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const profiles = await storage.getAllUserProfiles();
      
      // Add library count to each profile
      const profilesWithLibraryCounts = profiles.map(profile => {
        let libraryCount = 0;
        try {
          const libraryAccess = JSON.parse(profile.libraryAccess || "[]");
          console.log(`Profile ${profile.id}: ${profile.name}, library access:`, libraryAccess);
          libraryCount = Array.isArray(libraryAccess) ? libraryAccess.length : 0;
          console.log(`Calculated library count: ${libraryCount}`);
        } catch (e) {
          console.error("Error parsing library access:", e);
        }
        
        return {
          ...profile,
          libraryCount
        };
      });
      
      console.log("Profiles with library counts:", JSON.stringify(profilesWithLibraryCounts));
      res.json(profilesWithLibraryCounts);
    } catch (error) {
      console.error("Error fetching user profiles:", error);
      res.status(500).json({ message: "Error fetching user profiles" });
    }
  });

  // Get the default user profile
  app.get("/api/user-profiles/default", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const defaultProfile = await storage.getDefaultUserProfile();
      
      if (!defaultProfile) {
        return res.status(404).json({ message: "No default user profile found" });
      }
      
      // Parse library access
      let libraryCount = 0;
      try {
        const libraryAccess = JSON.parse(defaultProfile.libraryAccess || "[]");
        libraryCount = Array.isArray(libraryAccess) ? libraryAccess.length : 0;
      } catch (e) {
        console.error("Error parsing library access:", e);
      }
      
      res.json({
        ...defaultProfile,
        libraryCount
      });
    } catch (error) {
      console.error("Error fetching default user profile:", error);
      res.status(500).json({ message: "Error fetching default user profile" });
    }
  });

  // Get a specific user profile by ID
  app.get("/api/user-profiles/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const profileId = parseInt(req.params.id, 10);
      if (isNaN(profileId)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }
      
      const profile = await storage.getUserProfileById(profileId);
      if (!profile) {
        return res.status(404).json({ message: "User profile not found" });
      }
      
      // Parse library access
      let libraryCount = 0;
      try {
        const libraryAccess = JSON.parse(profile.libraryAccess || "[]");
        libraryCount = Array.isArray(libraryAccess) ? libraryAccess.length : 0;
      } catch (e) {
        console.error("Error parsing library access:", e);
      }
      
      res.json({
        ...profile,
        libraryCount
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Error fetching user profile" });
    }
  });

  // Create a new user profile
  app.post("/api/user-profiles", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      // Validate request body using zod schema
      const validatedData = insertUserProfileSchema.parse(req.body);
      
      // Get Jellyfin credentials
      const credentials = await storage.getJellyfinCredentials();
      if (!credentials || !credentials.accessToken) {
        return res.status(401).json({ message: "Not connected to Jellyfin" });
      }
      
      // Get the source user from Jellyfin to verify it exists and get their name and permissions
      const sourceUserId = validatedData.sourceUserId;
      const apiUrl = credentials.url;
      
      // Fetch the source user's basic information
      const sourceUserResponse = await fetch(`${apiUrl}/Users/${sourceUserId}`, {
        headers: {
          "X-Emby-Token": credentials.accessToken
        }
      });
      
      if (!sourceUserResponse.ok) {
        return res.status(400).json({ message: "Source user not found in Jellyfin" });
      }
      
      const sourceUser = await sourceUserResponse.json() as { 
        Name: string, 
        Id: string,
        Policy?: {
          EnableAllFolders?: boolean,
          EnabledFolders?: string[]
        }
      };
      
      console.log(`Creating profile based on source user: ${sourceUser.Name} (${sourceUserId})`);
      console.log(`Debug - User Policy structure:`, JSON.stringify(sourceUser.Policy));
      
      // Fetch the user's display preferences which contains the home layout
      const displayPrefsResponse = await fetch(`${apiUrl}/DisplayPreferences/usersettings?userId=${sourceUserId}&client=emby`, {
        headers: {
          "X-Emby-Token": credentials.accessToken
        }
      });
      
      // Extract library access and home layout from API responses
      let libraryAccess = "[]";
      let homeLayout = "[]";
      
      // Check if we already have the policy in the user object, otherwise fetch it
      if (sourceUser.Policy) {
        console.log("Using policy from source user object");
        // Handle library access based on policy
        if (sourceUser.Policy.EnableAllFolders === false && Array.isArray(sourceUser.Policy.EnabledFolders)) {
          // User has restricted access - use the explicitly enabled folders
          libraryAccess = JSON.stringify(sourceUser.Policy.EnabledFolders);
          console.log(`User has specific folder permissions: ${libraryAccess}`);
        } else if (sourceUser.Policy.EnableAllFolders === true) {
          // User has access to all libraries - fetch the list of all library IDs
          try {
            console.log("Fetching all media folders for user with EnableAllFolders=true");
            const mediaFoldersResponse = await fetch(`${apiUrl}/Library/MediaFolders`, {
              headers: {
                "X-Emby-Token": credentials.accessToken
              }
            });
            
            if (mediaFoldersResponse.ok) {
              const mediaFolders = await mediaFoldersResponse.json();
              console.log("Media folders response:", JSON.stringify(mediaFolders));
              
              if (mediaFolders && mediaFolders.Items && Array.isArray(mediaFolders.Items)) {
                const folderIds = mediaFolders.Items.map((folder: any) => folder.Id);
                console.log(`Found ${folderIds.length} media folders:`, folderIds);
                libraryAccess = JSON.stringify(folderIds);
              } else {
                console.error("Media folders response did not contain expected Items array:", mediaFolders);
              }
            } else {
              console.error("Failed to fetch media folders:", mediaFoldersResponse.status, await mediaFoldersResponse.text());
            }
          } catch (error) {
            console.error("Error fetching media folders:", error);
          }
        }
      }
      
      if (displayPrefsResponse.ok) {
        const displayPrefs = await displayPrefsResponse.json() as {
          CustomPrefs?: {
            homeLayout?: string;
          };
        };
        
        // Extract home layout configuration if available
        if (displayPrefs.CustomPrefs && displayPrefs.CustomPrefs.homeLayout) {
          try {
            // Store the home layout configuration
            homeLayout = displayPrefs.CustomPrefs.homeLayout;
          } catch (e) {
            console.error("Error parsing home layout:", e);
          }
        }
      }
      
      // Create the profile with the source user's settings
      const newProfile = await storage.createUserProfile({
        ...validatedData,
        sourceName: sourceUser.Name,
        libraryAccess,
        homeLayout
      });
      
      res.status(201).json(newProfile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      console.error("Error creating user profile:", error);
      res.status(500).json({ message: "Error creating user profile" });
    }
  });

  // Update an existing user profile
  app.patch("/api/user-profiles/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const profileId = parseInt(req.params.id, 10);
      if (isNaN(profileId)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }
      
      // Check if profile exists
      const existingProfile = await storage.getUserProfileById(profileId);
      if (!existingProfile) {
        return res.status(404).json({ message: "User profile not found" });
      }
      
      // Validate request body (partial schema for update)
      const partialSchema = insertUserProfileSchema.partial();
      const validatedData = partialSchema.parse(req.body);
      
      // If updating source user, verify it exists
      if (validatedData.sourceUserId) {
        // Get Jellyfin credentials
        const credentials = await storage.getJellyfinCredentials();
        if (!credentials || !credentials.accessToken) {
          return res.status(401).json({ message: "Not connected to Jellyfin" });
        }
        
        // Get the source user from Jellyfin
        const sourceUserId = validatedData.sourceUserId;
        const apiUrl = credentials.url;
        
        // Fetch the source user's basic information
        const sourceUserResponse = await fetch(`${apiUrl}/Users/${sourceUserId}`, {
          headers: {
            "X-Emby-Token": credentials.accessToken
          }
        });
        
        if (!sourceUserResponse.ok) {
          return res.status(400).json({ message: "Source user not found in Jellyfin" });
        }
        
        const sourceUser = await sourceUserResponse.json() as { 
          Name: string,
          Id: string,
          Policy?: {
            EnableAllFolders?: boolean,
            EnabledFolders?: string[]
          }
        };
        
        // Update the name in the validated data
        validatedData.sourceName = sourceUser.Name;
        console.log(`Updating profile based on source user: ${sourceUser.Name} (${sourceUserId})`);
        console.log(`Source user policy:`, sourceUser.Policy);
        
        // Fetch the user's display preferences which contains the home layout
        const displayPrefsResponse = await fetch(`${apiUrl}/DisplayPreferences/usersettings?userId=${sourceUserId}&client=emby`, {
          headers: {
            "X-Emby-Token": credentials.accessToken
          }
        });
        
        // Check if we already have the policy in the user object, otherwise fetch it
        if (sourceUser.Policy) {
          console.log("Using policy from source user object for update");
          // Handle library access based on policy
          if (sourceUser.Policy.EnableAllFolders === false && Array.isArray(sourceUser.Policy.EnabledFolders)) {
            // User has restricted access - use the explicitly enabled folders
            validatedData.libraryAccess = JSON.stringify(sourceUser.Policy.EnabledFolders);
            console.log(`User has specific folder permissions: ${validatedData.libraryAccess}`);
          } else if (sourceUser.Policy.EnableAllFolders === true) {
            // User has access to all libraries - fetch the list of all library IDs
            try {
              console.log("Fetching all media folders for user with EnableAllFolders=true");
              const mediaFoldersResponse = await fetch(`${apiUrl}/Library/MediaFolders`, {
                headers: {
                  "X-Emby-Token": credentials.accessToken
                }
              });
              
              if (mediaFoldersResponse.ok) {
                const mediaFolders = await mediaFoldersResponse.json();
                console.log("Media folders response:", JSON.stringify(mediaFolders));
                
                if (mediaFolders && mediaFolders.Items && Array.isArray(mediaFolders.Items)) {
                  const folderIds = mediaFolders.Items.map((folder: any) => folder.Id);
                  console.log(`Found ${folderIds.length} media folders:`, folderIds);
                  validatedData.libraryAccess = JSON.stringify(folderIds);
                } else {
                  console.error("Media folders response did not contain expected Items array:", mediaFolders);
                }
              } else {
                console.error("Failed to fetch media folders:", mediaFoldersResponse.status, await mediaFoldersResponse.text());
              }
            } catch (error) {
              console.error("Error fetching media folders:", error);
            }
          }
        }
        
        if (displayPrefsResponse.ok) {
          const displayPrefs = await displayPrefsResponse.json() as {
            CustomPrefs?: {
              homeLayout?: string;
            };
          };
          
          // Extract home layout configuration if available
          if (displayPrefs.CustomPrefs && displayPrefs.CustomPrefs.homeLayout) {
            try {
              // Store the home layout configuration
              validatedData.homeLayout = displayPrefs.CustomPrefs.homeLayout;
            } catch (e) {
              console.error("Error parsing home layout:", e);
            }
          }
        }
      }
      
      // Update the profile
      const updatedProfile = await storage.updateUserProfile(profileId, validatedData);
      
      res.json(updatedProfile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Error updating user profile" });
    }
  });

  // Delete a user profile
  app.delete("/api/user-profiles/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const profileId = parseInt(req.params.id, 10);
      if (isNaN(profileId)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }
      
      // Check if profile exists
      const existingProfile = await storage.getUserProfileById(profileId);
      if (!existingProfile) {
        return res.status(404).json({ message: "User profile not found" });
      }
      
      // Delete the profile
      const success = await storage.deleteUserProfile(profileId);
      
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: "Failed to delete user profile" });
      }
    } catch (error) {
      console.error("Error deleting user profile:", error);
      res.status(500).json({ message: "Error deleting user profile" });
    }
  });

  // Invite Routes
  app.get("/api/invites", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const invites = await storage.getAllInvites();
      res.status(200).json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/invites/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      const invite = await storage.getInviteById(id);
      if (invite) {
        res.status(200).json(invite);
      } else {
        res.status(404).json({ error: "Invite not found" });
      }
    } catch (error) {
      console.error("Error fetching invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/invites", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      // Make sure user is authenticated and we have their ID
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const inviteData = req.body;
      const invite = await storage.createInvite(inviteData, req.session.userId);
      
      // Get the creator's username for logging
      const creator = await storage.getUserById(req.session.userId);
      
      // Log invite creation
      await storage.createActivityLog({
        type: 'invite_created',
        message: `Invite created: ${invite.code}`,
        inviteCode: invite.code,
        createdBy: creator?.username || 'Admin',
        metadata: JSON.stringify({
          label: invite.label,
          maxUses: invite.maxUses,
          expiresAt: invite.expiresAt,
          userExpiryEnabled: invite.userExpiryEnabled,
          userExpiryDays: invite.userExpiryDays,
          userExpiryMonths: invite.userExpiryMonths,
          userExpiryHours: invite.userExpiryHours
        })
      });
      
      res.status(201).json(invite);
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/invites/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      const inviteData = req.body;
      const invite = await storage.updateInvite(id, inviteData);
      if (invite) {
        res.status(200).json(invite);
      } else {
        res.status(404).json({ error: "Invite not found" });
      }
    } catch (error) {
      console.error("Error updating invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/invites/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      const result = await storage.deleteInvite(id);
      if (result) {
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({ error: "Invite not found or could not be deleted" });
      }
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public API for using invites (doesn't require authentication)
  app.get("/api/invites/by-code/:code", async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      const invite = await storage.getInviteByCode(code);
      if (invite) {
        // Return information needed for sign-up
        res.status(200).json({
          code: invite.code,
          label: invite.label,
          userLabel: invite.userLabel,
          profileId: invite.profileId,
          maxUses: invite.maxUses,
          usedCount: invite.usedCount,
          expiresAt: invite.expiresAt,
          userExpiryEnabled: invite.userExpiryEnabled,
          userExpiryHours: invite.userExpiryHours,
          userExpiryMonths: invite.userExpiryMonths,
          userExpiryDays: invite.userExpiryDays,
          // Calculate usesRemaining for UI display
          usesRemaining: invite.maxUses === null ? null : (invite.maxUses - (invite.usedCount || 0))
        });
      } else {
        res.status(404).json({ error: "Invite not found or expired" });
      }
    } catch (error) {
      console.error("Error fetching invite by code:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/invites/use/:code", async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      const { username, password, email } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      // Check if username already exists in our database
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log(`Username ${username} already exists in our database`);
        return res.status(400).json({ error: "Username already exists. Please choose a different username." });
      }
      
      // First, check if the invite exists and is valid
      const invite = await storage.getInviteByCode(code);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      
      // Check if invite is expired
      if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({ error: "Invite has expired" });
      }
      
      // Check if max uses has been reached (if not unlimited)
      if (invite.maxUses !== null && invite.usedCount !== null && invite.usedCount >= invite.maxUses) {
        return res.status(400).json({ error: "Invite has reached maximum number of uses" });
      }
      
      // Calculate the expiry date for the user account if enabled
      let expiresAt = null;
      if (invite.userExpiryEnabled) {
        const expiryDate = new Date();
        
        // Add months if defined
        if (invite.userExpiryMonths) {
          expiryDate.setMonth(expiryDate.getMonth() + invite.userExpiryMonths);
        }
        
        // Add days if defined
        if (invite.userExpiryDays) {
          expiryDate.setDate(expiryDate.getDate() + invite.userExpiryDays);
        }
        
        // Add hours if defined
        if (invite.userExpiryHours) {
          expiryDate.setHours(expiryDate.getHours() + invite.userExpiryHours);
        }
        
        expiresAt = expiryDate;
      }
      
      // Get Jellyfin credentials to create user on Jellyfin server
      const credentials = await storage.getJellyfinCredentials();
      if (!credentials) {
        return res.status(500).json({ error: "Server configuration not found" });
      }
      
      // Create the user in Jellyfin
      const apiUrl = credentials.url;
      const apiKey = credentials.apiKey;
      
      // Only send username and password to Jellyfin API - no email required
      const jellyfinUserData = {
        Name: username,
        Password: password
      };
      
      try {
        console.log(`Creating new Jellyfin user: ${username} via invite code: ${code}`);
        const jellyfinResponse = await fetch(`${apiUrl}/Users/New`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Emby-Token': credentials.accessToken || '',
            'X-Emby-Authorization': `MediaBrowser Client="UserManager", Device="Server", DeviceId="Server", Version="1.0.0", Token="${apiKey}"`
          },
          body: JSON.stringify(jellyfinUserData)
        });
        
        if (!jellyfinResponse.ok) {
          const errorText = await jellyfinResponse.text();
          console.error("Jellyfin API error:", errorText);
          return res.status(jellyfinResponse.status).json({ error: `Could not create Jellyfin user: ${errorText}` });
        }
        
        const jellyfinUser = await jellyfinResponse.json() as { Id: string };
        console.log(`Successfully created Jellyfin user with ID: ${jellyfinUser.Id}`);
        
        // Create local app user with expiry if needed
        // Generate a unique email if one isn't provided
        let userEmail = email;
        if (!userEmail || userEmail.trim() === '') {
          // Create a unique email to avoid constraint issues
          userEmail = `${username.toLowerCase()}_${Date.now()}@example.com`;
          console.log(`Generated unique email for user: ${userEmail}`);
        }
        
        const appUser = await storage.createUser({
          username,
          password, // Will be hashed by storage implementation
          email: userEmail,
          jellyfinUserId: jellyfinUser.Id,
          expiresAt
        });
        
        // Step 1: First disable access to all libraries for the new user
        // Get the current policy for the newly created user
        console.log(`Getting current policy for new user: ${jellyfinUser.Id}`);
        const userResponse = await fetch(`${apiUrl}/Users/${jellyfinUser.Id}`, {
          headers: {
            "X-Emby-Token": credentials.accessToken || "",
          },
        });
        
        if (userResponse.ok) {
          // Define type for Jellyfin user response
          interface JellyfinUserData {
            Id: string;
            Name: string;
            Policy?: {
              IsAdministrator?: boolean;
              IsDisabled?: boolean;
              EnableAllFolders?: boolean;
              EnabledFolders?: string[];
              [key: string]: any;
            };
            [key: string]: any;
          }
          
          const userData = await userResponse.json() as JellyfinUserData;
          
          if (userData && userData.Policy) {
            console.log(`Retrieved current policy for new user ${username}`);
            const currentPolicy = userData.Policy;
            
            // Disable access to all libraries
            currentPolicy.EnableAllFolders = false;
            currentPolicy.EnabledFolders = []; // Empty array to disable all access
            
            console.log(`Updating policy for new user ${username} to disable all library access`);
            const updatePolicyResponse = await fetch(`${apiUrl}/Users/${jellyfinUser.Id}/Policy`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Emby-Token": credentials.accessToken || "",
              },
              body: JSON.stringify(currentPolicy),
            });

            if (!updatePolicyResponse.ok) {
              console.error(`Failed to update library access policy: ${updatePolicyResponse.statusText}`);
            } else {
              console.log(`Successfully disabled all library access for new user ${username}`);
              
              // Step 2: Check if this invite has an associated profile to copy library access from
              if (invite.profileId) {
                console.log(`Invite has associated profile ID: ${invite.profileId}, applying library access settings`);
                
                try {
                  // Get the user profile
                  const profileId = parseInt(invite.profileId, 10);
                  if (!isNaN(profileId)) {
                    const profile = await storage.getUserProfileById(profileId);
                    
                    if (profile && profile.libraryAccess) {
                      console.log(`Found profile ${profile.name} with library access settings`);
                      
                      // Parse the library access from the profile
                      try {
                        const libraryAccess = JSON.parse(profile.libraryAccess);
                        
                        if (Array.isArray(libraryAccess) && libraryAccess.length > 0) {
                          console.log(`Setting library access for user ${username} based on profile ${profile.name}`);
                          
                          // Apply the library access to the user's policy
                          currentPolicy.EnabledFolders = libraryAccess;
                          
                          const updateLibraryResponse = await fetch(`${apiUrl}/Users/${jellyfinUser.Id}/Policy`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "X-Emby-Token": credentials.accessToken || "",
                            },
                            body: JSON.stringify(currentPolicy),
                          });
                          
                          if (updateLibraryResponse.ok) {
                            console.log(`Successfully applied library access settings from profile "${profile.name}" with ${libraryAccess.length} libraries`);
                            
                            // Log the library access change
                            await storage.createActivityLog({
                              type: 'library_access_updated',
                              message: `Library access set for ${username} from profile "${profile.name}"`,
                              username: username,
                              userId: String(appUser.id),
                              inviteCode: code,
                              metadata: JSON.stringify({
                                profileId: profile.id,
                                profileName: profile.name,
                                libraryCount: libraryAccess.length
                              })
                            });
                          } else {
                            console.error(`Failed to update library access: ${updateLibraryResponse.statusText}`);
                          }
                        } else {
                          console.log(`Profile ${profile.name} has no library access defined or empty array`);
                        }
                      } catch (parseError) {
                        console.error(`Error parsing library access JSON from profile: ${parseError}`);
                      }
                    } else {
                      console.log(`Profile ID ${profileId} not found or has no library access settings`);
                    }
                  }
                } catch (profileError) {
                  console.error(`Error applying profile library access: ${profileError}`);
                }
              } else {
                console.log(`No profile associated with invite code: ${code}, keeping all libraries disabled`);
              }
            }
          }
        }
        
        // Increment the invite used count
        const usedCount = invite.usedCount !== null ? invite.usedCount + 1 : 1;
        await storage.updateInviteUsage(code, usedCount);
        
        // Log account creation via invite
        await storage.createActivityLog({
          type: 'account_created',
          message: `Account created: ${username} (via invite)`,
          username: username,
          userId: String(appUser.id), // Convert number to string for userId
          inviteCode: code,
          metadata: JSON.stringify({
            expiresAt: expiresAt,
            email: email || null,
            jellyfinUserId: jellyfinUser.Id,
            createdVia: 'invite'
          })
        });
        
        // Log invite usage
        await storage.createActivityLog({
          type: 'invite_used',
          message: `Invite used: ${code}`,
          username: username,
          userId: String(appUser.id), // Convert number to string
          inviteCode: code,
          metadata: JSON.stringify({
            usesLeft: invite.maxUses !== null ? (invite.maxUses - usedCount) : null,
            usesTotal: usedCount,
            maxUses: invite.maxUses
          })
        });
        
        // Return success
        res.status(201).json({ 
          success: true,
          message: "Account created successfully"
        });
      } catch (error) {
        console.error("Error creating Jellyfin user:", error);
        res.status(500).json({ error: "Failed to create Jellyfin user account" });
      }
    } catch (error) {
      console.error("Error using invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // App User API Routes
  // Get app user by Jellyfin user ID
  app.get("/api/app-users/by-jellyfin-id/:jellyfinId", requireAuth, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const user = users.find(u => u.jellyfinUserId === req.params.jellyfinId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error getting app user by Jellyfin ID:", error);
      return res.status(500).json({ message: "Error retrieving user" });
    }
  });
  
  // Update app user
  app.patch("/api/app-users/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Process expiry date
      const userData = { ...req.body };
      
      // If expiresAt is a string, convert it to a Date object
      if (userData.expiresAt && typeof userData.expiresAt === 'string') {
        try {
          userData.expiresAt = new Date(userData.expiresAt);
          console.log(`Setting expiry date for user ${userId} to ${userData.expiresAt.toISOString()}`);
        } catch (error) {
          console.error("Invalid expiry date format:", error);
          return res.status(400).json({ message: "Invalid expiry date format" });
        }
      } else if (userData.expiresAt === null) {
        // Handle case where we want to clear the expiry
        console.log(`Clearing expiry date for user ${userId}`);
      }
      
      const user = await storage.updateUser(userId, userData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error updating app user:", error);
      return res.status(500).json({ message: "Error updating user" });
    }
  });
  
  // Add endpoint to disable a user when their account expires
  app.post("/api/users/:id/disable", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Validate ID is not a date string or other invalid format
      if (!id || id.includes('T') || id.length < 5) {
        return res.status(400).json({ 
          error: "Invalid user ID format", 
          details: "The provided ID appears to be invalid or in date format." 
        });
      }
      
      // Get Jellyfin credentials
      const credentials = await storage.getJellyfinCredentials();
      if (!credentials || !credentials.url || !credentials.accessToken) {
        return res.status(401).json({ error: "Not connected to Jellyfin server" });
      }
      
      const apiUrl = credentials.url;
      
      // Get the complete user data which includes the current policy
      const userResponse = await fetch(`${apiUrl}/Users/${id}`, {
        headers: {
          "X-Emby-Token": credentials.accessToken || "",
        },
      });
      
      if (!userResponse.ok) {
        return res.status(userResponse.status).json({ 
          error: "Failed to fetch user data",
          details: await userResponse.text() 
        });
      }
      
      const userData = await userResponse.json() as any;
      
      // Update the Policy.IsDisabled field
      if (!userData.Policy) {
        userData.Policy = {};
      }
      
      userData.Policy.IsDisabled = true;
      
      // Update the user policy
      const policyUpdateResponse = await fetch(`${apiUrl}/Users/${id}/Policy`, {
        method: "POST",
        headers: {
          "X-Emby-Token": credentials.accessToken || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData.Policy),
      });
      
      if (!policyUpdateResponse.ok) {
        return res.status(policyUpdateResponse.status).json({ 
          error: "Failed to disable user in Jellyfin",
          details: await policyUpdateResponse.text()
        });
      }
      
      // Update the app_user record if it exists
      const users = await storage.getAllUsers();
      const appUser = users.find(u => u.jellyfinUserId === id);
      if (appUser) {
        await storage.updateUser(appUser.id, { disabled: true });
        
        // Log user account disablement
        await storage.createActivityLog({
          type: 'user_disabled',
          message: `User disabled: ${userData.Name}`,
          username: userData.Name,
          userId: String(appUser.id), // Convert number to string
          metadata: JSON.stringify({
            jellyfinUserId: id,
            reason: req.body.reason || 'account_expired',
            autoDisabled: req.body.autoDisabled || true
          })
        });
      }
      
      console.log(`User ${id} disabled successfully - ${userData.Name}`);
      
      return res.status(200).json({ 
        success: true, 
        message: "User disabled successfully",
        userName: userData.Name || id
      });
    } catch (error) {
      console.error("Error disabling user:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
