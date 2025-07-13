# Feature Flag Permission System

This is a comprehensive feature-flag based role permissions system for the Vahst V5 application.

## Overview

The permission system provides:
- Runtime feature control without deployments
- Role-based access control (RBAC)
- User-specific permission overrides
- Multi-tenant isolation
- Offline support with caching
- Audit trail for compliance

## Architecture

```
┌─────────────────────┐
│   PermissionGate    │ ← UI Components
│    Component        │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Permission Context │ ← Component Integration
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Feature Flag Store  │ ← Reactive State Management
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Permission Manager  │ ← Core Evaluation Engine
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│     Firebase        │ ← Persistent Storage
└─────────────────────┘
```

## Roles

1. **Owner**: Full system access including billing and tenant settings
2. **Manager**: Team and task management with limited admin features
3. **Team Member**: Basic task execution and collaboration
4. **Client**: Portal-only access for external users

## Usage

### Basic Permission Check

```svelte
<script>
  import PermissionGate from '$lib/components/permissions/PermissionGate.svelte';
</script>

<PermissionGate action="task_management_create_task">
  <button>Create Task</button>
</PermissionGate>
```

### With Context

```svelte
<PermissionGate 
  action="task_management_complete_task" 
  context={{ taskOwnerId: task.assignedTo }}
>
  <button>Complete Task</button>
</PermissionGate>
```

### Feature Flag Check

```svelte
<PermissionGate flag="experimental_ai_task_suggestions">
  <AITaskSuggestions />
</PermissionGate>
```

### With Fallback

```svelte
<PermissionGate action="financial_view_invoices_all">
  <InvoiceList />
  {#snippet fallback()}
    <p>You don't have permission to view invoices.</p>
  {/snippet}
</PermissionGate>
```

### In TypeScript

```typescript
import { usePermission } from '$lib/permissions/context';

// In component
const canCreateTask = usePermission('task_management_create_task');

if (canCreateTask) {
  // Show create button
}
```

## Feature Flag Naming Convention

Flags follow the pattern: `[category]_[action]_[target]_[modifier]`

Examples:
- `task_management_create_task`
- `user_management_invite_member`
- `financial_view_invoices_all`
- `client_portal_submit_review`

Categories:
- `task_management`
- `user_management`
- `financial`
- `reporting`
- `client_portal`
- `system_settings`
- `experimental`

## Setting Up

### 1. Initialize in Layout

```svelte
<!-- routes/(app)/+layout.svelte -->
<script>
  import { setPermissionContext } from '$lib/permissions/context';
  
  onMount(() => {
    setPermissionContext();
  });
</script>
```

### 2. Configure Firebase

Add the security rules from `firestore.rules` to your Firebase project.

### 3. Create Initial Flags

When creating a new tenant:

```typescript
import { createInitialFeatureFlags } from '$lib/permissions/defaults';

const flags = createInitialFeatureFlags(tenantId, userId);
await setDoc(doc(db, 'tenantFeatureFlags', tenantId), flags);
```

## Managing Feature Flags

### Toggle a Flag

```typescript
import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';

const flags = useFeatureFlags();
await flags.toggleFlag('experimental_voice_commands', true);
```

### Check Permissions

```typescript
const canManageFeatures = flags.can('system_settings_manage_features');
if (canManageFeatures) {
  // Show feature management UI
}
```

## Offline Support

The system automatically:
- Caches permission evaluations in memory (5-minute TTL)
- Stores flags in localStorage (24-hour TTL)
- Works offline with last known state
- Syncs when connection restored

## Performance

- Permission checks are cached for 5 minutes
- Batch permission checks with `canMultiple()`
- Local storage reduces Firebase reads
- Efficient flag evaluation hierarchy

## Security

- All changes require authentication
- Role-based write access
- Audit trail for compliance
- Tenant isolation enforced
- No cross-tenant data leakage

## Development

### Adding New Flags

1. Define in `defaults.ts`:
```typescript
'new_feature_action_target': [
  'role1', 'role2' // Default roles
]
```

2. Use in components:
```svelte
<PermissionGate action="new_feature_action_target">
  <NewFeature />
</PermissionGate>
```

### Testing Permissions

```typescript
// Mock permission context
const mockContext = {
  can: (action) => true,
  isEnabled: (flag) => true,
  flags: new Map([['test_flag', true]])
};

setContext(PERMISSION_CONTEXT_KEY, mockContext);
```

## Troubleshooting

### Permissions Not Updating
1. Check Firebase listeners are connected
2. Verify tenant context is set
3. Clear cache: `flags.clearCache()`
4. Check browser console for errors

### Offline Issues
1. Verify localStorage is enabled
2. Check flag age (24-hour expiry)
3. Force refresh: delete localStorage keys

### Performance Issues
1. Use `canMultiple()` for batch checks
2. Increase cache timeout if needed
3. Reduce Firebase listeners

## Future Enhancements

- [ ] Scheduled flag changes
- [ ] A/B testing support
- [ ] Percentage rollouts
- [ ] Flag dependencies
- [ ] Custom permission rules
- [ ] GraphQL integration
