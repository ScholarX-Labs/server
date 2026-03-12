import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Reference-only definition of public.users.
 * This table is owned and migrated by the auth team (Next.js app).
 * Do NOT add this file to migrations-schema.ts or drizzle.config.ts.
 * It exists here solely so Drizzle ORM can resolve FK references and
 * typed relations from the courses domain at runtime.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  avatar: varchar('avatar', { length: 1000 }),
  title: varchar('title', { length: 255 }),
  isBlocked: boolean('is_blocked').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
