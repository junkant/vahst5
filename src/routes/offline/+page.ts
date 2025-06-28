// src/routes/offline/+page.ts

// This ensures the offline page is pre-rendered at build time
// and available in the service worker cache
export const prerender = true;

// Ensure server-side rendering is enabled
export const ssr = true;

// Disable client-side router for this page
// This helps when navigating to offline page from service worker
export const csr = true;