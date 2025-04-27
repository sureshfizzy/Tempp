import { ServerConfig, userProfiles, userRoles, InsertUserProfile, InsertUserRole } from '@shared/schema';
import { getDb } from './sqlite-db';
import { eq } from 'drizzle-orm';

/**
 * Initialize SQLite database tables if they don't exist
 */
export async function initializeSqliteDatabase() {
  console.log('Checking database tables...');
  const db = await getDb();
  
  // Create a default user profile if none exists
  const [defaultProfile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.isDefault, true));
  
  if (!defaultProfile) {
    const defaultProfileData: InsertUserProfile = {
      name: 'Default Profile',
      description: 'Default user profile with basic access',
      isDefault: true,
      enableAllFolders: false,
      enabledFolders: [],
      accessDays: 30,
      folderAccessMode: 'whitelist',
      loginMessageEnabled: false,
      loginMessage: null,
      welcomeEmailEnabled: false,
      welcomeEmailSubject: null,
      welcomeEmailBody: null,
      sourceUserId: null
    };
    
    try {
      await db.insert(userProfiles).values(defaultProfileData);
      console.log('Created default user profile');
    } catch (error) {
      console.error('Error creating default user profile:', error);
    }
  }
  
  // Create a default role if none exists
  const [defaultRole] = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.isDefault, true));
  
  if (!defaultRole) {
    const defaultRoleData: InsertUserRole = {
      name: 'Regular User',
      description: 'Default role with standard permissions',
      isDefault: true,
      permissions: {
        canInviteUsers: false,
        canManageUsers: false,
        canManageRoles: false,
        canManageServer: false,
        canViewActivityLogs: false,
        canManageInvites: false
      }
    };
    
    try {
      await db.insert(userRoles).values(defaultRoleData);
      console.log('Created default user role');
    } catch (error) {
      console.error('Error creating default user role:', error);
    }
  }
  
  console.log('Database initialized successfully');
}