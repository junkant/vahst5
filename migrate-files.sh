#!/bin/bash
# Migration script for updating remaining files

# Files to update
FILES=(
  "/Users/miran/Sites/v5/src/lib/components/task/TaskDetail.svelte"
  "/Users/miran/Sites/v5/src/lib/components/task/TaskList.svelte"
  "/Users/miran/Sites/v5/src/lib/components/task/PhotoUpload.svelte"
  "/Users/miran/Sites/v5/src/lib/components/task/StatusTimeline.svelte"
  "/Users/miran/Sites/v5/src/lib/components/client/ClientTasks.svelte"
  "/Users/miran/Sites/v5/src/routes/(app)/clients/[id]/tasks/+page.svelte"
  "/Users/miran/Sites/v5/src/routes/(app)/clients/[id]/tasks/[taskId]/+page.svelte"
  "/Users/miran/Sites/v5/src/routes/(app)/clients/[id]/tasks/new/+page.svelte"
)

# Replacements to make
echo "Updating imports and references in all files..."

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file"
    
    # Update imports
    sed -i '' 's|$lib/types/job|$lib/types/task|g' "$file"
    sed -i '' 's|$lib/stores/job\.svelte|$lib/stores/task.svelte|g' "$file"
    sed -i '' 's|$lib/components/job/|$lib/components/task/|g' "$file"
    
    # Update type references
    sed -i '' 's|type { Job|type { Task|g' "$file"
    sed -i '' 's|Job\[\|Task[|g' "$file"
    sed -i '' 's|: Job|: Task|g' "$file"
    sed -i '' 's|<Job>|<Task>|g' "$file"
    sed -i '' 's|JobStatus|TaskStatus|g' "$file"
    sed -i '' 's|JobNote|TaskNote|g' "$file"
    sed -i '' 's|JobPhoto|TaskPhoto|g' "$file"
    
    # Update store references
    sed -i '' 's|useJobStore|useJobStore|g' "$file"  # Keep for now as exported name
    sed -i '' 's|jobStore\.|taskStore.|g' "$file"
    
    # Update variable names
    sed -i '' 's|job:|task:|g' "$file"
    sed -i '' 's|job\.|task.|g' "$file"
    sed -i '' 's|{job|{task|g' "$file"
    sed -i '' 's| job | task |g' "$file"
    sed -i '' 's|Job |Task |g' "$file"
    sed -i '' 's|job}|task}|g' "$file"
    sed -i '' 's|jobId|taskId|g' "$file"
    sed -i '' 's|jobNumber|taskNumber|g' "$file"
    
    # Update CSS classes
    sed -i '' 's|job-detail|task-detail|g' "$file"
    sed -i '' 's|job-card|task-card|g' "$file"
    sed -i '' 's|job-list|task-list|g' "$file"
    
    # Update routes
    sed -i '' 's|/jobs|/tasks|g' "$file"
    sed -i '' 's|/job/|/task/|g' "$file"
  fi
done

echo "Migration complete!"