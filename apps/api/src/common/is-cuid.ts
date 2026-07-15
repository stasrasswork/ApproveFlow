import {
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  Validate,
} from 'class-validator';

/** Prisma default `cuid()` — 25 chars starting with "c". */
export const CUID_PATTERN = /^c[a-z0-9]{24}$/i;

@ValidatorConstraint({ name: 'isCuid', async: false })
export class IsCuidConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && CUID_PATTERN.test(value);
  }

  defaultMessage(): string {
    return 'must be a valid id';
  }
}

export function IsCuid(validationOptions?: ValidationOptions) {
  return Validate(IsCuidConstraint, validationOptions);
}
