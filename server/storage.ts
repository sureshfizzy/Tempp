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
  UserProfile,
  InsertUserProfile,
  UserRole,
  InsertUserRole,
  Invite,
  InsertInvite,
  ActivityLog,
  InsertActivityLog
} from "@shared/schema";
import { eq, and, desc, ne } from "drizzle-orm";
import { serverConfig, jellyfinCredentials, appUsers, sessions, userProfiles, invites, activityLogs, userRoles } from "@shared/schema";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { SQLiteStorage } from "./sqlite-storage";

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
  
  // User profiles
  getAllUserProfiles(): Promise<UserProfile[]>;
  getUserProfileById(id: number): Promise<UserProfile | undefined>;
  getDefaultUserProfile(): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(id: number, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  deleteUserProfile(id: number): Promise<boolean>;
  
  // Invites
  getAllInvites(): Promise<Invite[]>;
  getInviteById(id: number): Promise<Invite | undefined>;
  getInviteByCode(code: string): Promise<Invite | undefined>;
  createInvite(invite: Partial<InsertInvite>, createdById: number): Promise<Invite>;
  updateInvite(id: number, invite: Partial<InsertInvite>): Promise<Invite | undefined>;
  deleteInvite(id: number): Promise<boolean>;
  useInvite(code: string): Promise<boolean>;
  updateInviteUsage(code: string, usedCount: number): Promise<boolean>;
  
  // User roles
  getAllRoles(): Promise<UserRole[]>;
  getRoleById(id: number): Promise<UserRole | undefined>;
  getDefaultRole(): Promise<UserRole | undefined>;
  createRole(role: InsertUserRole): Promise<UserRole>;
  updateRole(id: number, role: Partial<InsertUserRole>): Promise<UserRole | undefined>;
  deleteRole(id: number): Promise<boolean>;
  getUserRoleByUserId(userId: number): Promise<UserRole | undefined>;
  
  // Activity logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(logData: InsertActivityLog): Promise<ActivityLog>;
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
          notes: user.notes || null,
          expiresAt: user.expiresAt || null,
          disabled: user.disabled ?? false
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

  // User Profiles methods
  async getAllUserProfiles(): Promise<UserProfile[]> {
    try {
      return await db.select().from(userProfiles);
    } catch (error) {
      console.error("Error fetching user profiles:", error);
      return [];
    }
  }

  async getUserProfileById(id: number): Promise<UserProfile | undefined> {
    try {
      const profiles = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
      return profiles.length > 0 ? profiles[0] : undefined;
    } catch (error) {
      console.error(`Error fetching user profile with ID ${id}:`, error);
      return undefined;
    }
  }

  async getDefaultUserProfile(): Promise<UserProfile | undefined> {
    try {
      const profiles = await db.select().from(userProfiles).where(eq(userProfiles.isDefault, true));
      return profiles.length > 0 ? profiles[0] : undefined;
    } catch (error) {
      console.error("Error fetching default user profile:", error);
      return undefined;
    }
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    try {
      // If this profile is being set as default, unset any other defaults
      if (profile.isDefault) {
        await db.update(userProfiles)
          .set({ isDefault: false })
          .where(eq(userProfiles.isDefault, true));
      }
      
      // Create the new profile
      const [newProfile] = await db.insert(userProfiles)
        .values({
          name: profile.name,
          sourceUserId: profile.sourceUserId,
          sourceName: profile.sourceName,
          isDefault: profile.isDefault ?? false,
          libraryAccess: profile.libraryAccess || "[]",
          homeLayout: profile.homeLayout || "[]"
        })
        .returning();
        
      return newProfile;
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  }

  async updateUserProfile(id: number, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    try {
      // If this profile is being set as default, unset any other defaults
      if (profile.isDefault) {
        await db.update(userProfiles)
          .set({ isDefault: false })
          .where(eq(userProfiles.isDefault, true));
      }
      
      // Update the profile
      const [updatedProfile] = await db.update(userProfiles)
        .set({ 
          ...profile,
          updatedAt: new Date() 
        })
        .where(eq(userProfiles.id, id))
        .returning();
        
      return updatedProfile;
    } catch (error) {
      console.error(`Error updating user profile with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteUserProfile(id: number): Promise<boolean> {
    try {
      await db.delete(userProfiles).where(eq(userProfiles.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting user profile with ID ${id}:`, error);
      return false;
    }
  }

  // Invite methods
  async getAllInvites(): Promise<Invite[]> {
    try {
      // Use explicit column selection to match the actual database structure
      return await db.select({
        id: invites.id,
        code: invites.code,
        label: invites.label,
        userLabel: invites.userLabel,
        profileId: invites.profileId,
        roleId: invites.roleId,
        maxUses: invites.maxUses,
        usedCount: invites.usedCount,
        expiresAt: invites.expiresAt,
        userExpiryEnabled: invites.userExpiryEnabled,
        userExpiryHours: invites.userExpiryHours,
        userExpiryDays: invites.userExpiryDays,
        userExpiryMonths: invites.userExpiryMonths,
        createdAt: invites.createdAt,
        createdBy: invites.createdBy
      })
      .from(invites)
      .orderBy(desc(invites.createdAt));
    } catch (error) {
      console.error("Error fetching invites:", error);
      return [];
    }
  }

  async getInviteById(id: number): Promise<Invite | undefined> {
    try {
      // Use explicit column selection to match the actual database structure
      const result = await db.select({
        id: invites.id,
        code: invites.code,
        label: invites.label,
        userLabel: invites.userLabel,
        profileId: invites.profileId,
        roleId: invites.roleId,
        maxUses: invites.maxUses,
        usedCount: invites.usedCount,
        expiresAt: invites.expiresAt,
        userExpiryEnabled: invites.userExpiryEnabled,
        userExpiryHours: invites.userExpiryHours,
        userExpiryDays: invites.userExpiryDays, 
        userExpiryMonths: invites.userExpiryMonths,
        createdAt: invites.createdAt,
        createdBy: invites.createdBy
      })
      .from(invites)
      .where(eq(invites.id, id));
      
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error fetching invite with ID ${id}:`, error);
      return undefined;
    }
  }

  async getInviteByCode(code: string): Promise<Invite | undefined> {
    try {
      // Use explicit column selection to match the actual database structure
      const result = await db.select({
        id: invites.id,
        code: invites.code,
        label: invites.label,
        userLabel: invites.userLabel,
        profileId: invites.profileId,
        roleId: invites.roleId,
        maxUses: invites.maxUses,
        usedCount: invites.usedCount,
        expiresAt: invites.expiresAt,
        userExpiryEnabled: invites.userExpiryEnabled,
        userExpiryHours: invites.userExpiryHours,
        userExpiryDays: invites.userExpiryDays,
        userExpiryMonths: invites.userExpiryMonths,
        createdAt: invites.createdAt,
        createdBy: invites.createdBy
      })
      .from(invites)
      .where(eq(invites.code, code));
      
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error fetching invite with code ${code}:`, error);
      return undefined;
    }
  }

  async createInvite(inviteData: Partial<InsertInvite>, createdById: number): Promise<Invite> {
    try {
      // Generate a unique invite code
      const code = this.generateInviteCode();
      
      // Calculate expiration date for the invite itself
      let expiresAt: Date | null = null;
      
      // If we have an explicit expiration date, use it
      if (inviteData.expiresAt) {
        expiresAt = new Date(inviteData.expiresAt);
      } else {
        // Otherwise calculate from parts
        expiresAt = new Date();
        
        // Add months if specified
        if (inviteData.userExpiryMonths && inviteData.userExpiryMonths > 0) {
          expiresAt.setMonth(expiresAt.getMonth() + inviteData.userExpiryMonths);
        }
        
        // Add days if specified
        if (inviteData.userExpiryDays && inviteData.userExpiryDays > 0) {
          expiresAt.setDate(expiresAt.getDate() + inviteData.userExpiryDays);
        }
        
        // Add hours if specified
        if (inviteData.userExpiryHours && inviteData.userExpiryHours > 0) {
          expiresAt.setHours(expiresAt.getHours() + inviteData.userExpiryHours);
        }
        
        // Add minutes if specified
        if (inviteData.userExpiryMinutes && inviteData.userExpiryMinutes > 0) {
          expiresAt.setMinutes(expiresAt.getMinutes() + inviteData.userExpiryMinutes);
        }
        
        // If no expiry specified at all, set to 7 days default (instead of 30)
        if ((!inviteData.userExpiryMonths || inviteData.userExpiryMonths <= 0) && 
            (!inviteData.userExpiryDays || inviteData.userExpiryDays <= 0) && 
            (!inviteData.userExpiryHours || inviteData.userExpiryHours <= 0) &&
            (!inviteData.userExpiryMinutes || inviteData.userExpiryMinutes <= 0)) {
          expiresAt.setDate(expiresAt.getDate() + 7);
        }
      }
      
      console.log("Creating invite with expiry:", expiresAt);

      // Handle max uses properly (can be null for unlimited)
      const maxUses = inviteData.maxUses === null ? null : (inviteData.maxUses || 1);
      
      // Generate a unique label if none is provided
      const inviteLabel = inviteData.label || this.generateUniqueInviteLabel();
      
      // Create the invite with only the columns that actually exist in the database
      const values: any = {
        code,
        label: inviteLabel,
        user_label: inviteData.userLabel || null,
        profile_id: inviteData.profileId || null,
        role_id: inviteData.roleId || null,
        max_uses: maxUses,
        used_count: 0, // Start with 0 uses
        expires_at: expiresAt,
        user_expiry_enabled: inviteData.userExpiryEnabled || false,
        user_expiry_hours: inviteData.userExpiryHours || 0,
        user_expiry_days: inviteData.userExpiryDays || 0,
        user_expiry_months: inviteData.userExpiryMonths || 0,
        created_by: createdById.toString() // Convert to string as the DB expects it
      };
      
      // Add the user_expiry_minutes to the values
      values.user_expiry_minutes = inviteData.userExpiryMinutes || 0;
      
      // Use the pool to execute raw SQL directly
      const sql = `
        INSERT INTO invites (
          code, label, user_label, profile_id, role_id, max_uses, used_count, 
          expires_at, user_expiry_enabled, user_expiry_minutes, user_expiry_hours, user_expiry_days, user_expiry_months, created_by
        ) 
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        RETURNING *
      `;
      
      const result = await pool.query(sql, [
        values.code,
        values.label,
        values.user_label,
        values.profile_id,
        values.role_id,
        values.max_uses,
        values.used_count,
        values.expires_at,
        values.user_expiry_enabled,
        values.user_expiry_minutes,
        values.user_expiry_hours,
        values.user_expiry_days,
        values.user_expiry_months,
        values.created_by
      ]);
      
      if (result.rows && result.rows.length > 0) {
        // Convert the result to our Invite type
        const invite = result.rows[0] as unknown as Invite;
        return invite;
      }
      
      throw new Error("Failed to create invite");
    } catch (error) {
      console.error("Error creating invite:", error);
      throw error;
    }
  }

  async updateInvite(id: number, inviteData: Partial<InsertInvite>): Promise<Invite | undefined> {
    try {
      // Handle null values for maxUses and usesRemaining
      const updates: any = {};
      
      // Copy all valid properties from inviteData to updates
      for (const [key, value] of Object.entries(inviteData)) {
        // Convert camelCase to snake_case for the database columns
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates[dbKey] = value;
      }
      
      // Update the invite
      const [updatedInvite] = await db.update(invites)
        .set(updates)
        .where(eq(invites.id, id))
        .returning();
        
      return updatedInvite;
    } catch (error) {
      console.error(`Error updating invite with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteInvite(id: number): Promise<boolean> {
    try {
      await db.delete(invites).where(eq(invites.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting invite with ID ${id}:`, error);
      return false;
    }
  }

  async useInvite(code: string): Promise<boolean> {
    try {
      // Get the invite
      const invite = await this.getInviteByCode(code);
      if (!invite) return false;
      
      // Check if expired
      if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
        return false;
      }
      
      // If maxUses is null, it means unlimited uses
      // Otherwise check if uses remaining
      if (invite.maxUses !== null && invite.usedCount !== null && invite.usedCount >= invite.maxUses) {
        return false;
      }
      
      // Increment used count
      const newUsedCount = invite.usedCount !== null ? invite.usedCount + 1 : 1;
      await this.updateInviteUsage(code, newUsedCount);
      
      return true;
    } catch (error) {
      console.error(`Error using invite with code ${code}:`, error);
      return false;
    }
  }
  
  async updateInviteUsage(code: string, usedCount: number): Promise<boolean> {
    try {
      // First get the invite to check if it should be deleted
      const invite = await this.getInviteByCode(code);
      if (!invite) return false;

      // If this usage reaches the max uses, delete the invite
      if (invite.maxUses !== null && usedCount >= invite.maxUses) {
        // Delete the invite when it reaches max uses
        console.log(`Invite ${code} has reached max uses, deleting it`);
        return await this.deleteInvite(invite.id);
      } else {
        // Otherwise, just update the usedCount
        const result = await db.update(invites)
          .set({ usedCount })
          .where(eq(invites.code, code))
          .returning();
        
        return result.length > 0;
      }
    } catch (error) {
      console.error(`Error updating invite usage for code ${code}:`, error);
      return false;
    }
  }
  
  // Helper method to generate a unique invite code
  private generateInviteCode(): string {
    return randomBytes(6).toString('hex').toUpperCase();
  }
  
  // Generate a unique memorable label for an invite
  private generateUniqueInviteLabel(): string {
    // Create a more user-friendly label with 2 adjectives and a noun
    const adjectives = [
      'Swift', 'Bright', 'Calm', 'Deft', 'Eager', 'Fast', 'Grand', 'Happy', 'Ideal', 'Jolly',
      'Kind', 'Lively', 'Magic', 'Noble', 'Prime', 'Quick', 'Royal', 'Smart', 'True', 'Vital',
      'Wise', 'Young', 'Zesty', 'Alpha', 'Brave', 'Cosmic', 'Divine', 'Elite', 'Fresh', 'Golden'
    ];
    
    const nouns = [
      'Hawk', 'Tiger', 'Eagle', 'Lion', 'Shark', 'Wolf', 'Bear', 'Falcon', 'Raven', 'Fox',
      'Panther', 'Cheetah', 'Dragon', 'Phoenix', 'Titan', 'Giant', 'Knight', 'Ranger', 'Wizard', 'Hero',
      'Legend', 'Voyager', 'Pioneer', 'Explorer', 'Spark', 'Comet', 'Star', 'Moon', 'Planet', 'Galaxy'
    ];
    
    // Select random elements
    const adj1 = adjectives[Math.floor(Math.random() * adjectives.length)];
    const adj2 = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    // Combine them to create a label
    return `${adj1}${adj2}${noun}`;
  }
  
  // Activity Logs methods
  async getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    try {
      return await db.select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.timestamp))
        .limit(limit);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      return [];
    }
  }
  
  async createActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    try {
      // Convert metadata to JSON string if provided as an object
      let metadataStr = logData.metadata;
      if (logData.metadata && typeof logData.metadata === 'object') {
        metadataStr = JSON.stringify(logData.metadata);
      }
      
      // Insert activity log
      const [log] = await db.insert(activityLogs)
        .values({
          type: logData.type,
          message: logData.message,
          username: logData.username || null,
          userId: logData.userId || null,
          inviteCode: logData.inviteCode || null,
          createdBy: logData.createdBy || null,
          metadata: metadataStr || null
        })
        .returning();
        
      return log;
    } catch (error) {
      console.error("Error creating activity log:", error);
      throw error;
    }
  }
  
  // User roles management
  async getAllRoles(): Promise<UserRole[]> {
    try {
      return await db.select().from(userRoles).orderBy(userRoles.name);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      return [];
    }
  }

  async getRoleById(id: number): Promise<UserRole | undefined> {
    try {
      const [role] = await db.select().from(userRoles).where(eq(userRoles.id, id));
      return role;
    } catch (error) {
      console.error(`Error fetching role with ID ${id}:`, error);
      return undefined;
    }
  }

  async getDefaultRole(): Promise<UserRole | undefined> {
    try {
      const [role] = await db.select().from(userRoles).where(eq(userRoles.isDefault, true));
      return role;
    } catch (error) {
      console.error("Error fetching default role:", error);
      return undefined;
    }
  }

  async createRole(role: InsertUserRole): Promise<UserRole> {
    try {
      // If this is set as the default role, unset any existing default
      if (role.isDefault) {
        await db.update(userRoles).set({ isDefault: false }).where(eq(userRoles.isDefault, true));
      }
      
      const [newRole] = await db.insert(userRoles).values(role).returning();
      return newRole;
    } catch (error) {
      console.error("Error creating user role:", error);
      throw error;
    }
  }

  async updateRole(id: number, role: Partial<InsertUserRole>): Promise<UserRole | undefined> {
    try {
      // If this is set as the default role, unset any existing default
      if (role.isDefault) {
        await db.update(userRoles)
          .set({ isDefault: false })
          .where(and(eq(userRoles.isDefault, true), ne(userRoles.id, id)));
      }
      
      const [updatedRole] = await db.update(userRoles)
        .set({
          ...role,
          updatedAt: new Date()
        })
        .where(eq(userRoles.id, id))
        .returning();
      
      return updatedRole;
    } catch (error) {
      console.error(`Error updating role with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteRole(id: number): Promise<boolean> {
    try {
      // Don't allow deletion if this is the default role
      const role = await this.getRoleById(id);
      if (role && role.isDefault) {
        console.error("Cannot delete the default role");
        return false;
      }
      
      // Find the default role to assign users to
      const defaultRole = await this.getDefaultRole();
      if (!defaultRole) {
        console.error("No default role found for user reassignment");
        return false;
      }
      
      // Get all users that have this role assigned and update them to the default role
      const usersWithRole = await db.select()
        .from(appUsers)
        .where(eq(appUsers.roleId, id));
      
      if (usersWithRole.length > 0) {
        console.log(`Moving ${usersWithRole.length} users from role "${role?.name}" to default role "${defaultRole.name}"`);
        
        // Update all users with this role to the default role
        await db.update(appUsers)
          .set({ 
            roleId: defaultRole.id,
            updatedAt: new Date()
          })
          .where(eq(appUsers.roleId, id));
      }
      
      // Now it's safe to delete the role
      await db.delete(userRoles).where(eq(userRoles.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting role with ID ${id}:`, error);
      return false;
    }
  }

  async getUserRoleByUserId(userId: number): Promise<UserRole | undefined> {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.roleId) {
        // If user doesn't have a role assigned, return the default role
        return await this.getDefaultRole();
      }
      
      return await this.getRoleById(user.roleId);
    } catch (error) {
      console.error(`Error fetching role for user ${userId}:`, error);
      return undefined;
    }
  }
}

// Choose storage implementation based on environment
// If DATABASE_URL is set, use PostgreSQL, otherwise use SQLite
export const storage: IStorage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new SQLiteStorage();
