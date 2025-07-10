# Firebase Indexes Required for VAHST

## Overview
The following Firebase Firestore indexes need to be created for the application to function properly. These indexes optimize query performance and are required for certain complex queries.

## Required Indexes

### 1. Tasks Collection Indexes

#### Technician Today Tasks Index
**Collection**: `tasks`  
**Fields**:
- `assignedTo` (Array) - Ascending
- `scheduledStart` - Ascending
- `__name__` - Ascending

**Purpose**: Used for querying tasks assigned to specific technicians for today's schedule.

#### Client Tasks Index
**Collection**: `tasks`  
**Fields**:
- `clientId` - Ascending
- `scheduledStart` - Descending
- `__name__` - Descending

**Purpose**: Used for querying all tasks for a specific client, ordered by scheduled date.

**Direct Link**: Click the link in your browser console error to create this index automatically.

### 2. Jobs Collection Indexes (Legacy - being migrated to tasks)

#### Client Jobs Index
**Collection**: `jobs`  
**Fields**:
- `clientId` - Ascending
- `scheduledDate` - Descending
- `__name__` - Descending

**Purpose**: Used for querying all jobs for a specific client, ordered by scheduled date.

## How to Create These Indexes

### Option 1: Using the Firebase Console Links
When you encounter an index error in the browser console, Firebase provides a direct link to create the index. Click on the link in the error message to automatically create the index with the correct configuration.

### Option 2: Manual Creation
1. Go to the [Firebase Console](https://console.firebase.google.com)
2. Select your project (vahst5)
3. Navigate to Firestore Database
4. Click on the "Indexes" tab
5. Click "Create Index"
6. Select "Collection ID" and enter the collection name (e.g., "tasks")
7. Add the fields in the order specified above
8. Select the sort order (Ascending/Descending) for each field
9. Click "Create"

### Option 3: Using Firebase CLI
Create a `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "assignedTo", "arrayConfig": "CONTAINS" },
        { "fieldPath": "scheduledStart", "order": "ASCENDING" },
        { "fieldPath": "__name__", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "scheduledStart", "order": "DESCENDING" },
        { "fieldPath": "__name__", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "jobs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "scheduledDate", "order": "DESCENDING" },
        { "fieldPath": "__name__", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Then deploy using:
```bash
firebase deploy --only firestore:indexes
```

## Index Building Time
- Indexes typically take 2-10 minutes to build
- Larger collections may take longer
- You'll receive an email when the index is ready
- The Firebase Console shows the index status

## Troubleshooting

### "The query requires an index" Error
This error means you're trying to run a query that needs an index that doesn't exist yet. Follow the link in the error message to create it.

### Index Creation Failed
- Check that you have the correct permissions
- Ensure field names match exactly (case-sensitive)
- Verify the collection name is correct

### Performance Issues
If queries are still slow after creating indexes:
- Check the index is marked as "Enabled" in the console
- Consider adding additional indexes for frequently used query patterns
- Review your query to ensure it's using the indexed fields efficiently

## Best Practices
1. Always create indexes for complex queries during development
2. Monitor the Firebase Console for index recommendations
3. Remove unused indexes to save on storage costs
4. Test queries with realistic data volumes to ensure indexes are effective

## Notes for this Project
- The `tasks` collection is the new primary collection (replacing `jobs`)
- All new features should use the `tasks` collection
- The `jobs` indexes are maintained for backward compatibility during migration
- Once migration is complete, the `jobs` indexes can be removed