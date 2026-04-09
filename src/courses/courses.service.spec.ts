import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { DbService } from '../db/db.service';
import { BadRequestException } from '@nestjs/common';

describe('CoursesService', () => {
  let service: CoursesService;
  const mockDbService = {
    db: {
      transaction: jest.fn(),
      query: {
        courses: { findFirst: jest.fn() },
        subscriptions: { findFirst: jest.fn() },
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: DbService,
          useValue: mockDbService,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns already_enrolled response without mutating counters', async () => {
    const tx = {
      query: {
        courses: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'course-1',
            status: 'active',
            currentPrice: 0,
            studentsCount: 12,
          }),
        },
        users: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'user-1', isBlocked: false }),
        },
        subscriptions: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'sub-1', isActive: true }),
        },
      },
      update: jest.fn(),
      insert: jest.fn(),
    };
    mockDbService.db.transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await service.enrollFree('course-1', 'user-1', {
      requestId: 'req-1',
      idempotencyKey: 'idem-1',
      sourceSurface: 'course_card',
    });

    expect(result.success).toBe(true);
    expect(result.code).toBe('already_enrolled');
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('throws payment_unavailable when free endpoint is used for paid course', async () => {
    const tx = {
      query: {
        courses: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'course-2',
            status: 'active',
            currentPrice: 100,
            studentsCount: 20,
          }),
        },
        users: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'user-1', isBlocked: false }),
        },
        subscriptions: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      },
      update: jest.fn(),
      insert: jest.fn(),
    };
    mockDbService.db.transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await expect(
      service.enrollFree('course-2', 'user-1', {
        requestId: 'req-2',
        sourceSurface: 'course_card',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });
});
