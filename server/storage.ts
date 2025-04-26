import { 
  JellyfinCredentials, 
  InsertJellyfinCredentials, 
  User,
  UserActivity
} from "@shared/schema";

// Interface for Jellyfin API storage operations
export interface IStorage {
  // Jellyfin credentials
  getJellyfinCredentials(): Promise<JellyfinCredentials | undefined>;
  saveJellyfinCredentials(credentials: InsertJellyfinCredentials): Promise<JellyfinCredentials>;
  
  // Session management
  getSessionToken(id: string): Promise<string | undefined>;
  saveSessionToken(id: string, token: string): Promise<void>;
  deleteSessionToken(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private jellyfinCredentials?: JellyfinCredentials;
  private sessionTokens: Map<string, string>;
  private currentId: number;

  constructor() {
    this.sessionTokens = new Map();
    this.currentId = 1;
  }

  async getJellyfinCredentials(): Promise<JellyfinCredentials | undefined> {
    return this.jellyfinCredentials;
  }

  async saveJellyfinCredentials(
    credentials: InsertJellyfinCredentials
  ): Promise<JellyfinCredentials> {
    const id = this.currentId++;
    this.jellyfinCredentials = { ...credentials, id };
    return this.jellyfinCredentials;
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
}

export const storage = new MemStorage();
