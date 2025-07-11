#!/bin/bash
# Fix SvelteKit sync issues

echo "🔧 Fixing SvelteKit sync issues..."

# Remove .svelte-kit directory
echo "Removing .svelte-kit directory..."
rm -rf .svelte-kit

# Run npm prepare to regenerate .svelte-kit
echo "Running npm prepare..."
npm run prepare

echo "✅ Done! You can now run 'npm run dev' again"
