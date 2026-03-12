import {
  varchar,
  integer,
  timestamp,
  boolean,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { courses } from './courses';
import { coursesSchema } from '../namespaces';

export const subscriptions = coursesSchema.table(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    courseId: uuid('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    amount: integer('amount'),
    status: varchar('status', { length: 50 }).default('active'),
    isActive: boolean('is_active').default(true),
    paymentId: varchar('payment_id', { length: 255 }),
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
