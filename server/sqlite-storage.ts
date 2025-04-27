import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { getDb } from './sqlite-db';
import { IStorage } from './storage';
import { 
  serverConfig, 
  jellyfinCredentials, 
  appUsers, 
  userProfiles,
  invites,
  userRoles,
  activityLogs,
  type ServerConfig, 
  type InsertServerConfig, 
  type JellyfinCredentials, 
  type InsertJellyfinCredentials,
  type AppUser,
  type InsertAppUser,
  type Session,
  type UserProfile,
  type InsertUserProfile,
  type Invite,
  type InsertInvite,
  type UserRole,
  type InsertUserRole,
  type ActivityLog,
  type InsertActivityLog
} from '@shared/schema';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import createMemoryStore from 'memorystore';
import session from 'express-session';

const MemoryStore = createMemoryStore(session);

export class SQLiteStorage implements IStorage {
  private sessionTokens: Map<string, string>;
  private sessionStore: session.SessionStore;

  constructor() {
    this.sessionTokens = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24h
    });
  }

  private dbConfigToServerConfig(dbConfig: typeof serverConfig.$inferSelect): ServerConfig {
    return {
      id: dbConfig.id,
      installationComplete: dbConfig.installationComplete ?? false,
      serverName: dbConfig.serverName ?? 'Jellyfin Manager',
      logoUrl: dbConfig.logoUrl ?? null,
      footer: dbConfig.footer ?? null,
      emailSuffix: dbConfig.emailSuffix ?? null,
      createdAt: dbConfig.createdAt,
      updatedAt: dbConfig.updatedAt
    };
  }

  async getServerConfig(): Promise<ServerConfig | undefined> {
    try {
      const db = await getDb();
      const [config] = await db.select().from(serverConfig);
      if (!config) return undefined;
      return this.dbConfigToServerConfig(config);
    } catch (error) {
      console.error('Error getting server config:', error);
      return undefined;
    }
  }

  async saveServerConfig(config: InsertServerConfig & { 
    id?: number, 
    installationComplete?: boolean,
    serverName?: string,
    logoUrl?: string | null,
    footer?: string | null,
    emailSuffix?: string | null
  }): Promise<ServerConfig> {
    try {
      const db = await getDb();
      const existingConfig = await this.getServerConfig();

      if (existingConfig) {
        const [updated] = await db
          .update(serverConfig)
          .set({ 
            ...config, 
            updatedAt: new Date() 
          })
          .where(eq(serverConfig.id, existingConfig.id))
          .returning();
        return this.dbConfigToServerConfig(updated);
      } else {
        const configToSave: InsertServerConfig = {
          url: config.url,
          apiKey: config.apiKey,
          adminUsername: config.adminUsername,
          adminPassword: config.adminPassword,
          installationComplete: config.installationComplete ?? false,
          serverName: config.serverName ?? 'Jellyfin Manager',
          logoUrl: config.logoUrl ?? null,
          footer: config.footer ?? null,
          emailSuffix: config.emailSuffix ?? null
        };

        const [created] = await db
          .insert(serverConfig)
          .values(configToSave)
          .returning();
        return this.dbConfigToServerConfig(created);
      }
    } catch (error) {
      console.error('Error saving server config:', error);
      throw error;
    }
  }

  async getJellyfinCredentials(): Promise<JellyfinCredentials | undefined> {
    try {
      const db = await getDb();
      const [creds] = await db.select().from(jellyfinCredentials);
      return creds;
    } catch (error) {
      console.error('Error getting jellyfin credentials:', error);
      return undefined;
    }
  }

  async saveJellyfinCredentials(
    credentials: Partial<InsertJellyfinCredentials> & { accessToken?: string, userId?: string }
  ): Promise<JellyfinCredentials> {
    try {
      const db = await getDb();
      const existingCreds = await this.getJellyfinCredentials();

      if (existingCreds) {
        const [updated] = await db
          .update(jellyfinCredentials)
          .set({ 
            ...credentials, 
            updatedAt: new Date() 
          })
          .where(eq(jellyfinCredentials.id, existingCreds.id))
          .returning();
        return updated;
      } else {
        const [created] = await db
          .insert(jellyfinCredentials)
          .values(credentials as InsertJellyfinCredentials)
          .returning();
        return created;
      }
    } catch (error) {
      console.error('Error saving jellyfin credentials:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<AppUser[]> {
    try {
      const db = await getDb();
      const users = await db.select().from(appUsers);
      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async getUserById(id: number): Promise<AppUser | undefined> {
    try {
      const db = await getDb();
      const [user] = await db.select().from(appUsers).where(eq(appUsers.id, id));
      return user;
    } catch (error) {
      console.error(`Error getting user by id ${id}:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<AppUser | undefined> {
    try {
      const db = await getDb();
      const [user] = await db.select().from(appUsers).where(eq(appUsers.username, username));
      return user;
    } catch (error) {
      console.error(`Error getting user by username ${username}:`, error);
      return undefined;
    }
  }

  async createUser(user: Partial<InsertAppUser> & { password: string }): Promise<AppUser> {
    try {
      const db = await getDb();
      const passwordHash = await hash(user.password, 10);
      
      const [created] = await db
        .insert(appUsers)
        .values({
          ...user,
          password: passwordHash,
          createdAt: new Date(),
          updatedAt: new Date()
        } as InsertAppUser)
        .returning();
      
      return created;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<InsertAppUser>): Promise<AppUser | undefined> {
    try {
      const db = await getDb();
      
      // If password is being updated, hash it
      if (userData.password) {
        userData.password = await hash(userData.password, 10);
      }
      
      const [updated] = await db
        .update(appUsers)
        .set({ 
          ...userData, 
          updatedAt: new Date() 
        })
        .where(eq(appUsers.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const db = await getDb();
      await db.delete(appUsers).where(eq(appUsers.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      return false;
    }
  }

  async validatePassword(user: AppUser, password: string): Promise<boolean> {
    try {
      return await compare(password, user.password);
    } catch (error) {
      console.error('Error validating password:', error);
      return false;
    }
  }

  async createSession(userId: number): Promise<Session> {
    const token = randomBytes(32).toString('hex');
    const session: Session = {
      token,
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    // This is handled by express-session
    return undefined;
  }

  async deleteSession(token: string): Promise<boolean> {
    // This is handled by express-session
    return true;
  }

  async getSessionToken(id: string): Promise<string | undefined> {
    return this.sessionTokens.get(id);
  }

  async saveSessionToken(id: string, token: string): Promise<void> {
    this.sessionTokens.set(id, token);
  }

  async deleteSessionToken(id: string): Promise<void> {
    this.sessionTokens.delete(id);
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    try {
      const db = await getDb();
      const profiles = await db.select().from(userProfiles);
      return profiles;
    } catch (error) {
      console.error('Error getting all user profiles:', error);
      return [];
    }
  }

  async getUserProfileById(id: number): Promise<UserProfile | undefined> {
    try {
      const db = await getDb();
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
      return profile;
    } catch (error) {
      console.error(`Error getting user profile by id ${id}:`, error);
      return undefined;
    }
  }

  async getDefaultUserProfile(): Promise<UserProfile | undefined> {
    try {
      const db = await getDb();
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.isDefault, true));
      return profile;
    } catch (error) {
      console.error('Error getting default user profile:', error);
      return undefined;
    }
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    try {
      const db = await getDb();
      
      const [created] = await db
        .insert(userProfiles)
        .values(profile)
        .returning();
      
      return created;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(id: number, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    try {
      const db = await getDb();
      
      const [updated] = await db
        .update(userProfiles)
        .set(profile)
        .where(eq(userProfiles.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error(`Error updating user profile ${id}:`, error);
      return undefined;
    }
  }

  async deleteUserProfile(id: number): Promise<boolean> {
    try {
      const db = await getDb();
      await db.delete(userProfiles).where(eq(userProfiles.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting user profile ${id}:`, error);
      return false;
    }
  }

  async getAllInvites(): Promise<Invite[]> {
    try {
      const db = await getDb();
      const invitesList = await db.select().from(invites).orderBy(desc(invites.createdAt));
      return invitesList;
    } catch (error) {
      console.error('Error getting all invites:', error);
      return [];
    }
  }

  async getInviteById(id: number): Promise<Invite | undefined> {
    try {
      const db = await getDb();
      const [invite] = await db.select().from(invites).where(eq(invites.id, id));
      return invite;
    } catch (error) {
      console.error(`Error getting invite by id ${id}:`, error);
      return undefined;
    }
  }

  async getInviteByCode(code: string): Promise<Invite | undefined> {
    try {
      const db = await getDb();
      const [invite] = await db.select().from(invites).where(eq(invites.code, code));
      return invite;
    } catch (error) {
      console.error(`Error getting invite by code ${code}:`, error);
      return undefined;
    }
  }

  async createInvite(inviteData: Partial<InsertInvite>, createdById: number): Promise<Invite> {
    try {
      const db = await getDb();
      
      // Generate a unique code and label if not provided
      if (!inviteData.code) {
        inviteData.code = this.generateInviteCode();
      }
      
      if (!inviteData.label) {
        inviteData.label = this.generateUniqueInviteLabel();
      }
      
      const [created] = await db
        .insert(invites)
        .values({
          ...inviteData,
          createdById,
          createdAt: new Date(),
          updatedAt: new Date(),
          usedCount: 0
        } as InsertInvite)
        .returning();
      
      return created;
    } catch (error) {
      console.error('Error creating invite:', error);
      throw error;
    }
  }

  async updateInvite(id: number, inviteData: Partial<InsertInvite>): Promise<Invite | undefined> {
    try {
      const db = await getDb();
      
      const [updated] = await db
        .update(invites)
        .set({ 
          ...inviteData, 
          updatedAt: new Date() 
        })
        .where(eq(invites.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error(`Error updating invite ${id}:`, error);
      return undefined;
    }
  }

  async deleteInvite(id: number): Promise<boolean> {
    try {
      const db = await getDb();
      await db.delete(invites).where(eq(invites.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting invite ${id}:`, error);
      return false;
    }
  }

  async useInvite(code: string): Promise<boolean> {
    try {
      const invite = await this.getInviteByCode(code);
      if (!invite) return false;
      
      // Check if invite is still valid
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return false;
      }
      
      // Check max usage if it's set
      if (invite.maxUses && invite.usedCount >= invite.maxUses) {
        return false;
      }
      
      // Increment used count
      await this.updateInviteUsage(code, (invite.usedCount || 0) + 1);
      
      // If it reached max uses, delete it
      if (invite.maxUses && invite.usedCount + 1 >= invite.maxUses) {
        await this.deleteInvite(invite.id);
      }
      
      return true;
    } catch (error) {
      console.error(`Error using invite ${code}:`, error);
      return false;
    }
  }

  async updateInviteUsage(code: string, usedCount: number): Promise<boolean> {
    try {
      const db = await getDb();
      const invite = await this.getInviteByCode(code);
      if (!invite) return false;
      
      await db
        .update(invites)
        .set({ 
          usedCount, 
          updatedAt: new Date() 
        })
        .where(eq(invites.code, code));
      
      return true;
    } catch (error) {
      console.error(`Error updating invite usage ${code}:`, error);
      return false;
    }
  }

  private generateInviteCode(): string {
    return randomBytes(16).toString('hex');
  }

  private generateUniqueInviteLabel(): string {
    const adjectives = ['Happy', 'Brave', 'Calm', 'Eager', 'Gentle', 'Jolly', 'Kind', 'Lively', 'Merry', 'Neat'];
    const nouns = ['Tiger', 'Eagle', 'Dolphin', 'Panda', 'Wolf', 'Bear', 'Lion', 'Falcon', 'Hawk', 'Fox'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective} ${noun}`;
  }

  async getAllRoles(): Promise<UserRole[]> {
    try {
      const db = await getDb();
      const roles = await db.select().from(userRoles);
      return roles;
    } catch (error) {
      console.error('Error getting all roles:', error);
      return [];
    }
  }

  async getRoleById(id: number): Promise<UserRole | undefined> {
    try {
      const db = await getDb();
      const [role] = await db.select().from(userRoles).where(eq(userRoles.id, id));
      return role;
    } catch (error) {
      console.error(`Error getting role by id ${id}:`, error);
      return undefined;
    }
  }

  async getDefaultRole(): Promise<UserRole | undefined> {
    try {
      const db = await getDb();
      const [role] = await db.select().from(userRoles).where(eq(userRoles.isDefault, true));
      return role;
    } catch (error) {
      console.error('Error getting default role:', error);
      return undefined;
    }
  }

  async createRole(role: InsertUserRole): Promise<UserRole> {
    try {
      const db = await getDb();
      
      const [created] = await db
        .insert(userRoles)
        .values(role)
        .returning();
      
      return created;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  async updateRole(id: number, role: Partial<InsertUserRole>): Promise<UserRole | undefined> {
    try {
      const db = await getDb();
      
      const [updated] = await db
        .update(userRoles)
        .set(role)
        .where(eq(userRoles.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error(`Error updating role ${id}:`, error);
      return undefined;
    }
  }

  async deleteRole(id: number): Promise<boolean> {
    try {
      const db = await getDb();
      await db.delete(userRoles).where(eq(userRoles.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting role ${id}:`, error);
      return false;
    }
  }

  async getUserRoleByUserId(userId: number): Promise<UserRole | undefined> {
    try {
      const db = await getDb();
      
      // Get the user to find their role ID
      const [user] = await db.select().from(appUsers).where(eq(appUsers.id, userId));
      if (!user || !user.roleId) return await this.getDefaultRole();
      
      // Get the role
      return await this.getRoleById(user.roleId);
    } catch (error) {
      console.error(`Error getting role for user ${userId}:`, error);
      return undefined;
    }
  }

  async getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    try {
      const db = await getDb();
      const logs = await db
        .select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit);
      
      return logs;
    } catch (error) {
      console.error('Error getting activity logs:', error);
      return [];
    }
  }

  async createActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    try {
      const db = await getDb();
      
      const [created] = await db
        .insert(activityLogs)
        .values({
          ...logData,
          createdAt: new Date()
        })
        .returning();
      
      return created;
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  }
}