import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Roles schema
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isAdmin: boolean("is_admin").default(false),
  permissions: text("permissions").default("{}"), // JSON string of permissions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).pick({
  name: true,
  description: true,
  isDefault: true,
  isAdmin: true,
  permissions: true,
});

// Server Configuration schema
export const serverConfig = pgTable("server_config", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  apiKey: text("api_key").notNull(),
  serverName: text("server_name").default("Jellyfin Server"),
  logoUrl: text("logo_url"),
  featuresJson: text("features_json").default("{}"), // Stored as JSON string
  inviteDuration: integer("invite_duration").default(24), // In hours
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertServerConfigSchema = createInsertSchema(serverConfig).pick({
  url: true,
  apiKey: true,
  serverName: true,
  logoUrl: true,
  featuresJson: true,
  inviteDuration: true,
});

// App User schema (these are users of our application, not Jellyfin users)
export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  roleId: integer("role_id").references(() => userRoles.id),
  jellyfinUserId: text("jellyfin_user_id").notNull(),
  plexEmail: text("plex_email"),
  embyEmail: text("emby_email"),
  paypalEmail: text("paypal_email"),
  discordUsername: text("discord_username"),
  discordId: text("discord_id"),
  notes: text("notes"),
  expiresAt: timestamp("expires_at"),
  disabled: boolean("disabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    usernameIdx: uniqueIndex("username_idx").on(table.username),
    emailIdx: uniqueIndex("email_idx").on(table.email),
  };
});

export const insertAppUserSchema = createInsertSchema(appUsers).pick({
  username: true,
  password: true, 
  email: true,
  isAdmin: true,
  roleId: true,
  jellyfinUserId: true,
  plexEmail: true,
  embyEmail: true,
  paypalEmail: true,
  discordUsername: true,
  discordId: true,
  notes: true,
  expiresAt: true,
  disabled: true,
});

// Session schema
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => appUsers.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  userId: true,
  token: true,
  expiresAt: true,
});

// Jellyfin credential schema (one for the overall system)
export const jellyfinCredentials = pgTable("jellyfin_credentials", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  apiKey: text("api_key").notNull(),
  adminUsername: text("admin_username").notNull(),
  adminPassword: text("admin_password").notNull(),
  accessToken: text("access_token"),
  userId: text("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertJellyfinCredentialsSchema = createInsertSchema(jellyfinCredentials).pick({
  url: true,
  apiKey: true,
  adminUsername: true,
  adminPassword: true,
});

// Define the types for Jellyfin users based on their API structure
export const userSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  ServerId: z.string().optional(),
  ServerName: z.string().optional(),
  PrimaryImageTag: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
  disabled: z.boolean().optional(),
  HasPassword: z.boolean().optional(),
  HasConfiguredPassword: z.boolean().optional(),
  HasConfiguredEasyPassword: z.boolean().optional(),
  EnableAutoLogin: z.boolean().optional(),
  LastLoginDate: z.string().optional(),
  LastActivityDate: z.string().optional(),
  Configuration: z.object({
    AudioLanguagePreference: z.string().optional(),
    PlayDefaultAudioTrack: z.boolean().optional(),
    SubtitleLanguagePreference: z.string().optional(),
    DisplayMissingEpisodes: z.boolean().optional(),
    SubtitleMode: z.string().optional(),
    DisplayCollectionsView: z.boolean().optional(),
    EnableLocalPassword: z.boolean().optional(),
    OrderedViews: z.array(z.string()).optional(),
    LatestItemsExcludes: z.array(z.string()).optional(),
    MyMediaExcludes: z.array(z.string()).optional(),
    HidePlayedInLatest: z.boolean().optional(),
    RememberAudioSelections: z.boolean().optional(),
    RememberSubtitleSelections: z.boolean().optional(),
    EnableNextEpisodeAutoPlay: z.boolean().optional(),
  }).optional(),
  Policy: z.object({
    IsAdministrator: z.boolean().optional(),
    IsHidden: z.boolean().optional(),
    IsDisabled: z.boolean().optional(),
    BlockedTags: z.array(z.string()).optional(),
    EnableUserPreferenceAccess: z.boolean().optional(),
    AccessSchedules: z.array(z.any()).optional(),
    BlockUnratedItems: z.array(z.string()).optional(),
    EnableRemoteControlOfOtherUsers: z.boolean().optional(),
    EnableSharedDeviceControl: z.boolean().optional(),
    EnableRemoteAccess: z.boolean().optional(),
    EnableLiveTvManagement: z.boolean().optional(),
    EnableLiveTvAccess: z.boolean().optional(),
    EnableMediaPlayback: z.boolean().optional(),
    EnableAudioPlaybackTranscoding: z.boolean().optional(),
    EnableVideoPlaybackTranscoding: z.boolean().optional(),
    EnablePlaybackRemuxing: z.boolean().optional(),
    ForceRemoteSourceTranscoding: z.boolean().optional(),
    EnableContentDeletion: z.boolean().optional(),
    EnableContentDeletionFromFolders: z.array(z.string()).optional(),
    EnableContentDownloading: z.boolean().optional(),
    EnableSyncTranscoding: z.boolean().optional(),
    EnableMediaConversion: z.boolean().optional(),
    EnabledDevices: z.array(z.string()).optional(),
    EnableAllDevices: z.boolean().optional(),
    EnabledChannels: z.array(z.string()).optional(),
    EnableAllChannels: z.boolean().optional(),
    EnabledFolders: z.array(z.string()).optional(),
    EnableAllFolders: z.boolean().optional(),
    InvalidLoginAttemptCount: z.number().optional(),
    LoginAttemptsBeforeLockout: z.number().optional(),
    MaxActiveSessions: z.number().optional(),
    EnablePublicSharing: z.boolean().optional(),
    BlockedMediaFolders: z.array(z.string()).optional(),
    BlockedChannels: z.array(z.string()).optional(),
    RemoteClientBitrateLimit: z.number().optional(),
    AuthenticationProviderId: z.string().optional(),
    PasswordResetProviderId: z.string().optional(),
    SyncPlayAccess: z.string().optional(),
  }).optional(),
  PrimaryImageAspectRatio: z.number().optional(),
});

