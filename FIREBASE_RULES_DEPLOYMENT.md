# Firebase Security Rules Update Guide

## Overview

This guide will help you update your Firebase Firestore security rules to include the new permission system.

## Steps to Deploy

### 1. Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Replace the entire contents with the rules from `firestore.rules`
5. Click **Publish**

### 2. Using Firebase CLI (Recommended)

If you have Firebase CLI installed:

```bash
# From your project root
firebase deploy --only firestore:rules
```

If you don't have Firebase CLI:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize (if not already done)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

## What's New in These Rules

### Permission System Rules

1. **Feature Flags Collection** (`/tenantFeatureFlags/{tenantId}`)
   - Read: Any authenticated user in the tenant
   - Write: Only owners and managers
   - Delete: Only owners

2. **Audit Logs** (`/featureFlagAudit/{tenantId}/logs/{logId}`)
   - Read: Only owners (for compliance)
   - Create: Any tenant member (with validation)
   - Update/Delete: Nobody (immutable logs)

3. **User Overrides** (in `/userTenants/{userId}`)
   - Extended existing rules to allow managers to set user-specific feature flags

### Security Features

- **Tenant Isolation**: All permission data is scoped to tenants
- **Role Validation**: Only appropriate roles can modify permissions
- **Audit Trail**: Immutable logs for compliance
- **Data Validation**: Ensures proper data structure for feature flags

## Testing the Rules

After deploying, test the rules:

### 1. Test as Owner
```javascript
// Should succeed
await setDoc(doc(db, 'tenantFeatureFlags', tenantId), {
  flags: {
    'experimental_feature': {
      enabled: true,
      targetedRoles: ['owner', 'manager'],
      enabledAt: Timestamp.now(),
      enabledBy: userId
    }
  },
  defaultsForRoles: {
    owner: ['feature1', 'feature2'],
    manager: ['feature1'],
    team_member: [],
    client: []
  }
});
```

### 2. Test as Team Member
```javascript
// Should succeed - reading flags
const flags = await getDoc(doc(db, 'tenantFeatureFlags', tenantId));

// Should fail - writing flags
await setDoc(doc(db, 'tenantFeatureFlags', tenantId), {...}); // ❌ Permission denied
```

### 3. Test Audit Logs
```javascript
// Should succeed - creating audit log
await addDoc(collection(db, 'featureFlagAudit', tenantId, 'logs'), {
  flagKey: 'test_feature',
  action: 'enabled',
  performedBy: auth.currentUser.uid,
  performedAt: serverTimestamp(),
  previousState: false,
  newState: true,
  context: {}
});

// Should fail - updating audit log
await updateDoc(doc(db, 'featureFlagAudit', tenantId, 'logs', logId), {...}); // ❌ Permission denied
```

## Rollback Plan

If you need to rollback:

1. Keep a backup of your current rules before updating
2. In Firebase Console, you can view rule history and revert
3. Or redeploy the previous rules file

## Common Issues

### "Missing or insufficient permissions"

**Possible causes:**
- User is not authenticated
- User doesn't belong to the tenant
- User doesn't have the required role
- Data structure doesn't match validation rules

**Debug steps:**
1. Check authentication state
2. Verify user's tenant membership in `/userTenants/{userId}`
3. Confirm user's role in the tenant
4. Validate data structure matches rules

### Rules Take Time to Propagate

- Changes can take up to 60 seconds to fully propagate
- Clear browser cache if testing in web app
- Use Firebase Emulator for instant testing during development

## Security Best Practices

1. **Never trust client-side permission checks alone**
   - Always validate on the server/rules level
   - Client-side checks are for UX only

2. **Regular audits**
   - Review audit logs monthly
   - Check for unusual permission changes
   - Monitor failed permission attempts

3. **Principle of least privilege**
   - Start with minimal permissions
   - Add features as needed
   - Document why each permission exists

## Next Steps

1. Deploy the rules
2. Test with different user roles
3. Monitor the audit logs
4. Adjust permissions as needed

## Support

If you encounter issues:
1. Check Firebase Console for rule validation errors
2. Use Firebase Emulator for local testing
3. Review audit logs for permission denials
4. Check the browser console for detailed error messages
