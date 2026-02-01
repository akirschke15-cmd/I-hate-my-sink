/**
 * Utility for building database update objects from partial input data.
 * Consolidates duplicate update field mapping code across routers.
 */

/**
 * Builds a database update object from partial input data.
 * Filters out undefined values and applies optional transformations.
 *
 * @example
 * // Simple usage without transformations
 * const updateData = buildUpdateData({ name: 'New Name', email: 'test@example.com' });
 * // Result: { updatedAt: Date, name: 'New Name', email: 'test@example.com' }
 *
 * @example
 * // With field transformers (e.g., converting numbers to strings for decimal columns)
 * const updateData = buildUpdateData(
 *   { width: 24.5, height: 36, name: 'Cabinet' },
 *   {
 *     transformers: {
 *       width: (val) => val.toString(),
 *       height: (val) => val.toString(),
 *     }
 *   }
 * );
 * // Result: { updatedAt: Date, width: '24.5', height: '36', name: 'Cabinet' }
 *
 * @example
 * // With syncedAt timestamp for offline sync
 * const updateData = buildUpdateData(
 *   { field1: 'value' },
 *   { includeSyncedAt: true }
 * );
 * // Result: { updatedAt: Date, syncedAt: Date, field1: 'value' }
 *
 * @param updateData - Partial object containing fields to update
 * @param options - Configuration options
 * @param options.transformers - Optional map of field names to transformer functions
 * @param options.includeTimestamps - Whether to include updatedAt timestamp (default: true)
 * @param options.includeSyncedAt - Whether to include syncedAt timestamp for offline sync (default: false)
 * @returns Update object with filtered and transformed values
 */
export function buildUpdateData<T extends Record<string, unknown>>(
  updateData: Partial<T>,
  options: {
    transformers?: { [K in keyof T]?: (value: NonNullable<T[K]>) => unknown };
    includeTimestamps?: boolean;
    includeSyncedAt?: boolean;
  } = {}
): Record<string, unknown> {
  const { transformers = {}, includeTimestamps = true, includeSyncedAt = false } = options;

  const result: Record<string, unknown> = {};

  // Add timestamps
  if (includeTimestamps) {
    result.updatedAt = new Date();
  }
  if (includeSyncedAt) {
    result.syncedAt = new Date();
  }

  // Process each field in the update data
  for (const [key, value] of Object.entries(updateData)) {
    if (value !== undefined) {
      const transformer = key in transformers
        ? (transformers as Record<string, ((v: unknown) => unknown) | undefined>)[key]
        : undefined;
      result[key] = transformer ? transformer(value) : value;
    }
  }

  return result;
}

/**
 * Helper to create a transformer that converts numbers to strings.
 * Useful for decimal fields stored as strings in the database.
 */
export const toStringTransformer = (value: number): string => value.toString();

/**
 * Helper to create transformers for multiple fields that need string conversion.
 *
 * @example
 * const transformers = createStringTransformers(['width', 'height', 'depth']);
 * // Equivalent to: { width: toStringTransformer, height: toStringTransformer, depth: toStringTransformer }
 */
export function createStringTransformers<T extends Record<string, unknown>>(
  fields: (keyof T)[]
): { [K in keyof T]?: (value: number) => string } {
  const transformers: { [K in keyof T]?: (value: number) => string } = {};
  for (const field of fields) {
    transformers[field] = toStringTransformer;
  }
  return transformers;
}
