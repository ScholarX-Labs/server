import { Injectable, HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { DbService } from '../db/db.service';
import { courses, subscriptions, users } from '../db/schema/index';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  CoursePaginationQueryDto,
  SearchCourseDto,
} from './dto/pagination-query.dto';
import { and, eq, ilike, count, sql } from 'drizzle-orm';

interface EnrollmentRequestMeta {
  requestId: string;
  idempotencyKey?: string;
  sourceSurface?: string;
}

interface PaidInitMeta extends EnrollmentRequestMeta {
  returnUrl?: string;
}

interface ApplicationInitMeta extends EnrollmentRequestMeta {
  applicantSeed?: Record<string, unknown>;
}

@Injectable()
export class CoursesService {
  constructor(private readonly dbService: DbService) {}

  private throwStructuredBadRequest(
    code: { code: string; numericCode: number },
    message: string,
    details?: Record<string, unknown>,
  ): never {
    throw new AppException(code, HttpStatus.BAD_REQUEST, message, details);
  }

  private throwStructuredNotFound(
    code: { code: string; numericCode: number },
    message: string,
    details?: Record<string, unknown>,
  ): never {
    throw new AppException(code, HttpStatus.NOT_FOUND, message, details);
  }

  private throwStructuredForbidden(
    code: { code: string; numericCode: number },
    message: string,
    details?: Record<string, unknown>,
  ): never {
    throw new AppException(code, HttpStatus.FORBIDDEN, message, details);
  }

  private throwStructuredUnauthorized(
    code: { code: string; numericCode: number },
    message: string,
    details?: Record<string, unknown>,
  ): never {
    throw new AppException(code, HttpStatus.UNAUTHORIZED, message, details);
  }

  private parsePagination(page?: number, limit?: number) {
    const p = Math.max(page || 1, 1);
    const l = Math.max(limit || 3, 1);
    const offset = (p - 1) * l;
    return { page: p, limit: l, offset };
  }

  private mapCourseToFrontend(course: any, isSubscribed: boolean = false) {
    return {
      ...course,
      thumbnail: course.imageUrl,
      price: course.currentPrice,
      isPublished: course.status === 'active',
      instructor: course.instructor
        ? {
            id: course.instructor.id,
            name: course.instructor.name,
            avatar: course.instructor.avatar,
            title: course.instructor.title,
          }
        : undefined,
      isSubscribed,
    };
  }

  async createCourse(
    createCourseDto: CreateCourseDto,
    file?: Express.Multer.File,
  ) {
    let imageUrl = null;
    let imagePublicId = null;

    if (file) {
      // Placeholder for Cloudinary upload integration
      imageUrl = (file as any).path ?? '';
      imagePublicId = file.filename ?? '';
    }

    const [newCourse] = await this.dbService.db
      .insert(courses)
      .values({
        ...createCourseDto,
        imageUrl,
        imagePublicId,
      })
      .returning();

    return newCourse;
  }

