# Migration Plan: Jobs to Tasks

## Completed:
1. ✅ Renamed component folders and files:
   - `/lib/components/job/` → `/lib/components/task/`
   - `JobCard.svelte` → `TaskCard.svelte`
   - `JobDetail.svelte` → `TaskDetail.svelte`
   - `JobList.svelte` → `TaskList.svelte`
   - `ClientJobs.svelte` → `ClientTasks.svelte`

2. ✅ Renamed route folders:
   - `/routes/(app)/clients/[id]/jobs/` → `/routes/(app)/clients/[id]/tasks/`
   - `/routes/(app)/clients/[id]/jobs/[jobId]/` → `/routes/(app)/clients/[id]/tasks/[taskId]/`

3. ✅ Created new task routes:
   - `/routes/(app)/tasks/new/`
   - `/routes/(app)/tasks/[id]/`

4. ✅ Updated TaskCard.svelte imports and references

## TODO:
1. Update remaining component files to use Task types and imports
2. Update route files to use Task types and correct paths
3. Create redirect handlers for old URLs
4. Update all goto() calls throughout the app
5. Remove old jobs.svelte.ts store file
6. Update any remaining imports

## Import Updates Needed:

### Component Imports:
- `import JobCard from '$lib/components/job/JobCard.svelte'` → `import TaskCard from '$lib/components/task/TaskCard.svelte'`
- `import JobDetail from '$lib/components/job/JobDetail.svelte'` → `import TaskDetail from '$lib/components/task/TaskDetail.svelte'`
- `import JobList from '$lib/components/job/JobList.svelte'` → `import TaskList from '$lib/components/task/TaskList.svelte'`
- `import ClientJobs from '$lib/components/client/ClientJobs.svelte'` → `import ClientTasks from '$lib/components/client/ClientTasks.svelte'`

### Type Imports:
- `import type { Job } from '$lib/types/job'` → `import type { Task } from '$lib/types/task'`
- `import { useJobs } from '$lib/stores/jobs.svelte'` → `import { useTasks } from '$lib/stores/tasks.svelte'`

### Route Updates:
- `/clients/[id]/jobs/new` → `/tasks/new?client=[id]`
- `/clients/[id]/jobs/[jobId]` → `/tasks/[taskId]`
- `/jobs` → `/tasks`

## URL Redirect Strategy:

Add to `hooks.server.ts`:
```typescript
export const handle: Handle = async ({ event, resolve }) => {
  // Redirect old job URLs to new task URLs
  if (event.url.pathname.includes('/jobs')) {
    const newPath = event.url.pathname.replace('/jobs', '/tasks').replace('/jobId', '/taskId');
    return Response.redirect(`${event.url.origin}${newPath}`, 301);
  }
  
  return resolve(event);
};
```