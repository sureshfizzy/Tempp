import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdir, access } from 'fs/promises';
import { join } from 'path';
import * as schema from '@shared/schema';

// Ensure data directory exists
const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = join(DATA_DIR, 'jellyfin-manager.db');

async function ensureDataDirExists() {
  try {
    await access(DATA_DIR);
  } catch (error) {
    // Directory doesn't exist, create it
    await mkdir(DATA_DIR, { recursive: true });
    console.log(`Created data directory at ${DATA_DIR}`);
  }
}

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (_db) return _db;
  
  await ensureDataDirExists();
  
  const sqlite = new Database(DB_PATH, { verbose: process.env.NODE_ENV === 'development' ? console.log : undefined });
  
  // Enable foreign keys
  sqlite.exec('PRAGMA foreign_keys = ON;');
  
  // Connect with Drizzle
  _db = drizzle(sqlite, { schema });

  return _db;
}

export async function initializeSqliteDb() {
  const db = await getDb();
  console.log('SQLite database initialized at', DB_PATH);
  return db;
}