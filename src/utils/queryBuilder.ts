/**
 * Utility functions for building dynamic SQL queries
 */

export interface UpdateQueryResult {
  query: string;
  params: unknown[];
}

/**
 * Build a dynamic UPDATE query from a partial object
 * Only includes fields that are defined (not undefined)
 *
 * @param table - Table name
 * @param updates - Object with fields to update (undefined values are ignored)
 * @param whereClause - WHERE clause (without the WHERE keyword, e.g., "id = $1")
 * @param whereParams - Parameters for the WHERE clause
 * @returns Object with the full query string and parameter array
 *
 * @example
 * const { query, params } = buildUpdateQuery(
 *   'projects',
 *   { name: 'New Name', description: undefined, is_public: true },
 *   'id = $1 AND user_id = $2',
 *   ['project-id', 'user-id']
 * );
 * // Returns:
 * // {
 * //   query: "UPDATE projects SET name = $3, is_public = $4, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
 * //   params: ['project-id', 'user-id', 'New Name', true]
 * // }
 */
export const buildUpdateQuery = <T = unknown>(
  table: string,
  updates: Record<string, unknown>,
  whereClause: string,
  whereParams: unknown[]
): UpdateQueryResult => {
  const updateFields: string[] = [];
  const values: unknown[] = [...whereParams];
  let paramIndex = whereParams.length + 1;

  // Build SET clause for defined fields only
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      updateFields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (updateFields.length === 0) {
    throw new Error('No fields to update');
  }

  // Always update the updated_at timestamp
  updateFields.push('updated_at = NOW()');

  const queryString = `UPDATE ${table}
   SET ${updateFields.join(', ')}
   WHERE ${whereClause}
   RETURNING *`;

  return {
    query: queryString,
    params: values,
  };
};

/**
 * Convert camelCase to snake_case for database columns
 */
export const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * Convert an object's keys from camelCase to snake_case
 */
export const keysToSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
};

/**
 * Build a dynamic INSERT query
 *
 * @param table - Table name
 * @param data - Object with fields to insert
 * @returns Object with the full query string and parameter array
 *
 * @example
 * const { query, params } = buildInsertQuery('projects', {
 *   name: 'My Project',
 *   user_id: 'user-123',
 *   is_public: false
 * });
 * // Returns:
 * // {
 * //   query: "INSERT INTO projects (name, user_id, is_public) VALUES ($1, $2, $3) RETURNING *",
 * //   params: ['My Project', 'user-123', false]
 * // }
 */
export const buildInsertQuery = (
  table: string,
  data: Record<string, unknown>
): UpdateQueryResult => {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      columns.push(key);
      placeholders.push(`$${paramIndex++}`);
      values.push(value);
    }
  }

  if (columns.length === 0) {
    throw new Error('No fields to insert');
  }

  const queryString = `INSERT INTO ${table} (${columns.join(', ')})
   VALUES (${placeholders.join(', ')})
   RETURNING *`;

  return {
    query: queryString,
    params: values,
  };
};

/**
 * Sanitize and validate column names for ORDER BY clauses
 * This prevents SQL injection in dynamic sorting
 *
 * @param column - Column name to validate
 * @param allowedColumns - Array of allowed column names
 * @param defaultColumn - Default column if validation fails
 * @returns Validated column name
 */
export const sanitizeSortColumn = (
  column: string,
  allowedColumns: string[],
  defaultColumn: string
): string => {
  if (!column || !allowedColumns.includes(column)) {
    return defaultColumn;
  }
  return column;
};

/**
 * Validate and sanitize sort direction
 *
 * @param direction - Sort direction ('asc' or 'desc')
 * @param defaultDirection - Default direction if validation fails
 * @returns Validated direction ('ASC' or 'DESC')
 */
export const sanitizeSortDirection = (
  direction: string,
  defaultDirection: 'ASC' | 'DESC' = 'DESC'
): 'ASC' | 'DESC' => {
  const normalized = direction?.toUpperCase();
  if (normalized !== 'ASC' && normalized !== 'DESC') {
    return defaultDirection;
  }
  return normalized as 'ASC' | 'DESC';
};
