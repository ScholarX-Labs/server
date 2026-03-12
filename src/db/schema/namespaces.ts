import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * All course-domain tables live in the `courses` PostgreSQL schema.
 * This isolates migrations from the `public` schema (owned by the auth team).
 * drizzle.config.ts uses `schemaFilter: ['courses']` so drizzle-kit
 * never touches public.users or any other team's tables.
 */
export const coursesSchema = pgSchema('courses');
