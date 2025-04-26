import { 
  JellyfinCredentials, 
  InsertJellyfinCredentials, 
  ServerConfig, 
  InsertServerConfig, 
  AppUser, 
  InsertAppUser, 
  Session, 
  InsertSession,
  User,
  UserActivity,
  Invite,
  InsertInvite,
  generateInviteCode
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lt, gt, sql } from "drizzle-orm";
import { serverConfig, jellyfinCredentials, appUsers, sessions, invites } from "@shared/schema";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// Interface for API storage operations
export interface IStorage {
  // Server config
  getServerConfig(): Promise<ServerConfig | undefined>;
  saveServerConfig(config: InsertServerConfig): Promise<ServerConfig>;
  
  // Jellyfin credentials
  getJellyfinCredentials(): Promise<JellyfinCredentials | undefined>;
  saveJellyfinCredentials(credentials: Partial<InsertJellyfinCredentials> & { accessToken?: string, userId?: string }): Promise<JellyfinCredentials>;

  // App users
  getAllUsers(): Promise<AppUser[]>;
  getUserById(id: number): Promise<AppUser | undefined>;
  getUserByUsername(username: string): Promise<AppUser | undefined>;
  createUser(user: Partial<InsertAppUser> & { password: string }): Promise<AppUser>;
  updateUser(id: number, user: Partial<InsertAppUser>): Promise<AppUser | undefined>;
  deleteUser(id: number): Promise<boolean>;
  validatePassword(user: AppUser, password: string): Promise<boolean>;

