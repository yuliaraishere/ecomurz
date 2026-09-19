import { execSync } from 'child_process';
import fs from 'fs';

// Load .env variables if not present in process.env
if (fs.existsSync('.env')) {
  const lines = fs.readFileSync('.env', 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key] && val) {
        process.env[key] = val;
      }
    }
  }
}

// Ensure DIRECT_URL is always populated (fall back to DATABASE_URL if missing or empty)
if (!process.env.DIRECT_URL || process.env.DIRECT_URL.trim() === '') {
  if (process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
}

console.log('[Prisma Migrate] Running database migrations...');
try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
  console.log('[Prisma Migrate] Migrations applied successfully.');
} catch (error) {
  console.warn(
    '[Prisma Migrate] Warning: Migration execution encountered an issue. Continuing build...',
    error instanceof Error ? error.message : error
  );
}
