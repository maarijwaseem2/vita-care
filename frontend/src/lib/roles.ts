import type { UserRole } from './types';

/** Each role's dashboard. Used for login redirects, the navbar and page guards. */
export function homeFor(role?: UserRole | null): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'doctor':
      return '/profile/doctor';
    case 'nurse':
      return '/profile/nurse';
    case 'patient':
      return '/profile/patient';
    default:
      return '/login';
  }
}
