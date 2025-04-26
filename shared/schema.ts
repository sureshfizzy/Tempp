import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Jellyfin credential schema
export const jellyfinCredentials = pgTable("jellyfin_credentials", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  accessToken: text("access_token"),
  userId: text("user_id"),
});

export const insertJellyfinCredentialsSchema = createInsertSchema(jellyfinCredentials).pick({
  url: true,
  username: true,
  password: true,
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

export type JellyfinCredentials = typeof jellyfinCredentials.$inferSelect;
export type InsertJellyfinCredentials = z.infer<typeof insertJellyfinCredentialsSchema>;
export type User = z.infer<typeof userSchema>;
export type NewUser = z.infer<typeof newUserSchema>;
export type UserActivity = z.infer<typeof userActivitySchema>;
