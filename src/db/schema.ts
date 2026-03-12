import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  uuid,
  index,
} from 'drizzle-orm/pg-core';

// Users table (simplified for references)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  isBlocked: boolean('is_blocked').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Course table mapped from legacy MongoDB schema
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 100 }).notNull(),
    description: varchar('description', { length: 2000 }).notNull(),
    imageUrl: varchar('image_url', { length: 1000 }),
    imagePublicId: varchar('image_public_id', { length: 255 }),
    category: varchar('category', { length: 50 }).notNull(), // 'Featured', 'ScholarX'
    currentPrice: integer('current_price').notNull(), // Store as cents
    oldPrice: integer('old_price'), // Store as cents
    instructorId: uuid('instructor_id').references(() => users.id),
    status: varchar('status', { length: 50 }).default('active').notNull(), // 'active', 'inactive'

    // Aggregated stats (could also be dynamic, but mapped from legacy structure)
    totalDuration: integer('total_duration').default(0), // in minutes
    totalLessons: integer('total_lessons').default(0),
    subscriberCount: integer('subscriber_count').default(0),

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
    subscriberCountIdx: index('course_subscriber_count_idx').on(
      table.subscriberCount,
    ),
    requiresFormIdx: index('course_requires_form_idx').on(table.requiresForm),
    salesInquiryIdx: index('course_sales_inquiry_idx').on(table.salesInquiry),
  }),
);

// Lesson table
export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  duration: integer('duration').default(0), // duration in minutes
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Subscriptions table (Maps legacy user course enrollments & subscriptions)
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    courseId: uuid('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    amount: integer('amount'), // price paid in cents
    status: varchar('status', { length: 50 }).default('active'),
    isActive: boolean('is_active').default(true),
    paymentId: varchar('payment_id', { length: 255 }), // 'free-enrollment', 'direct-enrollment', etc.
    enrolledAt: timestamp('enrolled_at').defaultNow(),
  },
  (table) => ({
    userCourseIdx: index('subscription_user_course_idx').on(
      table.userId,
      table.courseId,
    ),
    activeIdx: index('subscription_active_idx').on(table.isActive),
  }),
);
