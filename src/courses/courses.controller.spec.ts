import { Test, TestingModule } from '@nestjs/testing';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('CoursesController', () => {
  let controller: CoursesController;
  const coursesService = {
    getCourseBySlug: jest.fn(),
    enrollFree: jest.fn(),
    initPaidEnrollment: jest.fn(),
    initApplicationEnrollment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        {
          provide: CoursesService,
          useValue: coursesService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates slug lookup to service', async () => {
    coursesService.getCourseBySlug.mockResolvedValue({ id: 'c1' });

    await controller.findBySlug('slug-1', 'user-1');

    expect(coursesService.getCourseBySlug).toHaveBeenCalledWith(
      'slug-1',
      'user-1',
    );
  });

  it('forwards request id on enroll free endpoint', async () => {
    const req = { headers: { 'x-request-id': 'req-1' } } as any;
    coursesService.enrollFree.mockResolvedValue({ success: true });

    await controller.enrollFree(
      '2b08f7f9-cd0c-4cc9-b4e9-fb8f4ecbe412',
      'user-1',
      { idempotencyKey: 'idem-1', sourceSurface: 'course_card' },
      req,
    );

    expect(coursesService.enrollFree).toHaveBeenCalledWith(
      '2b08f7f9-cd0c-4cc9-b4e9-fb8f4ecbe412',
      'user-1',
      expect.objectContaining({ requestId: 'req-1', idempotencyKey: 'idem-1' }),
    );
  });

  it('delegates paid/application init endpoints to service', async () => {
    const req = { headers: { 'x-request-id': 'req-2' } } as any;
    coursesService.initPaidEnrollment.mockResolvedValue({ success: true });
    coursesService.initApplicationEnrollment.mockResolvedValue({
      success: true,
    });

    await controller.initPaidEnrollment(
      '2b08f7f9-cd0c-4cc9-b4e9-fb8f4ecbe412',
      'user-1',
      {
        idempotencyKey: 'idem-2',
        sourceSurface: 'course_card',
        returnUrl: 'https://example.com',
      },
      req,
    );
    await controller.initApplicationEnrollment(
      '2b08f7f9-cd0c-4cc9-b4e9-fb8f4ecbe412',
      'user-1',
      { idempotencyKey: 'idem-3', sourceSurface: 'course_card' },
      req,
    );

    expect(coursesService.initPaidEnrollment).toHaveBeenCalled();
    expect(coursesService.initApplicationEnrollment).toHaveBeenCalled();
  });
});
