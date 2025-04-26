import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Server Configuration schema
export const serverConfig = pgTable("server_config", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  apiKey: text("api_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertServerConfigSchema = createInsertSchema(serverConfig).pick({
  url: true,
  apiKey: true,
});

// App User schema (these are users of our application, not Jellyfin users)
export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  jellyfinUserId: text("jellyfin_user_id").notNull(),
  plexEmail: text("plex_email"),
  embyEmail: text("emby_email"),
  paypalEmail: text("paypal_email"),
  discordUsername: text("discord_username"),
  discordId: text("discord_id"),
  notes: text("notes"),
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
  jellyfinUserId: true,
  plexEmail: true,
  embyEmail: true,
  paypalEmail: true,
  discordUsername: true,
  discordId: true,
  notes: true,
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
  Id: z.number(),
  Name: z.string(),
  Type: z.string(),
  UserId: z.string(),
  ItemId: z.string().optional(),
  Date: z.string(),
  Severity: z.string(),
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Define types
export type ServerConfig = typeof serverConfig.$inferSelect;
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
