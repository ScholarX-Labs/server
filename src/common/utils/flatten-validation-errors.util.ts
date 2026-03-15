import type { ValidationError } from 'class-validator';
import type { ValidationErrorDetail } from '../interfaces';

/**
 * flattenValidationErrors
 *
 * Recursively traverses the class-validator ValidationError tree and produces
 * a flat array of ValidationErrorDetail objects with dot-notation field paths.
 *
 * WHY THIS IS NECESSARY:
 * class-validator errors are a recursive tree. For nested payloads (e.g. an
 * array of lesson objects validated with @ValidateNested), the top-level
 * ValidationError has `constraints: undefined` — the actual violations are
 * buried inside `.children[]`. A flat .map() silently drops all nested errors.
 *
 * SECURITY:
 * `error.value` is intentionally never included in the output. Reflecting user
 * input (including passwords, tokens, raw PII) back in error responses is a
 * data leakage risk.
 *
 * EXAMPLES:
 *   Flat:   title → { field: 'title', constraints: { isNotEmpty: '...' } }
 *   Nested: lessons[0].title → { field: 'lessons.0.title', constraints: {...} }
 *   Deep:   instructor.bio.summary → { field: 'instructor.bio.summary', ... }
 */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath?: string,
): ValidationErrorDetail[] {
  const result: ValidationErrorDetail[] = [];

  for (const error of errors) {
    const currentPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    // Leaf node: has its own constraints — push them
    if (error.constraints && Object.keys(error.constraints).length > 0) {
      result.push({
        field: currentPath,
        constraints: error.constraints,
        // `value` is intentionally excluded — never reflect user input
      });
    }

    // Branch node (or both): recurse into children
    if (error.children && error.children.length > 0) {
      const nested = flattenValidationErrors(error.children, currentPath);
      result.push(...nested);
    }

    // Neither constraints nor children: malformed validator output — skip silently
  }

  return result;
}
