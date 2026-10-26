import { fail } from './errors';

/**
 * Validates string arguments with length bounds
 */
export function assertString(
  val: any,
  fieldName: string,
  minLength = 1,
  maxLength = 1000
): string {
  if (typeof val !== 'string') {
    fail('invalid-argument', `Field '${fieldName}' must be a string.`);
  }
  const trimmed = val.trim();
  if (trimmed.length < minLength) {
    fail('invalid-argument', `Field '${fieldName}' must be at least ${minLength} characters.`);
  }
  if (trimmed.length > maxLength) {
    fail('invalid-argument', `Field '${fieldName}' cannot exceed ${maxLength} characters.`);
  }
  return trimmed;
}

/**
 * Validates enum / union string arguments
 */
export function assertEnum<T extends string>(
  val: any,
  fieldName: string,
  allowedValues: readonly T[]
): T {
  if (!allowedValues.includes(val)) {
    fail(
      'invalid-argument',
      `Field '${fieldName}' must be one of: [${allowedValues.join(', ')}]. Received: '${val}'`
    );
  }
  return val as T;
}

/**
 * Validates positive integer arguments
 */
export function assertPositiveInt(
  val: any,
  fieldName: string,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
): number {
  const num = Number(val);
  if (!Number.isInteger(num) || num < min || num > max) {
    fail(
      'invalid-argument',
      `Field '${fieldName}' must be an integer between ${min} and ${max}.`
    );
  }
  return num;
}
