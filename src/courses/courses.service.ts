import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { courses, subscriptions, users } from '../db/schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  CoursePaginationQueryDto,
  SearchCourseDto,
} from './dto/pagination-query.dto';
import { and, eq, ilike, count, sql } from 'drizzle-orm';

@Injectable()
export class CoursesService {
  constructor(private readonly dbService: DbService) {}

  private parsePagination(page?: number, limit?: number) {
    const p = Math.max(page || 1, 1);
    const l = Math.max(limit || 3, 1);
    const offset = (p - 1) * l;
    return { page: p, limit: l, offset };
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

    return {
      items: itemsWithSubscription,
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
      throw new BadRequestException('Search title is required');
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
    });

    return {
      items,
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
    });

    if (!course) {
      throw new NotFoundException('Course not found');
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

    return { ...course, isSubscribed };
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
      throw new NotFoundException('Course not found');
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
      throw new NotFoundException('Course not found');
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
        throw new NotFoundException('Course not found');
      }

      // 2. Check User (Assuming users table exists and mapped)
      const user = await tx.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.isBlocked) {
        throw new ForbiddenException('User is blocked');
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
        throw new BadRequestException(
          'You are already enrolled in this course',
        );
      }

      const paymentId =
        course.currentPrice === 0 ? 'free-enrollment' : 'direct-enrollment';

      // 4. Update Course Subscribers Count
      const [updatedCourse] = await tx
        .update(courses)
        .set({
          subscriberCount: sql`${courses.subscriberCount} + 1`,
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

  async checkSubscriptionStatus(courseId: string, userId: string) {
    const course = await this.dbService.db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const user = await this.dbService.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user && user.isBlocked) {
      throw new ForbiddenException('User is blocked');
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
