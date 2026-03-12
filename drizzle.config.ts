import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Use the courses/ folder as entry point — excludes auth/users.ts entirely.
  // App code imports from schema/index.ts which includes the auth reference stub.
  schema: './src/db/schema/courses/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Only manage the `courses` schema — keeps drizzle-kit blind to
  // public.users and any other schema owned by other teams.
  schemaFilter: ['courses'],
  verbose: true,
  strict: true,
});