  // Session management
  createSession(userId: number): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<boolean>;
  getSessionToken(id: string): Promise<string | undefined>;
  saveSessionToken(id: string, token: string): Promise<void>;
  deleteSessionToken(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private sessionTokens: Map<string, string>;

  constructor() {
    this.sessionTokens = new Map();
  }

  // Helper method to convert DB result to ServerConfig with features
  private dbConfigToServerConfig(dbConfig: typeof serverConfig.$inferSelect): ServerConfig {
    // Create default features
    const defaultFeatures = {
      enableThemeSwitcher: true,
      enableWatchHistory: true,
      enableActivityLog: true
    };
    
    // Parse features from JSON if available
    let features = defaultFeatures;
    try {
      if (dbConfig.featuresJson) {
        features = JSON.parse(dbConfig.featuresJson);
      }
    } catch (e) {
      console.error("Error parsing features JSON:", e);
    }
    
    // Return the combined object
    return {
      ...dbConfig,
      features
    };
  }
  
  // Server config
  async getServerConfig(): Promise<ServerConfig | undefined> {
    try {
      const configs = await db.select().from(serverConfig).limit(1);
      if (configs.length === 0) return undefined;
      
      return this.dbConfigToServerConfig(configs[0]);
    } catch (error) {
      console.error("Error fetching server config:", error);
      return undefined;
    }
  }

  async saveServerConfig(config: InsertServerConfig & { 
    features?: {
      enableThemeSwitcher?: boolean;
      enableWatchHistory?: boolean;
      enableActivityLog?: boolean;
    } 
  }): Promise<ServerConfig> {
    try {
      // Extract features and convert to JSON string
      const { features, ...configData } = config;
      const configToSave: InsertServerConfig = {
        ...configData,
        featuresJson: features ? JSON.stringify(features) : "{}"
      };
      
      // Check if a config already exists
      const existing = await this.getServerConfig();
      
      if (existing) {
        // Update existing config
        const [updated] = await db.update(serverConfig)
          .set({ 
            ...configToSave, 
            updatedAt: new Date() 
          })
          .where(eq(serverConfig.id, existing.id))
          .returning();
        
        // Use helper method to convert to ServerConfig
        return this.dbConfigToServerConfig(updated);
      } else {
        // Create new config
        const [newConfig] = await db.insert(serverConfig)
          .values(configToSave)
          .returning();
          
        // Use helper method to convert to ServerConfig
        return this.dbConfigToServerConfig(newConfig);
      }
    } catch (error) {
      console.error("Error saving server config:", error);
      throw error;
    }
  }

  // Jellyfin credentials
  async getJellyfinCredentials(): Promise<JellyfinCredentials | undefined> {
    try {
      const creds = await db.select().from(jellyfinCredentials).limit(1);
      return creds.length > 0 ? creds[0] : undefined;
    } catch (error) {
      console.error("Error fetching Jellyfin credentials:", error);
      return undefined;
    }
  }

  async saveJellyfinCredentials(
    credentials: Partial<InsertJellyfinCredentials> & { accessToken?: string, userId?: string }
  ): Promise<JellyfinCredentials> {
    try {
      // Check if credentials already exist
      const existing = await this.getJellyfinCredentials();
      
      if (existing) {
        // Update existing credentials
        const [updated] = await db.update(jellyfinCredentials)
          .set({ 
            ...credentials, 
            accessToken: credentials.accessToken || null,
            userId: credentials.userId || null,
            updatedAt: new Date() 
          })
          .where(eq(jellyfinCredentials.id, existing.id))
          .returning();
        return updated;
      } else {
        // Create new credentials
        const [newCreds] = await db.insert(jellyfinCredentials)
          .values({
            url: credentials.url!,
            apiKey: credentials.apiKey!,
            adminUsername: credentials.adminUsername!,
            adminPassword: credentials.adminPassword!,
            accessToken: credentials.accessToken || null,
            userId: credentials.userId || null
          })
          .returning();
        return newCreds;
      }
    } catch (error) {
      console.error("Error saving Jellyfin credentials:", error);
      throw error;
    }
  }

  // App users
  async getAllUsers(): Promise<AppUser[]> {
    try {
      return await db.select().from(appUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  }

  async getUserById(id: number): Promise<AppUser | undefined> {
    try {
      const users = await db.select().from(appUsers).where(eq(appUsers.id, id));
      return users.length > 0 ? users[0] : undefined;
    } catch (error) {
      console.error(`Error fetching user with ID ${id}:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<AppUser | undefined> {
    try {
      const users = await db.select().from(appUsers).where(eq(appUsers.username, username));
      return users.length > 0 ? users[0] : undefined;
    } catch (error) {
      console.error(`Error fetching user with username ${username}:`, error);
      return undefined;
    }
  }

  async createUser(user: Partial<InsertAppUser> & { password: string }): Promise<AppUser> {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Insert user with hashed password
      const [newUser] = await db.insert(appUsers)
        .values({
          username: user.username!,
          password: hashedPassword,
          email: user.email!,
          isAdmin: user.isAdmin ?? false,
          jellyfinUserId: user.jellyfinUserId!,
          plexEmail: user.plexEmail || null,
          embyEmail: user.embyEmail || null,
          paypalEmail: user.paypalEmail || null,
          discordUsername: user.discordUsername || null,
          discordId: user.discordId || null,
          notes: user.notes || null
        })
        .returning();
        
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<InsertAppUser>): Promise<AppUser | undefined> {
    try {
      // If password is being updated, hash it
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      // Update the user
      const [updatedUser] = await db.update(appUsers)
        .set({ 
          ...userData,
          updatedAt: new Date() 
        })
        .where(eq(appUsers.id, id))
        .returning();
        
      return updatedUser;
    } catch (error) {
      console.error(`Error updating user with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(appUsers).where(eq(appUsers.id, id));
      return true; // In PostgreSQL, delete doesn't return a count by default
    } catch (error) {
      console.error(`Error deleting user with ID ${id}:`, error);
      return false;
    }
  }

  async validatePassword(user: AppUser, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error("Error validating password:", error);
      return false;
    }
  }

  // Session management
  async createSession(userId: number): Promise<Session> {
    try {
      // Generate a random token
      const token = randomBytes(32).toString('hex');
      
      // Set expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Create session in database
      const [session] = await db.insert(sessions)
        .values({
          userId,
          token,
          expiresAt
        })
        .returning();
        
      return session;
    } catch (error) {
      console.error(`Error creating session for user ${userId}:`, error);
      throw error;
    }
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    try {
      const now = new Date();
      
      // Get session that hasn't expired
      const result = await db.select().from(sessions)
        .where(eq(sessions.token, token));
        
      if (result.length === 0) return undefined;
      
      const session = result[0];
      
      // Check if session has expired
      if (session.expiresAt < now) {
        // Session expired, clean it up
        await this.deleteSession(token);
        return undefined;
      }
      
      return session;
    } catch (error) {
      console.error(`Error fetching session with token ${token}:`, error);
      return undefined;
    }
  }

  async deleteSession(token: string): Promise<boolean> {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
      return true;
    } catch (error) {
      console.error(`Error deleting session with token ${token}:`, error);
      return false;
    }
  }

  // Legacy session methods (keeping for compatibility)
  async getSessionToken(id: string): Promise<string | undefined> {
    return this.sessionTokens.get(id);
  }

  async saveSessionToken(id: string, token: string): Promise<void> {
    this.sessionTokens.set(id, token);
  }

  async deleteSessionToken(id: string): Promise<void> {
    this.sessionTokens.delete(id);
  }
}

export const storage = new DatabaseStorage();
