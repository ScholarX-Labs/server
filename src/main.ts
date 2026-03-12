import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Using 3001 to prevent conflicts with the Next.js frontend or existing API
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