  async getCourses(queryDto: CoursePaginationQueryDto, userId?: string) {
    const { page, limit, offset } = this.parsePagination(
      queryDto.page,
      queryDto.limit,
    );

    // Build where clause
    let whereClause: any = eq(courses.status, 'active');
    if (queryDto.category) {
      whereClause = and(whereClause, eq(courses.category, queryDto.category));
    }

    // Get total count
    const [totalRes] = await this.dbService.db
      .select({ count: count() })
      .from(courses)
      .where(whereClause);

    const totalCourses = totalRes.count;
    const totalPages = Math.ceil(totalCourses / limit) || 1;

    // Get items
    const items = await this.dbService.db.query.courses.findMany({
      where: whereClause,
      limit,
      offset,
      with: {
        instructor: true,
      },
    });

    // Check subscriptions if userId is provided
    let itemsWithSubscription = items.map((course) => ({
      ...course,
      isSubscribed: false,
    }));

    if (userId && items.length > 0) {
      const courseIds = items.map((c) => c.id);
      const userSubs = await this.dbService.db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.userId, userId),
          sql`${subscriptions.courseId} IN ${courseIds}`,
          eq(subscriptions.isActive, true),
        ),
      });

      const subbedCourseIds = new Set(userSubs.map((s) => s.courseId));
      itemsWithSubscription = items.map((course) => ({
        ...course,
        isSubscribed: subbedCourseIds.has(course.id),
      }));
    }

    const formattedItems = itemsWithSubscription.map((c) =>
      this.mapCourseToFrontend(c, c.isSubscribed),
    );

    return {
      items: formattedItems,
      pagination: {
        currentPage: page,
        totalPages,
        totalCourses,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getFeaturedCourses(page?: number, limit?: number, userId?: string) {
    return this.getCourses({ page, limit, category: 'Featured' }, userId);
  }

  async getScholarXCourses(page?: number, limit?: number, userId?: string) {
    return this.getCourses({ page, limit, category: 'ScholarX' }, userId);
  }

  async searchCourses(queryDto: SearchCourseDto) {
    if (!queryDto.title) {
      this.throwStructuredBadRequest(
        ERROR_CODES.BAD_REQUEST,
        'Search title is required',
      );
    }

    const { page, limit, offset } = this.parsePagination(
      queryDto.page,
      queryDto.limit,
    );

    const whereClause = and(
      ilike(courses.title, `%${queryDto.title}%`),
      eq(courses.status, 'active'),
    );

    const [totalRes] = await this.dbService.db
      .select({ count: count() })
      .from(courses)
      .where(whereClause);

    const totalCourses = totalRes.count;
    const totalPages = Math.ceil(totalCourses / limit) || 1;

    const items = await this.dbService.db.query.courses.findMany({
      where: whereClause,
      limit,
      offset,
      with: {
        instructor: true,
      },
    });

    const formattedItems = items.map((c) => this.mapCourseToFrontend(c, false));

    return {
      items: formattedItems,
      pagination: {
        currentPage: page,
        totalPages,
        totalCourses,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getCourseById(id: string, userId?: string) {
    const course = await this.dbService.db.query.courses.findFirst({
      where: and(eq(courses.id, id), eq(courses.status, 'active')),
      with: {
        instructor: true,
      },
    });

    if (!course) {
      this.throwStructuredNotFound(
        ERROR_CODES.COURSE_NOT_FOUND,
        `The requested course (ID: ${id}) was not found or is currently inactive.`,
      );
    }

    let isSubscribed = false;
    if (userId) {
      const sub = await this.dbService.db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.courseId, id),
          eq(subscriptions.isActive, true),
        ),
      });
      isSubscribed = !!sub;
    }

    return this.mapCourseToFrontend(course, isSubscribed);
  }

  async getCourseBySlug(slug: string, userId?: string) {
    const course = await this.dbService.db.query.courses.findFirst({
      where: and(eq(courses.slug, slug), eq(courses.status, 'active')),
      with: {
        instructor: true,
      },
    });

    if (!course) {
      this.throwStructuredNotFound(
        ERROR_CODES.COURSE_NOT_FOUND,
        `Course with slug '${slug}' not found.`,
      );
    }

    let isSubscribed = false;
    if (userId) {
      const sub = await this.dbService.db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.courseId, course.id),
          eq(subscriptions.isActive, true),
        ),
      });
      isSubscribed = !!sub;
    }

    return this.mapCourseToFrontend(course, isSubscribed);
  }

  async updateCourse(
    id: string,
    updateDto: UpdateCourseDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.dbService.db.query.courses.findFirst({
      where: eq(courses.id, id),
    });

    if (!existing) {
      this.throwStructuredNotFound(
        ERROR_CODES.COURSE_NOT_FOUND,
        `Cannot update course (ID: ${id}): Course not found.`,
      );
    }

    let imageUrl = existing.imageUrl;
    let imagePublicId = existing.imagePublicId;

    if (file) {
      imageUrl = (file as any).path ?? '';
      imagePublicId = file.filename ?? '';
      // TODO: Delete old image from Cloudinary using existing.imagePublicId
    }

    const [updatedCourse] = await this.dbService.db
      .update(courses)
      .set({
        ...updateDto,
        imageUrl,
        imagePublicId,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, id))
      .returning();

    return updatedCourse;
  }

  async deleteCourse(id: string) {
    const existing = await this.dbService.db.query.courses.findFirst({
      where: eq(courses.id, id),
    });

    if (!existing) {
      this.throwStructuredNotFound(
        ERROR_CODES.COURSE_NOT_FOUND,
        `Cannot delete course (ID: ${id}): Course not found.`,
      );
    }

    // TODO: Delete image from Cloudinary using existing.imagePublicId

    // Update status to 'inactive' for soft delete
    await this.dbService.db
      .update(courses)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(eq(courses.id, id));
  }

  async enrollUserToCourse(courseId: string, userId: string) {
    return await this.dbService.db.transaction(async (tx) => {
      // 1. Check Course
      const course = await tx.query.courses.findFirst({
        where: and(eq(courses.id, courseId), eq(courses.status, 'active')),
      });
      if (!course) {
        this.throwStructuredNotFound(
          ERROR_CODES.COURSE_NOT_FOUND,
          `Course (ID: ${courseId}) not found or inactive.`,
        );
      }

      // 2. Check User (Assuming users table exists and mapped)
      const user = await tx.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        this.throwStructuredUnauthorized(
          ERROR_CODES.UNAUTHORIZED,
          'Your authentication session is not linked to an active user account.',
          {
            userId,
          },
        );
      }

      if (user.isBlocked) {
        this.throwStructuredForbidden(
          ERROR_CODES.USER_BLOCKED,
          'User is blocked.',
        );
      }

      // 3. Check Subscription
      const existingSub = await tx.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.courseId, courseId),
          eq(subscriptions.isActive, true),
        ),
      });

      if (existingSub) {
        this.throwStructuredBadRequest(
          ERROR_CODES.CONFLICT,
          'You are already enrolled in this course',
        );
      }

      const paymentId =
        course.currentPrice === 0 ? 'free-enrollment' : 'direct-enrollment';

      // 4. Update Course Subscribers Count
      const [updatedCourse] = await tx
        .update(courses)
        .set({
          studentsCount: sql`${courses.studentsCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(courses.id, courseId))
        .returning();

      // 5. Create Subscription
      await tx.insert(subscriptions).values({
        userId,
        courseId,
        amount: course.currentPrice,
        status: 'active',
        isActive: true,
        paymentId,
      });

      return { course: updatedCourse, userId };
    });
  }

  async enrollFree(
    courseId: string,
    userId: string,
    meta: EnrollmentRequestMeta,
  ) {
    return await this.dbService.db.transaction(async (tx) => {
      const course = await tx.query.courses.findFirst({
        where: and(eq(courses.id, courseId), eq(courses.status, 'active')),
      });
      if (!course) {
        this.throwStructuredNotFound(
          ERROR_CODES.COURSE_NOT_FOUND,
          `The course you are trying to enroll in (ID: ${courseId}) could not be found or is no longer active.`,
          { courseId },
        );
      }

      const user = await tx.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        this.throwStructuredUnauthorized(
          ERROR_CODES.UNAUTHORIZED,
          'Your authentication session is not linked to an active user account.',
          { userId },
        );
      }

      if (user.isBlocked) {
        this.throwStructuredForbidden(
          ERROR_CODES.USER_BLOCKED,
          'Your account has been suspended. Please contact support.',
          { userId, status: 'blocked' },
        );
      }

      if (course.currentPrice > 0) {
        this.throwStructuredBadRequest(
          ERROR_CODES.BAD_REQUEST,
          'This course requires paid enrollment initialization',
        );
      }

      const existingSub = await tx.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.courseId, courseId),
          eq(subscriptions.isActive, true),
        ),
      });

      if (existingSub) {
        return {
          success: true,
          code: 'already_enrolled',
          message: 'You are already enrolled in this course',
          requestId: meta.requestId,
          data: {
            course: {
              id: course.id,
              studentsCount: course.studentsCount,
            },
            userId,
            nextAction: 'resume_learning',
          },
        };
      }

      const [updatedCourse] = await tx
        .update(courses)
        .set({
          studentsCount: sql`${courses.studentsCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(courses.id, courseId))
        .returning();

      await tx.insert(subscriptions).values({
        userId,
        courseId,
        amount: 0,
        status: 'active',
        isActive: true,
        paymentId: meta.idempotencyKey ?? 'free-enrollment',
      });

      return {
        success: true,
        code: 'enrollment_succeeded',
        message: 'Enrollment successful',
        requestId: meta.requestId,
        data: {
          course: {
            id: updatedCourse.id,
            studentsCount: updatedCourse.studentsCount,
          },
          userId,
          nextAction: 'resume_learning',
        },
      };
    });
  }

  async initPaidEnrollment(
    courseId: string,
    userId: string,
    meta: PaidInitMeta,
  ) {
    const course = await this.dbService.db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.status, 'active')),
    });

    if (!course) {
      this.throwStructuredNotFound(
        ERROR_CODES.COURSE_NOT_FOUND,
        `Course (ID: ${courseId}) not found for enrollment initialization.`,
      );
    }

    if (course.currentPrice <= 0) {
      this.throwStructuredBadRequest(
        ERROR_CODES.BAD_REQUEST,
        'Paid enrollment is not available for this course',
      );
    }

    const checkoutUrl =
      meta.returnUrl && meta.returnUrl.length > 0
        ? `${meta.returnUrl}${meta.returnUrl.includes('?') ? '&' : '?'}checkout=1&courseId=${course.id}`
        : `/checkout?courseId=${course.id}`;

    return {
      success: true,
      code: 'paid_enrollment_initialized',
      message: 'Paid enrollment initialized',
      requestId: meta.requestId,
      data: {
        courseId: course.id,
        userId,
        checkoutUrl,
        nextAction: 'checkout',
      },
    };
  }

  async initApplicationEnrollment(
    courseId: string,
    userId: string,
    meta: ApplicationInitMeta,
  ) {
    const course = await this.dbService.db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.status, 'active')),
    });

    if (!course) {
      this.throwStructuredNotFound(
        ERROR_CODES.COURSE_NOT_FOUND,
        `Course (ID: ${courseId}) not found for application initialization.`,
      );
    }

    if (!course.requiresForm) {
      this.throwStructuredBadRequest(
        ERROR_CODES.BAD_REQUEST,
        'This course does not require an application',
      );
    }

    return {
      success: true,
      code: 'application_enrollment_initialized',
      message: 'Application enrollment initialized',
      requestId: meta.requestId,
      data: {
        courseId: course.id,
        userId,
        applicationUrl: `/courses/${course.slug ?? course.id}?intent=enroll&flow=application`,
        nextAction: 'application',
        applicantSeed: meta.applicantSeed ?? null,
      },
    };
  }

  async checkSubscriptionStatus(courseId: string, userId: string) {
    const course = await this.dbService.db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    });

    if (!course) {
      this.throwStructuredNotFound(
        ERROR_CODES.COURSE_NOT_FOUND,
        'Course not found.',
      );
    }

    const user = await this.dbService.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user && user.isBlocked) {
      this.throwStructuredForbidden(
        ERROR_CODES.USER_BLOCKED,
        'User is blocked.',
      );
    }

    const sub = await this.dbService.db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.courseId, courseId),
        eq(subscriptions.isActive, true),
      ),
    });

    return {
      isSubscribed: !!sub,
      courseId,
      userId,
    };
  }
}
