import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip global JWT guard (health, auth login/register, etc.). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
