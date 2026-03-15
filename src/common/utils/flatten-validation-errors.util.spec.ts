import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './flatten-validation-errors.util';

function makeError(
  property: string,
  constraints: Record<string, string>,
  children?: ValidationError[],
): ValidationError {
  const e = new ValidationError();
  e.property = property;
  e.constraints = Object.keys(constraints).length ? constraints : undefined;
  e.children = children ?? [];
  return e;
}

describe('flattenValidationErrors', () => {
  it('returns empty array for empty input', () => {
    expect(flattenValidationErrors([])).toEqual([]);
  });

  it('maps a single top-level error with constraints', () => {
    const error = makeError('email', { isEmail: 'email must be an email' });
    const result = flattenValidationErrors([error]);
    expect(result).toEqual([
      { field: 'email', constraints: { isEmail: 'email must be an email' } },
    ]);
  });

  it('maps multiple top-level errors', () => {
    const errors = [
      makeError('email', { isEmail: 'must be email' }),
      makeError('age', { isInt: 'must be int' }),
    ];
    const result = flattenValidationErrors(errors);
    expect(result).toHaveLength(2);
    expect(result[0].field).toBe('email');
    expect(result[1].field).toBe('age');
  });

  it('flattens one level of children', () => {
    const child = makeError('title', { isString: 'must be string' });
    const parent = makeError('lesson', {}, [child]);
    const result = flattenValidationErrors([parent]);
    expect(result).toEqual([
      { field: 'lesson.title', constraints: { isString: 'must be string' } },
    ]);
  });

  it('flattens deeply nested children', () => {
    const deep = makeError('value', { isNumber: 'must be number' });
    const mid = makeError('0', {}, [deep]);
    const parent = makeError('lessons', {}, [mid]);
    const result = flattenValidationErrors([parent]);
    expect(result).toEqual([
      { field: 'lessons.0.value', constraints: { isNumber: 'must be number' } },
    ]);
  });

  it('emits parent constraint AND recurses into children when both present', () => {
    const child = makeError('sub', { isString: 'must be string' });
    const parent = makeError('obj', { isObject: 'must be object' }, [child]);
    const result = flattenValidationErrors([parent]);
    expect(result).toHaveLength(2);
    expect(result[0].field).toBe('obj');
    expect(result[1].field).toBe('obj.sub');
  });

  it('silently skips entries with no constraints and no children', () => {
    const empty = makeError('ghost', {});
    // class-validator leaves constraints as undefined when empty
    empty.constraints = undefined;
    empty.children = [];
    const result = flattenValidationErrors([empty]);
    expect(result).toEqual([]);
  });

  it('does not include value field in output (security)', () => {
    const error = makeError('password', { isString: 'must be string' });
    (error as ValidationError & { value?: string }).value = 'secret';
    const result = flattenValidationErrors([error]);
    expect(result[0]).not.toHaveProperty('value');
  });

  it('handles an array of items with mixed errors', () => {
    const item0 = makeError('0', {}, [makeError('name', { isString: 'must be string' })]);
    const item1 = makeError('1', {}, [makeError('age', { isInt: 'must be int' })]);
    const parent = makeError('items', {}, [item0, item1]);
    const result = flattenValidationErrors([parent]);
    expect(result).toHaveLength(2);
    expect(result[0].field).toBe('items.0.name');
    expect(result[1].field).toBe('items.1.age');
  });
});
