// src/routes/[...slug]/+page.js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export function load() {
  // Always throw a 404 error for any unmatched routes
  error(404, 'Page not found');
}