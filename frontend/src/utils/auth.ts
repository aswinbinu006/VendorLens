import type { User } from '@/types/api';

/**
 * Validates if the authenticated user is the platform Super-Admin.
 * Prefers the explicit `isSuperAdmin` boolean flag returned by the backend,
 * falling back dynamically to VITE_ADMIN_EMAIL or the default admin email.
 */
export function isSuperAdminUser(user?: Partial<User> | null): boolean {
  if (!user) return false;
  if (typeof user.isSuperAdmin === 'boolean') {
    return user.isSuperAdmin;
  }
  const envObj = (import.meta as unknown as { env?: Record<string, string> }).env;
  const configuredAdmin = (envObj?.VITE_ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
  return (user.email || '').toLowerCase().trim() === configuredAdmin;
}
