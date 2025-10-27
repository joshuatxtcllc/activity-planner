// Environment configuration and validation

interface EnvConfig {
  // Database
  DATABASE_URL: string;

  // Session
  SESSION_SECRET: string;

  // External APIs (optional)
  VITE_TICKETMASTER_API_KEY?: string;
  VITE_EVENTBRITE_API_KEY?: string;
  VITE_TRIPADVISOR_API_KEY?: string;
  GOOGLE_SEARCH_API_KEY?: string;
  GOOGLE_SEARCH_ENGINE_ID?: string;

  // Instagram (optional)
  INSTAGRAM_APP_ID?: string;
  INSTAGRAM_APP_SECRET?: string;
}

// Validate required environment variables
export function validateEnv(): void {
  const required: (keyof EnvConfig)[] = ['DATABASE_URL', 'SESSION_SECRET'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
  }

  // Warn about missing optional API keys
  const optionalKeys = [
    'VITE_TICKETMASTER_API_KEY',
    'VITE_EVENTBRITE_API_KEY',
    'VITE_TRIPADVISOR_API_KEY',
    'GOOGLE_SEARCH_API_KEY',
    'INSTAGRAM_APP_ID'
  ];

  const missingOptional = optionalKeys.filter(key => !process.env[key]);

  if (missingOptional.length > 0) {
    console.warn('⚠️  Missing optional API keys (some features may be limited):');
    missingOptional.forEach(key => console.warn(`   - ${key}`));
  }

  console.log('✅ Environment validation passed');
}

// Get configuration with defaults
export function getConfig(): EnvConfig {
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    SESSION_SECRET: process.env.SESSION_SECRET!,
    VITE_TICKETMASTER_API_KEY: process.env.VITE_TICKETMASTER_API_KEY,
    VITE_EVENTBRITE_API_KEY: process.env.VITE_EVENTBRITE_API_KEY,
    VITE_TRIPADVISOR_API_KEY: process.env.VITE_TRIPADVISOR_API_KEY,
    GOOGLE_SEARCH_API_KEY: process.env.GOOGLE_SEARCH_API_KEY,
    GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID,
    INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID,
    INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
  };
}