// Define a schema for creating a new user
export const newUserSchema = z.object({
  Name: z.string().min(1, "Username is required"),
  Password: z.string().min(1, "Password is required"),
  Email: z.string().email("Invalid email address").optional(),
  Role: z.enum(["Administrator", "User", "ContentManager"]),
  IsDisabled: z.boolean().optional(),
});

// Define Jellyfin User Activity schema
export const userActivitySchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Type: z.string(),
  UserId: z.string().optional(),
  ItemId: z.string().optional(),
  Date: z.string(),
  Severity: z.string().optional(),
  // Additional fields for media item details
  SeriesName: z.string().optional(),
  SeasonName: z.string().optional(),
  ProductionYear: z.number().optional(),
  ImageTag: z.string().optional(),
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Define types
export type ServerConfig = typeof serverConfig.$inferSelect & {
  features?: {
    enableThemeSwitcher?: boolean;
    enableWatchHistory?: boolean;
    enableActivityLog?: boolean;
  };
};
export type InsertServerConfig = z.infer<typeof insertServerConfigSchema>;

export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = z.infer<typeof insertAppUserSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type JellyfinCredentials = typeof jellyfinCredentials.$inferSelect;
export type InsertJellyfinCredentials = z.infer<typeof insertJellyfinCredentialsSchema>;

export type User = z.infer<typeof userSchema>;
export type NewUser = z.infer<typeof newUserSchema>;
export type UserActivity = z.infer<typeof userActivitySchema>;
export type Login = z.infer<typeof loginSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;



// User Profiles schema
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sourceUserId: text("source_user_id").notNull(), // Jellyfin User ID that this profile is based on
  sourceName: text("source_name").notNull(), // Jellyfin User Name for display
  isDefault: boolean("is_default").default(false),
  libraryAccess: text("library_access").default("[]"), // JSON string of library IDs
  homeLayout: text("home_layout").default("[]"), // JSON string of home layout config
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).pick({
  name: true,
  sourceUserId: true,
  sourceName: true,
  isDefault: true,
  libraryAccess: true,
  homeLayout: true,
});

// User profile related types
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

// Schema for invites - Updated to match the actual database structure
export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label"),
  userLabel: text("user_label"),
  profileId: text("profile_id"),  // It's TEXT in the actual database
  maxUses: integer("max_uses"),
  usedCount: integer("used_count"),  // The database has used_count, not uses_remaining
  expiresAt: timestamp("expires_at"),
  userExpiryEnabled: boolean("user_expiry_enabled").default(false).notNull(),
  userExpiryMinutes: integer("user_expiry_minutes").default(0),
  userExpiryHours: integer("user_expiry_hours").default(0),
  userExpiryDays: integer("user_expiry_days").default(0),
  userExpiryMonths: integer("user_expiry_months").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),  // It's TEXT in the actual database
});

export const insertInviteSchema = createInsertSchema(invites)
  .pick({
    label: true,
    userLabel: true,
    profileId: true,
    maxUses: true,
    userExpiryEnabled: true,
    userExpiryMinutes: true,
    userExpiryHours: true,
    userExpiryDays: true,
    userExpiryMonths: true,
    createdBy: true,
    expiresAt: true,
  })
  .extend({
    maxUses: z.number().nullable(), // Allow null for unlimited uses
  });

// Custom Invite type to match the actual database structure
export type Invite = {
  id: number;
  code: string;
  label: string | null;
  userLabel: string | null;
  profileId: string | null;
  maxUses: number | null;
  usedCount: number | null;
  expiresAt: Date | null;
  userExpiryEnabled: boolean;
  userExpiryMonths?: number | null;
  userExpiryDays?: number | null;
  userExpiryHours: number | null;
  userExpiryMinutes?: number | null;
  createdAt: Date;
  createdBy: string | null;
  
  // Calculated properties for UI rendering
  usesRemaining?: number | null;
};
export type InsertInvite = z.infer<typeof insertInviteSchema>;

// Activity Logs schema
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // account_created, account_disabled, account_enabled, invite_created, invite_used, invite_expired
  message: text("message").notNull(),
  timestamp: timestamp("timestamp", { mode: 'date' }).defaultNow().notNull(),
  username: text("username"),
  userId: text("user_id"), // Jellyfin User ID
  inviteCode: text("invite_code"),
  createdBy: text("created_by"),
  metadata: text("metadata") // JSON string with any additional data
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  type: true,
  message: true,
  username: true,
  userId: true,
  inviteCode: true,
  createdBy: true,
  metadata: true
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
