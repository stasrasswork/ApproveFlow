import { ConflictException } from '@nestjs/common';

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

export function rethrowUniqueAsConflict(
  error: unknown,
  message: string,
): never {
  if (isUniqueConstraintError(error)) {
    throw new ConflictException(message);
  }

  throw error;
}
