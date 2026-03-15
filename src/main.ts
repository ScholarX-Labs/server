import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppException } from './common/exceptions';
import { ERROR_CODES } from './common/constants/error-codes.constant';
import { flattenValidationErrors } from './common/utils';
import { HttpStatus } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Hand off NestJS internal logs to pino
  app.useLogger(app.get(Logger));

  // Global validation pipe — whitelist + transform + custom exceptionFactory
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new AppException(
          ERROR_CODES.VALIDATION_ERROR,
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Validation failed',
          flattenValidationErrors(errors),
        ),
    }),
  );

  // Using 3001 to prevent conflicts with the Next.js frontend or existing API
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
