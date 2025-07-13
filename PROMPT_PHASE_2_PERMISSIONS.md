# Prompt: Complete Permission System Implementation - Phase 2

## Context

I need help completing the implementation of a feature-flag based permission system for Vahst V5, a SvelteKit field service management application. The core permission system has been built but needs to be integrated throughout the application.

## Current State

### Already Implemented:
1. **Core Permission System** (✅ COMPLETE)
   - `PermissionManager` class with caching at `/src/lib/permissions/index.ts`
   - `FeatureFlagStore` at `/src/lib/stores/featureFlags.svelte.ts`
   - `PermissionGate` component at `/src/lib/components/permissions/PermissionGate.svelte`
   - Permission context system at `/src/lib/permissions/context.ts`
   - Default permissions configuration at `/src/lib/permissions/defaults.ts`
   - Firebase security rules updated in `/firestore.rules`

2. **Partially Implemented** (⚠️ NEEDS WORK)
   - Settings page for managing permissions at `/src/routes/(app)/settings/permissions/+page.svelte`
   - Only 2 components updated: `NewClientForm.svelte` and team management page
   - Basic documentation in `/docs/PERMISSIONS.md`

3. **Architecture Details**:
   - Using Svelte 5 with runes (`$state`, `$derived`, `$effect`)
   - Multi-tenant system with roles: owner, manager, team_member, client
   - Offline-first with IndexedDB caching
   - Firebase Firestore for persistence

## What Needs to Be Done

### 1. Replace ALL Hardcoded Permission Checks

Search for and replace these patterns throughout the codebase:
- `if (user.role === 'owner')` 
- `if (tenant.isOwner)`
- `if (isManager)`
- `{#if currentUserRole === 'owner'}`

Replace with:
```svelte
<PermissionGate action="appropriate_permission_flag">
  <!-- Protected content -->
</PermissionGate>
```

### 2. Components That Need Permission Integration

Priority components that likely have permission logic:

#### Task Management (`/src/lib/components/task/`)
- `TaskCard.svelte` - Edit/delete buttons
- `TaskDetail.svelte` - Assignment, status changes
- `TaskList.svelte` - Bulk operations
- `TaskCreationModal.svelte` - Creation permission

#### Client Management (`/src/lib/components/client/`)
- `ClientCard.svelte` - Edit/delete buttons
- `ClientDetail.svelte` - Full CRUD operations
- `ClientSelector.svelte` - View permissions

#### Financial Components (`/src/lib/components/invoice/` and `/src/routes/(app)/money/`)
- Invoice creation/editing
- Payment recording
- Financial reports viewing

#### Settings Pages (`/src/routes/(app)/settings/`)
- `billing/+page.svelte` - Billing management
- `storage/+page.svelte` - Storage management
- `preferences/+page.svelte` - System preferences

### 3. Missing UI Features to Build

#### A. Audit Trail Viewer (`/src/routes/(app)/settings/permissions/audit/+page.svelte`)
```svelte
<!-- Should display: -->
- List of all permission changes
- Filter by date, user, action
- Search functionality  
- Export capability
- Read from: /featureFlagAudit/{tenantId}/logs/
```

#### B. User Permission Overrides (`/src/routes/(app)/settings/permissions/users/+page.svelte`)
```svelte
<!-- Should allow: -->
- View all users and their effective permissions
- Set user-specific permission overrides
- Bulk operations
- Permission inheritance visualization
```

#### C. Permission Templates (`/src/routes/(app)/settings/permissions/templates/+page.svelte`)
```svelte
<!-- Should provide: -->
- Pre-defined permission sets
- Custom template creation
- One-click application
- Import/export templates
```

### 4. Voice Command Integration

Add to voice command system at `/src/lib/stores/voice.svelte.ts`:
```typescript
// Commands to add:
"show my permissions" -> Navigate to permission summary
"what can I do" -> List available actions
"enable [feature name]" -> Toggle feature (if authorized)
"disable [feature name]" -> Toggle feature (if authorized)
```

### 5. Permission Flags to Use

Reference `/src/lib/permissions/defaults.ts` for the complete list. Key patterns:
- `task_management_*` - Task operations
- `user_management_*` - User and client management
- `financial_*` - Financial operations
- `system_settings_*` - System configuration
- `client_portal_*` - Client-specific features
- `experimental_*` - Beta features

### 6. Testing Checklist

Each updated component should:
- [ ] Hide unauthorized UI elements
- [ ] Show helpful fallback messages
- [ ] Work offline (cached permissions)
- [ ] Update immediately when permissions change
- [ ] Handle loading states gracefully

## Technical Guidelines

### Component Pattern:
```svelte
<script lang="ts">
  import PermissionGate from '$lib/components/permissions/PermissionGate.svelte';
  
  // For programmatic checks:
  import { usePermission } from '$lib/permissions/context';
  const canEdit = usePermission('feature_flag_name');
</script>

<!-- Simple gate -->
<PermissionGate action="task_management_create_task">
  <button>Create Task</button>
</PermissionGate>

<!-- With fallback -->
<PermissionGate action="financial_view_invoices_all">
  <InvoiceList />
  {#snippet fallback()}
    <p>You don't have permission to view invoices.</p>
  {/snippet}
</PermissionGate>

<!-- With context -->
<PermissionGate 
  action="task_management_edit_task" 
  context={{ taskId: task.id, assignedTo: task.assignedTo }}
>
  <EditButton />
</PermissionGate>
```

### Store Pattern:
```typescript
// Don't add permissions to individual stores
// Use the central permission system instead
const flags = useFeatureFlags();
const canCreate = flags.can('user_management_create_client');
```

## Reference Implementation

For examples of proper implementation, check:
1. `/src/lib/components/client/NewClientForm.svelte` - Modal with permission gate
2. `/src/routes/(app)/settings/team/+page.svelte` - Multiple permission checks
3. `/src/lib/components/permissions/PermissionGate.svelte` - The gate component itself

## Success Criteria

1. **No hardcoded role checks** remain in the codebase
2. **All CRUD operations** are protected by appropriate permission flags
3. **UI gracefully handles** permission denials with helpful messages
4. **Audit trail** captures all permission-related actions
5. **Documentation** is updated with all new permission flags used

## Questions to Consider

1. Should certain permissions be hierarchical? (e.g., edit implies view)
2. Should we add time-based permissions? (temporary access)
3. Do we need permission groups/bundles?
4. Should permissions affect API endpoints as well?

## Files to Reference from Previous Implementation

Key files from the initial implementation:
- Permission types: `/src/lib/permissions/types.ts`
- Core logic: `/src/lib/permissions/index.ts`
- Store implementation: `/src/lib/stores/featureFlags.svelte.ts`
- Firebase rules: `/firestore.rules`
- Documentation: `/docs/PERMISSIONS.md`

## Note About Previous Chat

The previous chat (reference if available) contains:
- Initial system design decisions
- Firebase security rule implementation
- Migration from old permission system
- Examples of component updates

Please maintain consistency with the established patterns and architecture.
