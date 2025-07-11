import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // For now, return empty data
  // Server-side auth will be implemented when Firebase Admin SDK is set up
  return {};
};