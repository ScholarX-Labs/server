import { varchar, integer, timestamp, uuid } from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { coursesSchema } from '../namespaces';

export const lessons = coursesSchema.table('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  duration: integer('duration').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
