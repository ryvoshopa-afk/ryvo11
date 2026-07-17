import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
let isDbConnected = false;

if (connectionString) {
  try {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false
    });
    console.log("🐘 PostgreSQL Pool created for database support system.");
  } catch (err: any) {
    console.error("⚠️ Failed to create PostgreSQL pool:", err.message);
  }
} else {
  console.warn("⚠️ DATABASE_URL environment variable is not defined. PostgreSQL features will run in fallback mode.");
}

// Function to initialize tables from schema.sql
export async function initDb() {
  if (!pool) {
    console.warn("⚠️ Skipping PostgreSQL initialization: Connection pool not initialized.");
    return false;
  }

  try {
    const client = await pool.connect();
    isDbConnected = true;
    console.log("✅ Successfully connected to PostgreSQL!");

    try {
      const schemaPath = path.join(process.cwd(), 'server', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(sql);
        console.log("✅ PostgreSQL tables initialized successfully from schema.sql.");
      } else {
        console.warn("⚠️ schema.sql file not found at:", schemaPath);
      }
    } catch (queryErr: any) {
      console.error("⚠️ Error running migration query:", queryErr.message);
    } finally {
      client.release();
    }
    return true;
  } catch (err: any) {
    console.error("❌ Failed to connect to PostgreSQL:", err.message);
    isDbConnected = false;
    return false;
  }
}

// Helper to query the database safely
export async function query(text: string, params?: any[]) {
  if (!pool || !isDbConnected) {
    throw new Error("PostgreSQL database is not connected or in fallback mode.");
  }
  return pool.query(text, params);
}

// Check database status
export function getDbStatus() {
  return {
    connected: isDbConnected && !!pool,
    connectionStringConfigured: !!connectionString
  };
}

export { pool };
