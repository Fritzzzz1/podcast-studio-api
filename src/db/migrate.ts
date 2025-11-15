import fs from 'fs';
import path from 'path';
import pool from './index';
import logger from '../utils/logger';

const runMigrations = async () => {
  try {
    logger.info('Starting database migrations...');

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    logger.info(`Found ${files.length} migration files`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      logger.info(`Running migration: ${file}`);
      await pool.query(sql);
      logger.info(`✓ Completed: ${file}`);
    }

    logger.info('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();
