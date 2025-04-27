import { db } from './db';
import { appUsers, jellyfinCredentials } from '@shared/schema';
import { eq, and, isNotNull, lt } from 'drizzle-orm';

/**
 * Background job to check for expired user accounts and disable them
 * This function should be called periodically (e.g. hourly)
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
          isNotNull(appUsers.expiresAt),
          isNotNull(appUsers.jellyfinUserId) // Ensure we have a valid Jellyfin user ID
        )
      )
      .returning();
    
    const count = result.length;
    if (count > 0) {
      console.log(`Disabled ${count} expired user accounts`);
      
      // Get Jellyfin credentials to disable users in Jellyfin as well
      const credentials = await db.select().from(jellyfinCredentials).limit(1);
      
      if (credentials.length > 0) {
        const creds = credentials[0];
        const apiUrl = creds.url.endsWith('/') ? creds.url.slice(0, -1) : creds.url;
        
        // For each expired user, update their Jellyfin account to disabled
        for (const user of result) {
          console.log(`Disabled user ${user.username} (ID: ${user.id}) - Account expired on ${user.expiresAt?.toISOString()}`);
          
          try {
            if (user.jellyfinUserId && user.jellyfinUserId.length > 5) { // Validate the ID is a proper string, not a date
              // First get the current user policy
              const userResponse = await fetch(`${apiUrl}/Users/${user.jellyfinUserId}`, {
                headers: {
                  "X-Emby-Token": creds.accessToken || "",
                },
              });
              
              if (userResponse.ok) {
                const userData = await userResponse.json();
                
                if (userData && userData.Policy) {
                  const currentPolicy = userData.Policy;
                  currentPolicy.IsDisabled = true;
                  
                  // Update the policy in Jellyfin
                  const policyResponse = await fetch(`${apiUrl}/Users/${user.jellyfinUserId}/Policy`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Emby-Token": creds.accessToken || "",
                    },
                    body: JSON.stringify(currentPolicy),
                  });
                  
                  if (policyResponse.ok) {
                    console.log(`Successfully disabled Jellyfin user ${userData.Name} (${user.jellyfinUserId}) due to expiry`);

                    // Verify the update was applied by fetching the user again
                    const verifyResponse = await fetch(`${apiUrl}/Users/${user.jellyfinUserId}`, {
                      headers: {
                        "X-Emby-Token": creds.accessToken || "",
                      },
                    });
                    
                    if (verifyResponse.ok) {
                      const verifyData = await verifyResponse.json();
                      console.log(`Verified Jellyfin user ${verifyData.Name} disabled status: ${verifyData.Policy?.IsDisabled ? 'true' : 'false'}`);
                      
                      if (!verifyData.Policy?.IsDisabled) {
                        // The disable update didn't take effect, try again with a different approach
                        console.warn(`Jellyfin API didn't apply disable setting for ${userData.Name}, trying alternative method`);
                        
                        // Make a more specific request focused only on the IsDisabled property
                        const retryResponse = await fetch(`${apiUrl}/Users/${user.jellyfinUserId}/Policy`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json", 
                            "X-Emby-Token": creds.accessToken || "",
                          },
                          body: JSON.stringify({
                            IsDisabled: true
                          }),
                        });
                        
                        if (retryResponse.ok) {
                          console.log(`Successfully disabled Jellyfin user ${userData.Name} using simplified request`);
                        } else {
                          console.error(`Failed retry to disable Jellyfin user ${user.jellyfinUserId}: ${retryResponse.statusText}`);
                        }
                      }
                    }
                  } else {
                    console.error(`Failed to disable Jellyfin user ${user.jellyfinUserId}: ${policyResponse.statusText}`);
                    
                    // Try alternative method with minimal payload
                    console.warn(`Trying alternative method to disable user ${user.jellyfinUserId}`);
                    try {
                      const alternativeResponse = await fetch(`${apiUrl}/Users/${user.jellyfinUserId}/Policy`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "X-Emby-Token": creds.accessToken || "",
                        },
                        body: JSON.stringify({
                          IsDisabled: true
                        }),
                      });
                      
                      if (alternativeResponse.ok) {
                        console.log(`Successfully disabled Jellyfin user ${userData.Name} with alternative method`);
                      } else {
                        console.error(`Alternative method also failed: ${alternativeResponse.statusText}`);
                      }
                    } catch (altError) {
                      console.error(`Error in alternative disable method:`, altError);
                    }
                  }
                } else {
                  console.error(`Unable to retrieve policy for Jellyfin user ${user.jellyfinUserId}`);
                }
              } else {
                console.error(`Failed to fetch Jellyfin user ${user.jellyfinUserId}: ${userResponse.statusText}`);
              }
            }
          } catch (jellyfimApiError) {
            console.error(`Error updating Jellyfin user status for ${user.jellyfinUserId}:`, jellyfimApiError);
          }
        }
      } else {
        console.warn('No Jellyfin credentials found, could not update Jellyfin user status');
      }
      
      // Add other actions here:
      // 1. Sending email notifications to users
      // 2. Notifying administrators
    } else {
      console.log('No expired user accounts found');
    }
    
    return count;
  } catch (error) {
    console.error('Error checking for expired users:', error);
    throw error;
  }
}

// Set up interval to check for expired users - every minute
export function startExpiryCheckJob(intervalMs = 60 * 1000): NodeJS.Timeout {
  console.log(`Starting user expiry check job, interval: ${intervalMs}ms`);
  // Run immediately on startup
  checkAndDisableExpiredUsers().catch(err => {
    console.error('Error in initial user expiry check:', err);
  });
  
  // Then set up interval to check every minute
  return setInterval(() => {
    checkAndDisableExpiredUsers().catch(err => {
      console.error('Error in scheduled user expiry check:', err);
    });
  }, intervalMs);
}