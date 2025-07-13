# Permission System Documentation

## Overview

Vahst V5 uses a feature-flag based permission system that provides runtime control over feature access without requiring deployments. This system replaces the previous hardcoded role-based permissions with a flexible, configurable approach.

## Architecture

### Core Components

1. **Feature Flags** - Boolean toggles that control access to specific features
2. **Roles** - Predefined user types (owner, manager, team_member, client)
3. **Permission Manager** - Evaluates permissions based on flags and context
4. **Permission Gates** - UI components that conditionally render based on permissions

### Data Flow

```
User → Feature Flag Store → Permission Manager → Permission Gate → UI
         ↓                      ↓
    Firebase ←──────────── Audit Trail
```

## Key Features

- **Runtime Control**: Change permissions without code deployments
- **Multi-tenant Support**: Different permissions per tenant
- **Offline Support**: Cached permissions work without internet
- **Audit Trail**: All permission changes are logged
- **Context-Aware**: Permissions can consider context (e.g., task ownership)

## Migration from Old System

The previous system used hardcoded role checks:
```typescript
// OLD WAY
if (user.role === 'owner' || user.role === 'manager') {
  // Show feature
}
```

The new system uses feature flags:
```svelte
<!-- NEW WAY -->
<PermissionGate action="task_management_create_task">
  <button>Create Task</button>
</PermissionGate>
```

## Usage Guide

### In Svelte Components

#### Using PermissionGate Component
```svelte
<script>
  import PermissionGate from '$lib/components/permissions/PermissionGate.svelte';
</script>

<!-- Basic usage -->
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
  <button>Edit Task</button>
</PermissionGate>
```

#### Using Permission Hooks
```typescript
import { usePermission } from '$lib/permissions/context';

// In component
const canCreateTask = usePermission('task_management_create_task');

if (canCreateTask) {
  // Show create button
}
```

### Available Permission Flags

#### Task Management
- `task_management_create_task` - Create new tasks
- `task_management_assign_task` - Assign tasks to team members
- `task_management_edit_task` - Edit existing tasks
- `task_management_delete_task` - Delete tasks
- `task_management_view_all_tasks` - View all tasks in the system
- `task_management_view_team_tasks` - View team's tasks
- `task_management_view_assigned_tasks` - View only assigned tasks
- `task_management_complete_own_tasks` - Complete own tasks

#### User Management
- `user_management_invite_member` - Invite new team members
- `user_management_remove_member` - Remove team members
- `user_management_approve_member` - Approve pending invitations
- `user_management_change_roles` - Change user roles
- `user_management_create_client` - Create new clients
- `user_management_edit_client` - Edit client information
- `user_management_delete_client` - Delete clients
- `user_management_manage_team` - Full team management

#### Financial
- `financial_view_invoices_all` - View all invoices
- `financial_view_invoices_team` - View team invoices
- `financial_create_invoices` - Create new invoices
- `financial_edit_invoices` - Edit existing invoices
- `financial_manage_billing` - Manage billing settings
- `financial_export_data` - Export financial data

#### Reporting
- `reporting_view_all_reports` - View all reports
- `reporting_view_team_reports` - View team reports
- `reporting_view_own_reports` - View personal reports
- `reporting_export_data` - Export report data
- `reporting_create_custom_reports` - Create custom reports

#### System Settings
- `system_settings_manage_tenant` - Manage tenant settings
- `system_settings_manage_features` - Toggle feature flags
- `system_settings_manage_integrations` - Manage integrations
- `system_settings_view_settings` - View settings

#### Client Portal
- `client_portal_view_projects` - View projects
- `client_portal_submit_review` - Submit reviews
- `client_portal_view_invoices` - View invoices
- `client_portal_download_files` - Download files
- `client_portal_send_messages` - Send messages
- `client_portal_view_timeline` - View project timeline

#### Experimental
- `experimental_ai_task_suggestions` - AI-powered suggestions
- `experimental_voice_commands` - Voice control interface
- `experimental_advanced_analytics` - Advanced analytics

## Managing Permissions

### Via UI
1. Navigate to Settings → Permissions
2. Toggle features on/off for all users
3. Changes take effect immediately

### Via Code
```typescript
import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';

const flags = useFeatureFlags();

// Toggle a flag
await flags.toggleFlag('experimental_voice_commands', true);

// Check a permission
const canCreate = flags.can('task_management_create_task');
```

## Default Permissions by Role

### Owner
- Full system access
- All features enabled by default
- Can manage feature flags

### Manager
- Team and task management
- Client management
- Limited financial access
- Cannot change system settings

### Team Member
- Basic task operations
- View assigned work
- Limited reporting
- No administrative access

### Client
- Portal access only
- View their projects
- Submit feedback
- Download deliverables

## Context-Aware Permissions

Some permissions consider context:

```typescript
// Task ownership check
can('task_management_edit_task', { 
  taskId: 'abc123',
  assignedTo: ['user123'] 
});

// Team-based access
can('reporting_view_team_reports', { 
  teamId: 'team456' 
});
```

## Security Considerations

1. **Server-Side Validation**: Always validate permissions server-side
2. **Audit Trail**: All permission changes are logged
3. **Tenant Isolation**: Permissions are per-tenant
4. **No Client Trust**: Never trust client-side permission checks alone

## Troubleshooting

### Permission Denied Errors
1. Check if user has the required role
2. Verify feature flag is enabled
3. Check for user-specific overrides
4. Ensure context is correct

### Performance Issues
1. Permissions are cached for 5 minutes
2. Use batch checks for multiple permissions
3. Offline cache expires after 24 hours

### Context Not Found Error
Ensure permission context is initialized:
```typescript
// In root layout
onMount(() => {
  if (auth.isAuthenticated && auth.tenant) {
    setPermissionContext();
  }
});
```

## Migration Checklist

When updating components to use the new system:

- [ ] Replace role checks with PermissionGate
- [ ] Update button visibility logic
- [ ] Add fallback UI for denied access
- [ ] Test with different roles
- [ ] Verify offline functionality
- [ ] Check context-aware permissions

## Best Practices

1. **Use Semantic Flag Names**: Be descriptive with flag naming
2. **Group Related Permissions**: Use consistent prefixes
3. **Provide Fallbacks**: Always show why access is denied
4. **Test Offline**: Ensure features work without internet
5. **Document Changes**: Keep track of permission changes
6. **Regular Audits**: Review permission settings periodically

## Future Enhancements

- Permission inheritance and groups
- Time-based permissions
- IP-based restrictions
- Custom permission rules
- API rate limiting by permission
- Permission delegation
