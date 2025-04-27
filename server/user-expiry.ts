import { db } from './db';
import { appUsers } from '@shared/schema';
import { eq, and, isNotNull, lt } from 'drizzle-orm';

/**
 * Background job to check for expired user accounts and disable them
 * This function should be called periodically (e.g. daily)
 */
export async function checkAndDisableExpiredUsers(): Promise<number> {
  const now = new Date();
  console.log(`Checking for expired user accounts at ${now.toISOString()}`);
  
  try {
    // Find all expired users that are not already disabled
    const result = await db.update(appUsers)
      .set({ 
        disabled: true,
        updatedAt: now
      })
      .where(
        and(
          eq(appUsers.disabled, false),
          lt(appUsers.expiresAt, now),
          isNotNull(appUsers.expiresAt)
        )
      )
      .returning();
    
    const count = result.length;
    if (count > 0) {
      console.log(`Disabled ${count} expired user accounts`);
      
      // Here you could implement additional actions like:
      // 1. Sending email notifications to users
      // 2. Notifying administrators
      // 3. Updating the Jellyfin user status via API
      
      // For now we'll just log the disabled users
      for (const user of result) {
        console.log(`Disabled user ${user.username} (ID: ${user.id}) - Account expired on ${user.expiresAt?.toISOString()}`);
      }
    } else {
      console.log('No expired user accounts found');
    }
    
    return count;
  } catch (error) {
    console.error('Error checking for expired users:', error);
    throw error;
  }
}

// Set up interval to check for expired users - every hour
export function startExpiryCheckJob(intervalMs = 60 * 60 * 1000): NodeJS.Timeout {
  console.log(`Starting user expiry check job, interval: ${intervalMs}ms`);
  // Run immediately on startup
  checkAndDisableExpiredUsers().catch(err => {
    console.error('Error in initial user expiry check:', err);
  });
  
  // Then set up interval
  return setInterval(() => {
    checkAndDisableExpiredUsers().catch(err => {
      console.error('Error in scheduled user expiry check:', err);
    });
  }, intervalMs);
}