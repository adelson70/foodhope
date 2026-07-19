import { SetMetadata } from '@nestjs/common';

import type { RoleOperador } from '../../../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: RoleOperador[]) =>
  SetMetadata(ROLES_KEY, roles);
