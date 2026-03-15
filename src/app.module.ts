import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoursesModule } from './courses/courses.module';
import { DbModule } from './db/db.module';
import { getPinoConfig } from './common/config/logger.config';
import { GlobalExceptionFilter } from './common/filters';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    LoggerModule.forRootAsync({ useFactory: getPinoConfig }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60000, // 1 minute default TTL
    }),
    DbModule,
    CoursesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
