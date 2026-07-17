import { SetMetadata } from '@nestjs/common';

export type AuthMode = 'jwt' | 'jwt-or-visitor';

export const AUTH_MODE_KEY = 'authMode';

export const Auth = (mode: AuthMode) => SetMetadata(AUTH_MODE_KEY, mode);
