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
  
  try {
    // Check if tables exist
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activities'
      );
    `);
    
    const tablesExist = result.rows[0].exists;
    
    if (!tablesExist) {
      console.log("Tables don't exist. Creating tables...");
      
      // Create users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
        );
      `);
      
      // Create activities table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS activities (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          cost_level TEXT NOT NULL,
          time_commitment TEXT NOT NULL,
          location TEXT NOT NULL,
          is_private BOOLEAN DEFAULT false,
          is_featured BOOLEAN DEFAULT false,
          seasonality TEXT[] NOT NULL,
          image_url TEXT,
          event_url TEXT,
          contact_info TEXT,
          rating INTEGER,
          date TEXT,
          tags JSONB NOT NULL,
          coordinates JSONB,
          venue TEXT,
          venue_name TEXT,
          is_user_added BOOLEAN DEFAULT true,
          external_ids JSONB,
          date_added TIMESTAMP DEFAULT NOW() NOT NULL,
          last_selected TIMESTAMP,
          times_selected INTEGER DEFAULT 0 NOT NULL,
          attendees INTEGER DEFAULT 0 NOT NULL,
          icon TEXT NOT NULL,
          icon_bg_class TEXT NOT NULL
        );
      `);
      
      // Create tags table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tags (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          activity_id INTEGER NOT NULL,
          FOREIGN KEY (activity_id) REFERENCES activities(id)
        );
      `);
      
      console.log("Tables created successfully.");
    } else {
      console.log("Tables already exist.");
    }
    
    console.log("Schema pushed successfully.");
  } catch (error) {
    console.error("Error pushing schema:", error);
    throw error;
  }
}