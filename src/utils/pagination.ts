/**
 * Utility functions for handling pagination
 */

import { query as dbQuery } from '../db';

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

/**
 * Parse and validate pagination parameters from query string
 *
 * @param query - Request query object
 * @param defaults - Default values for pagination
 * @returns Validated pagination parameters
 *
 * @example
 * const params = parsePaginationParams(req.query, { page: 1, limit: 20 });
 */
export const parsePaginationParams = (
  query: Record<string, unknown>,
  defaults: Partial<PaginationParams> = {}
): PaginationParams => {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 20;
  const defaultSortBy = defaults.sortBy ?? 'created_at';
  const defaultOrder = defaults.order ?? 'desc';

  const page = Math.max(1, parseInt(String(query.page || defaultPage), 10) || defaultPage);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(query.limit || defaultLimit), 10) || defaultLimit)
  );

  const sortBy = (query.sortBy as string) || defaultSortBy;
  const order = (query.order as 'asc' | 'desc') || defaultOrder;

  return { page, limit, sortBy, order };
};

/**
 * Calculate offset for SQL LIMIT/OFFSET pagination
 *
 * @param page - Current page (1-indexed)
 * @param limit - Items per page
 * @returns Offset value for SQL query
 */
export const calculateOffset = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

/**
 * Build pagination metadata from total count
 *
 * @param total - Total number of items
 * @param page - Current page
 * @param limit - Items per page
 * @returns Pagination metadata
 */
export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => {
  return {
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
  };
};

/**
 * Build a complete paginated response
 *
 * @param data - Array of items for current page
 * @param total - Total number of items
 * @param page - Current page
 * @param limit - Items per page
 * @returns Complete paginated response
 *
 * @example
 * const response = buildPaginatedResponse(projects, totalCount, page, limit);
 * res.json({ success: true, ...response });
 */
export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> => {
  return {
    data,
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
  };
};

/**
 * Get total count for a table with optional WHERE clause
 *
 * @param table - Table name
 * @param whereClause - Optional WHERE clause (without WHERE keyword)
 * @param whereParams - Parameters for WHERE clause
 * @returns Total count
 *
 * @example
 * const total = await getTotalCount('projects', 'user_id = $1', [userId]);
 */
export const getTotalCount = async (
  table: string,
  whereClause?: string,
  whereParams?: unknown[]
): Promise<number> => {
  const whereSQL = whereClause ? `WHERE ${whereClause}` : '';
  const countQuery = `SELECT COUNT(*) FROM ${table} ${whereSQL}`;

  const result = await dbQuery<{ count: string }>(countQuery, whereParams || []);
  return parseInt(result.rows[0].count, 10);
};

/**
 * Execute a paginated query with count
 * This is a convenience function that handles both the count and data query
 *
 * @param dataQuery - SQL query for fetching data (should include LIMIT and OFFSET)
 * @param dataParams - Parameters for data query
 * @param countQuery - SQL query for counting total (SELECT COUNT(*) FROM ...)
 * @param countParams - Parameters for count query
 * @param page - Current page
 * @param limit - Items per page
 * @returns Paginated response with data and metadata
 *
 * @example
 * const result = await executePaginatedQuery<Project>(
 *   'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
 *   [userId, limit, offset],
 *   'SELECT COUNT(*) FROM projects WHERE user_id = $1',
 *   [userId],
 *   page,
 *   limit
 * );
 */
export const executePaginatedQuery = async <T>(
  dataQuery: string,
  dataParams: unknown[],
  countQuery: string,
  countParams: unknown[],
  page: number,
  limit: number
): Promise<PaginatedResponse<T>> => {
  // Execute both queries in parallel for better performance
  const [dataResult, countResult] = await Promise.all([
    dbQuery<T>(dataQuery, dataParams),
    dbQuery<{ count: string }>(countQuery, countParams),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);

  return buildPaginatedResponse<T>(dataResult.rows, total, page, limit);
};
