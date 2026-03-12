import {
  varchar,
  integer,
  timestamp,
  boolean,
  uuid,
  index,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { lessons } from './lessons';
import { coursesSchema } from './namespaces';

export const courses = coursesSchema.table(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 255 }).unique(),
    title: varchar('title', { length: 100 }).notNull(),
    description: varchar('description', { length: 2000 }).notNull(),
    imageUrl: varchar('image_url', { length: 1000 }),
    imagePublicId: varchar('image_public_id', { length: 255 }),
    videoPreviewUrl: varchar('video_preview_url', { length: 1000 }),
    category: varchar('category', { length: 50 }).notNull(),
    level: varchar('level', { length: 50 }),
    currentPrice: integer('current_price').notNull(),
    originalPrice: integer('original_price'),
    instructorId: uuid('instructor_id').references(() => users.id),
    status: varchar('status', { length: 50 }).default('active').notNull(),
    rating: numeric('rating', { precision: 3, scale: 2 }).default('0'),
    totalRatings: integer('total_ratings').default(0),
    duration: varchar('duration', { length: 100 }),
    lessonsCount: integer('lessons_count').default(0),
    videosCount: integer('videos_count').default(0),
    studentsCount: integer('students_count').default(0),
    isBestseller: boolean('is_bestseller').default(false),
    urgencyText: varchar('urgency_text', { length: 255 }),
    tags: jsonb('tags').$type<string[]>(),
    lastSyncedAt: timestamp('last_synced_at').defaultNow(),
    requiresForm: boolean('requires_form').default(false),
    salesInquiry: boolean('sales_inquiry').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    statusCategoryIdx: index('course_status_category_idx').on(
      table.status,
      table.category,
    ),
    instructorIdx: index('course_instructor_idx').on(table.instructorId),
    studentsCountIdx: index('course_students_count_idx').on(
      table.studentsCount,
    ),
    requiresFormIdx: index('course_requires_form_idx').on(table.requiresForm),
    salesInquiryIdx: index('course_sales_inquiry_idx').on(table.salesInquiry),
    slugIdx: index('course_slug_idx').on(table.slug),
  }),
);

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  lessons: many(lessons),
}));
