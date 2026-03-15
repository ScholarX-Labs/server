import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  public db: NodePgDatabase<typeof schema>;
  private pool: Pool;

  constructor(
    @InjectPinoLogger(DbService.name)
    private readonly logger: PinoLogger,
  ) {
    this.pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgres://postgres:postgres@localhost:5432/scholarx',
    });

    // Add error listener to pool to catch background connection errors
    this.pool.on('error', (err) => {
      this.logger.error({ err }, `Unexpected error on idle client: ${err.message}`);
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleInit() {
    try {
      // Test the database connection on startup
      await this.pool.query('SELECT 1');
      this.logger.info('Successfully connected to the PostgreSQL database.');
    } catch (error) {
      this.logger.warn({ err: error }, `Failed to connect to the database on startup: ${(error as Error).message}. Ensure PostgreSQL is running.`);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
