import { Request, Response, Express } from "express";
import { storage } from "./storage";

export function setupLibraryFoldersRoutes(app: Express) {
  // Get library folder information
  app.get("/api/users/library-folders", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.session.connected) {
        return res.status(401).send({ error: "Unauthorized" });
      }
      
      // Get credentials
      const credentials = await storage.getJellyfinCredentials();
      if (!credentials || !credentials.url || !credentials.accessToken) {
        return res.status(404).send({ error: "No valid Jellyfin credentials found" });
      }
      
      const apiUrl = credentials.url.endsWith('/') 
        ? credentials.url.slice(0, -1) 
        : credentials.url;
      
      // Fetch library views from Jellyfin
      const folderUrl = `${apiUrl}/Library/MediaFolders`;
      
      const response = await fetch(folderUrl, { 
        headers: { 
          "X-Emby-Token": credentials.accessToken
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).send({ 
          error: `Failed to fetch library folders: ${response.status} ${response.statusText}` 
        });
      }
      
      const data = await response.json();
      
      // Extract folder information
      if (data && data.Items && Array.isArray(data.Items)) {
        const folders = data.Items.map((item: any) => ({
          id: item.Id,
          name: item.Name,
          type: item.CollectionType || 'general',
          path: item.Path
        }));
        
        return res.json(folders);
      } else {
        return res.json([]);
      }
    } catch (error) {
      console.error("Error fetching library folders:", error);
      return res.status(500).send({ error: "Failed to fetch library folders" });
    }
  });
}