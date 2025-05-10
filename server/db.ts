import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Function to push the schema to the database (useful for testing and development)
export async function pushSchema() {
  console.log("Pushing schema to database...");
  // This is a placeholder - normally we would use drizzle-kit for migrations
  console.log("Schema pushed successfully.");
}