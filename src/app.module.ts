import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoursesModule } from './courses/courses.module';
import { DbModule } from './db/db.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60000, // 1 minute default TTL
    }),
    DbModule,
    CoursesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
