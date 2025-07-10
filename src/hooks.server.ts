// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Redirect old job URLs to new task URLs
  const { pathname } = event.url;
  
  // Handle various job URL patterns
  if (pathname.includes('/jobs')) {
    let newPath = pathname;
    
    // Replace /jobs with /tasks
    newPath = newPath.replace('/jobs', '/tasks');
    
    // Replace [jobId] with [taskId] if present
    newPath = newPath.replace('/jobId]', '/taskId]');
    
    // Handle specific patterns
    if (pathname.match(/\/clients\/[^\/]+\/jobs\/new/)) {
      // Extract client ID and redirect to new task creation with client param
      const match = pathname.match(/\/clients\/([^\/]+)\/jobs\/new/);
      if (match && match[1]) {
        newPath = `/tasks/new?client=${match[1]}`;
      }
    } else if (pathname.match(/\/clients\/[^\/]+\/jobs\/[^\/]+/)) {
      // Extract task ID from client job detail page
      const match = pathname.match(/\/clients\/[^\/]+\/jobs\/([^\/]+)/);
      if (match && match[1]) {
        newPath = `/tasks/${match[1]}`;
      }
    }
    
    // Perform redirect
    return Response.redirect(`${event.url.origin}${newPath}`, 301);
  }
  
  return resolve(event);
};