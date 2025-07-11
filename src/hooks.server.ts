// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  
  // Handle old job URLs redirect
  if (pathname.includes('/jobs')) {
    let newPath = pathname;
    
    // Replace /jobs with /tasks
    newPath = newPath.replace('/jobs', '/tasks');
    
    // Replace [jobId] with [taskId] if present
    newPath = newPath.replace('/jobId]', '/taskId]');
    
    // Handle specific patterns
    if (pathname.match(/\/clients\/[^\/]+\/jobs\/new/)) {
      const match = pathname.match(/\/clients\/([^\/]+)\/jobs\/new/);
      if (match && match[1]) {
        newPath = `/tasks/new?client=${match[1]}`;
      }
    } else if (pathname.match(/\/clients\/[^\/]+\/jobs\/[^\/]+/)) {
      const match = pathname.match(/\/clients\/[^\/]+\/jobs\/([^\/]+)/);
      if (match && match[1]) {
        newPath = `/tasks/${match[1]}`;
      }
    }
    
    // Perform redirect
    return Response.redirect(`${event.url.origin}${newPath}`, 301);
  }
  
  // For now, let client-side handle authentication
  // Server-side auth will be implemented when Firebase Admin SDK is set up
  
  return resolve(event);
};