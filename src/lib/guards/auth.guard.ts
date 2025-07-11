// src/lib/guards/auth.guard.ts
import { redirect } from '@sveltejs/kit';
import type { User } from '$lib/types/auth';

export function requireAuth(user: User | null | undefined, url: URL) {
  if (!user) {
    throw redirect(303, `/?redirect=${encodeURIComponent(url.pathname)}`);
  }
  return user;
}

export function requireRole(user: User | null | undefined, roles: string[], url: URL) {
  const authedUser = requireAuth(user, url);
  
  if (!roles.includes(authedUser.role || '')) {
    throw redirect(303, '/unauthorized');
  }
  
  return authedUser;
}

export function requireTenant(user: User | null | undefined, url: URL) {
  const authedUser = requireAuth(user, url);
  
  if (!authedUser.tenantId) {
    throw redirect(303, '/select-business');
  }
  
  return authedUser;
}

// Check if user can access admin routes
export function requireAdmin(user: User | null | undefined, url: URL) {
  return requireRole(user, ['owner', 'admin'], url);
}

// Check if user can manage team
export function requireManager(user: User | null | undefined, url: URL) {
  return requireRole(user, ['owner', 'admin', 'manager'], url);
}