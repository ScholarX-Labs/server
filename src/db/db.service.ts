import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  public db: NodePgDatabase<typeof schema>;
  private pool: Pool;
  private readonly logger = new Logger(DbService.name);

  constructor() {
    this.pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgres://postgres:postgres@localhost:5432/scholarx',
    });
    
    // Add error listener to pool to catch background connection errors
    this.pool.on('error', (err) => {
      this.logger.error(`Unexpected error on idle client: ${err.message}`, err.stack);
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleInit() {
    try {
      // Test the database connection on startup
      await this.pool.query('SELECT 1');
      this.logger.log('Successfully connected to the PostgreSQL database.');
    } catch (error) {
      this.logger.warn(`Failed to connect to the database on startup: ${(error as Error).message}. Ensure PostgreSQL is running.`);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
