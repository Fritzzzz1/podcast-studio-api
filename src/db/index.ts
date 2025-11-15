import { Pool, QueryResult } from 'pg';
import config from '../config';
import logger from '../utils/logger';

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.debug('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
  process.exit(-1);
});

export const query = async <T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug(`Executed query in ${duration}ms: ${text}`);
    return result;
  } catch (error) {
    logger.error(`Query error: ${text}`, error);
    throw error;
  }
};

export const getClient = () => pool.connect();

export default pool;
