import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/guards/auth.guard';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // For now, just return empty data since we don't have server-side auth
  // When Firebase Admin is set up, uncomment:
  // const user = requireRole(locals.user, ['owner', 'admin', 'manager'], url);
  
  return {
    // user,
    canManageTeam: true
  };
};